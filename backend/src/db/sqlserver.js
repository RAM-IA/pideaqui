import sql from 'mssql';
import { getSqlServerConfig } from '../config/database.js';

const pools = new Map();

function makePoolKey(scope, config) {
  return `${scope}:${config.server}:${config.port}:${config.database}:${config.user}`;
}

function bindInputs(request, params = {}) {
  for (const [name, value] of Object.entries(params)) {
    request.input(name, value);
  }
}

export async function getSqlServerPool(scope = 'master', overrides = {}) {
  const config = getSqlServerConfig(scope, overrides);
  const key = makePoolKey(scope, config);

  if (!pools.has(key)) {
    const pool = new sql.ConnectionPool(config);
    const connectPromise = pool.connect();
    pools.set(key, connectPromise);
  }

  return pools.get(key);
}

export async function executeSqlServerQuery(scope, queryText, params = {}, overrides = {}) {
  const pool = await getSqlServerPool(scope, overrides);
  const request = pool.request();
  bindInputs(request, params);
  const result = await request.query(queryText);
  return result.recordset || [];
}

export async function closeAllSqlServerPools() {
  const closing = [];

  for (const poolPromise of pools.values()) {
    closing.push(
      poolPromise.then((pool) => {
        if (pool.connected) {
          return pool.close();
        }

        return null;
      })
    );
  }

  await Promise.all(closing);
  pools.clear();
}
