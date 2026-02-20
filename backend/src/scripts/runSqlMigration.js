import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeSqlServerQuery, closeAllSqlServerPools } from '../db/sqlserver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scope = process.argv[2] || 'master';

if (!['master', 'tenant'].includes(scope)) {
  console.error('Uso: node src/scripts/runSqlMigration.js <master|tenant>');
  process.exit(1);
}

const migrationDir = path.resolve(__dirname, `../../migrations/${scope}`);

async function run() {
  const files = (await fs.readdir(migrationDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (!files.length) {
    console.log(`[${scope}] No hay migraciones`);
    return;
  }

  for (const file of files) {
    const sqlText = await fs.readFile(path.join(migrationDir, file), 'utf8');
    console.log(`[${scope}] Ejecutando ${file}`);
    await executeSqlServerQuery(scope, sqlText);
  }

  console.log(`[${scope}] Migraciones completadas`);
}

run()
  .catch((error) => {
    console.error('Error de migración:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeAllSqlServerPools();
  });