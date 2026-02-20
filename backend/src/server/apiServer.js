import http from 'http';
import { executeSqlServerQuery, closeAllSqlServerPools } from '../db/sqlserver.js';

const PORT = Number(process.env.API_PORT || 3000);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) {
      throw new Error('Payload demasiado grande');
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('JSON inválido');
  }
}

async function createTenantWithProvisionJob(input) {
  const slug = normalizeSlug(input.slug);
  const nombreComercial = String(input.nombre_comercial || '').trim();
  const nifCif = String(input.nif_cif || '').trim();
  const emailContacto = String(input.email_contacto || '').trim();

  if (!slug || !nombreComercial || !nifCif || !emailContacto) {
    throw new Error('Campos requeridos: slug, nombre_comercial, nif_cif, email_contacto');
  }

  const rows = await executeSqlServerQuery(
    'master',
    `
      DECLARE @inserted TABLE (id BIGINT, slug VARCHAR(80), status VARCHAR(20));

      INSERT INTO tenants (slug, nombre_comercial, nif_cif, email_contacto, status)
      OUTPUT INSERTED.id, INSERTED.slug, INSERTED.status INTO @inserted(id, slug, status)
      VALUES (@slug, @nombreComercial, @nifCif, @emailContacto, 'provisioning');

      INSERT INTO provisioning_jobs (tenant_id, action, status)
      SELECT id, 'provision', 'queued'
      FROM @inserted;

      SELECT id, slug, status FROM @inserted;
    `,
    {
      slug,
      nombreComercial,
      nifCif,
      emailContacto
    }
  );

  return rows[0];
}

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    try {
      await executeSqlServerQuery('master', 'SELECT TOP (1) 1 AS ok;');
      sendJson(res, 200, { status: 'ok' });
      return;
    } catch (error) {
      sendJson(res, 503, { status: 'db_error', message: error.message });
      return;
    }
  }

  if (req.method === 'POST' && req.url === '/tenants') {
    try {
      const body = await readJsonBody(req);
      const tenant = await createTenantWithProvisionJob(body);
      sendJson(res, 201, {
        message: 'Tenant creado y job de provisioning en cola',
        tenant
      });
      return;
    } catch (error) {
      const message = String(error.message || 'Error desconocido');
      const isUniqueViolation = message.includes('UNIQUE') || message.includes('uq_tenants');
      const status = isUniqueViolation ? 409 : 400;
      sendJson(res, status, { error: message });
      return;
    }
  }

  sendJson(res, 404, { error: 'Ruta no encontrada' });
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    sendJson(res, 500, { error: error.message || 'Error interno' });
  });
});

server.listen(PORT, () => {
  console.log(`[api] listening on http://127.0.0.1:${PORT}`);
});

process.on('SIGINT', async () => {
  server.close(async () => {
    await closeAllSqlServerPools();
    process.exit(0);
  });
});
