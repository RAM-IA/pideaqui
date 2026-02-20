import {
  executeSqlServerQuery,
  closeAllSqlServerPools
} from '../db/sqlserver.js';

const POLL_MS = Number(process.env.PROVISION_POLL_MS || 4000);
const CURRENT_SCHEMA_VERSION = 1;
const WORKER_ID = `worker-${process.pid}`;

async function pickJob() {
  const query = `
    ;WITH next_job AS (
      SELECT TOP (1) id
      FROM provisioning_jobs WITH (ROWLOCK, READPAST, UPDLOCK)
      WHERE status = 'queued' AND run_after <= SYSUTCDATETIME()
      ORDER BY id ASC
    )
    UPDATE j
    SET
      status = 'running',
      locked_at = SYSUTCDATETIME(),
      locked_by = @workerId,
      attempts = attempts + 1,
      updated_at = SYSUTCDATETIME()
    OUTPUT INSERTED.id, INSERTED.tenant_id, INSERTED.action
    FROM provisioning_jobs j
    INNER JOIN next_job n ON n.id = j.id;
  `;

  const rows = await executeSqlServerQuery('master', query, { workerId: WORKER_ID });
  return rows[0] || null;
}

async function completeJob(jobId) {
  await executeSqlServerQuery(
    'master',
    `
      UPDATE provisioning_jobs
      SET status = 'done', updated_at = SYSUTCDATETIME()
      WHERE id = @jobId;
    `,
    { jobId }
  );
}

async function failJob(jobId, message) {
  await executeSqlServerQuery(
    'master',
    `
      UPDATE provisioning_jobs
      SET status = 'failed', last_error = @message, updated_at = SYSUTCDATETIME()
      WHERE id = @jobId;
    `,
    { jobId, message }
  );
}

function makeTenantDbName(tenantSlug) {
  return `tenant_${tenantSlug.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`;
}

function makeTenantDbUser(tenantSlug) {
  return `u_${tenantSlug.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().slice(0, 24)}`;
}

async function executeProvisioning(job) {
  const tenantRows = await executeSqlServerQuery(
    'master',
    `
      SELECT TOP (1) id, slug, status
      FROM tenants
      WHERE id = @tenantId;
    `,
    { tenantId: job.tenant_id }
  );

  if (!tenantRows.length) {
    throw new Error(`Tenant ${job.tenant_id} no encontrado`);
  }

  const tenant = tenantRows[0];
  const dbName = makeTenantDbName(tenant.slug);
  const dbUser = makeTenantDbUser(tenant.slug);
  const secretRef = `vault://tenants/${tenant.slug}/db-password`;
  const host = process.env.TENANT_DB_HOST || '127.0.0.1';
  const port = Number(process.env.TENANT_DB_PORT || 1433);

  await executeSqlServerQuery(
    'master',
    `
      UPDATE tenants
      SET
        status = 'active',
        schema_version = @schemaVersion,
        updated_at = SYSUTCDATETIME()
      WHERE id = @tenantId;

      IF EXISTS (
        SELECT 1
        FROM tenant_datastores
        WHERE tenant_id = @tenantId AND engine = 'sqlserver' AND is_primary = 1
      )
      BEGIN
        UPDATE tenant_datastores
        SET
          db_name = @dbName,
          db_host = @dbHost,
          db_port = @dbPort,
          db_user = @dbUser,
          secret_ref = @secretRef,
          updated_at = SYSUTCDATETIME()
        WHERE tenant_id = @tenantId AND engine = 'sqlserver' AND is_primary = 1;
      END
      ELSE
      BEGIN
        INSERT INTO tenant_datastores (
          tenant_id, engine, db_name, db_host, db_port, db_user, secret_ref, is_primary, created_at, updated_at
        )
        VALUES (
          @tenantId, 'sqlserver', @dbName, @dbHost, @dbPort, @dbUser, @secretRef, 1, SYSUTCDATETIME(), SYSUTCDATETIME()
        );
      END;
    `,
    {
      tenantId: tenant.id,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      dbName,
      dbHost: host,
      dbPort: port,
      dbUser,
      secretRef
    }
  );
}

async function processJob(job) {
  if (job.action !== 'provision') {
    throw new Error(`Acción no soportada en MVP: ${job.action}`);
  }

  await executeProvisioning(job);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loop() {
  while (true) {
    const job = await pickJob();

    if (!job) {
      await sleep(POLL_MS);
      continue;
    }

    try {
      await processJob(job);
      await completeJob(job.id);
      console.log(`[worker] job ${job.id} completado`);
    } catch (error) {
      await failJob(job.id, error.message);
      console.error(`[worker] job ${job.id} falló: ${error.message}`);
    }
  }
}

loop().catch(async (error) => {
  console.error('[worker] error fatal:', error.message);
  await closeAllSqlServerPools();
  process.exit(1);
});

process.on('SIGINT', async () => {
  await closeAllSqlServerPools();
  process.exit(0);
});
