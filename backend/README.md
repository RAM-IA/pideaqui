# Backend multi-tenant SQL Server (MVP)

Este módulo está ajustado a tu escenario:

- Base de datos física en tu equipo con SQL Server.
- Conexión local para pruebas (hoy).
- Arquitectura lista para publicar la API por Cloudflare Tunnel (después).
- Sin MongoDB.

## 1) Preparación

```bash
cd backend
npm install
cp .env.example .env
```

## 2) Configuración de conexión (SQL Server)

Archivo de entorno: `.env`

- Master: `MASTER_DB_*`
- Tenant default: `TENANT_DB_*`
- Esquemas: `MASTER_DB_SCHEMA`, `TENANT_DB_SCHEMA`

Archivo de conexión principal:

- `src/config/database.js`

Funciones:

- `getDataConfig({ scope: 'master' })`
- `getDataConfig({ scope: 'tenant' })`
- `resolveTenantConfigFromMaster({ tenantSlug })`

## 3) Configuración de “colección” equivalente en SQL Server

En SQL Server no hay colecciones; el equivalente es `esquema.tabla`.

Archivo:

- `src/config/dataTargets.js`

Ejemplos:

- `getDataTarget('master', 'tenants')` -> `dbo.tenants`
- `getDataTarget('tenant', 'pedidos')` -> `dbo.pedidos`

## 4) Migraciones

```bash
npm run migrate:master
npm run migrate:tenant
```

Archivos:

- `migrations/master/001_init.sql`
- `migrations/tenant/001_init.sql`

## 5) Worker de provisioning

```bash
npm run worker:provision
```

El worker:

- toma jobs `queued` de `provisioning_jobs`
- cambia estado a `running`
- actualiza metadatos del tenant en `tenants` y `tenant_datastores`
- deja `done` o `failed`

## 6) Cloudflare (fase siguiente)

Patrón recomendado:

- Navegador -> Cloudflare -> API (en tu equipo vía Tunnel) -> SQL Server local

Importante:

- no publicar el puerto de SQL Server directamente a internet
- publicar solo la API
- proteger acceso con Cloudflare Access/Zero Trust
