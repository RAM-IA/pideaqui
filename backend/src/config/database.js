import dotenv from 'dotenv';

dotenv.config();

const parseBool = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const getEngine = () => process.env.DB_ENGINE || 'sqlserver';

export function getSqlServerConfig(scope = 'master', overrides = {}) {
  const prefix = scope === 'master' ? 'MASTER' : 'TENANT';

  return {
    server: overrides.server || overrides.host || process.env[`${prefix}_DB_HOST`],
    port: Number(overrides.port || process.env[`${prefix}_DB_PORT`] || 1433),
    database: overrides.database || process.env[`${prefix}_DB_NAME`],
    user: overrides.user || process.env[`${prefix}_DB_USER`],
    password: overrides.password || process.env[`${prefix}_DB_PASSWORD`],
    pool: {
      max: Number(process.env.DB_POOL_MAX || 10),
      min: 0,
      idleTimeoutMillis: 30000
    },
    options: {
      encrypt: parseBool(overrides.encrypt ?? process.env[`${prefix}_DB_ENCRYPT`], false),
      trustServerCertificate: parseBool(
        overrides.trustServerCertificate ?? process.env[`${prefix}_DB_TRUST_CERT`],
        true
      ),
      enableArithAbort: true
    }
  };
}

export function getDataConfig({ scope = 'master', overrides = {} } = {}) {
  const resolvedEngine = getEngine();

  if (resolvedEngine !== 'sqlserver') {
    throw new Error(`Engine no soportado: ${resolvedEngine}. Usa DB_ENGINE=sqlserver`);
  }

  return {
    engine: 'sqlserver',
    ...getSqlServerConfig(scope, overrides)
  };
}

export async function resolveTenantConfigFromMaster({ tenantSlug, fallbackToEnv = true }) {
  if (!tenantSlug) {
    throw new Error('tenantSlug es requerido para resolver configuración tenant');
  }

  if (getEngine() !== 'sqlserver') {
    if (!fallbackToEnv) {
      throw new Error('Lookup dinámico solo implementado para master SQL Server en este MVP');
    }

    return getDataConfig({ scope: 'tenant' });
  }

  const { executeSqlServerQuery } = await import('../db/sqlserver.js');

  try {
    const query = `
      SELECT
        t.slug,
        td.db_name,
        td.db_host,
        td.db_port,
        td.db_user
      FROM tenants t
      JOIN tenant_datastores td ON td.tenant_id = t.id
      WHERE t.slug = @tenantSlug AND td.is_primary = 1
    `;

    const rows = await executeSqlServerQuery('master', query, { tenantSlug });

    if (!rows.length) {
      if (fallbackToEnv) {
        return getDataConfig({ scope: 'tenant' });
      }

      throw new Error(`No existe datastore primario para tenant ${tenantSlug}`);
    }

    const row = rows[0];

    return getDataConfig({
      scope: 'tenant',
      overrides: {
        host: row.db_host,
        port: row.db_port,
        database: row.db_name,
        user: row.db_user,
        password: process.env.TENANT_DB_PASSWORD
      }
    });
  } catch (error) {
    if (fallbackToEnv) {
      return getDataConfig({ scope: 'tenant' });
    }

    throw error;
  }
}