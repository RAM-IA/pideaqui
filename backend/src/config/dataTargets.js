import dotenv from 'dotenv';

dotenv.config();

const masterSchema = process.env.MASTER_DB_SCHEMA || 'dbo';
const tenantSchema = process.env.TENANT_DB_SCHEMA || 'dbo';

const tableMap = {
  master: {
    tenants: `${masterSchema}.tenants`,
    tenantDatastores: `${masterSchema}.tenant_datastores`,
    provisioningJobs: `${masterSchema}.provisioning_jobs`
  },
  tenant: {
    productos: `${tenantSchema}.productos`,
    clientes: `${tenantSchema}.clientes`,
    pedidos: `${tenantSchema}.pedidos`,
    pedidoItems: `${tenantSchema}.pedido_items`
  }
};

export function getDataTarget(scope = 'master', logicalName) {
  const scopeMap = tableMap[scope];

  if (!scopeMap) {
    throw new Error(`Scope no soportado: ${scope}`);
  }

  if (!logicalName) {
    return scopeMap;
  }

  if (!scopeMap[logicalName]) {
    throw new Error(`No existe mapeo para ${logicalName} en scope ${scope}`);
  }

  return scopeMap[logicalName];
}
