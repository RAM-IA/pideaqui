# Plan de implementación: SQL Server local + Cloudflare

## 1) Decisión de arquitectura

Para tu caso, la mejor estructura es:

- `master_db` en SQL Server (control central de tiendas).
- Una base por tienda: `tenant_<slug>` en el mismo SQL Server local.
- API en tu servidor/app que resuelve tenant y conecta a su base.

## 2) Qué guarda `master_db`

- `tenants`: identidad y estado de la tienda.
- `tenant_datastores`: dónde está su DB (`db_name`, `db_host`, `db_port`, `db_user`, `secret_ref`).
- `provisioning_jobs`: cola de aprovisionamiento.

## 3) Flujo de alta de tienda

1. API inserta tienda en `tenants` con estado `provisioning`.
2. API crea job `queued` en `provisioning_jobs`.
3. Worker toma job, genera metadatos de conexión tenant.
4. Worker actualiza `tenant_datastores` y deja tenant `active`.

## 4) Conexión segura con Cloudflare

Patrón recomendado:

- Cliente -> Cloudflare -> API local (Tunnel) -> SQL Server local

Reglas:

- no abrir SQL Server a internet
- publicar solo la API
- usar Cloudflare Access/Zero Trust para proteger el endpoint

## 5) Operación por fases

### Fase A (ya habilitada en este repo)

- Configuración SQL Server (`backend/.env.example`).
- Migraciones SQL Server para master/tenant.
- Worker de provisioning MVP.
- Resolver de conexión tenant desde `master_db`.

### Fase B (siguiente)

- crear físicamente `tenant_<slug>` en SQL Server desde el worker
- ejecutar migraciones tenant en cada DB nueva
- guardar secretos en vault real

### Fase C (Cloudflare productivo)

- instalar `cloudflared`
- crear Tunnel para API local
- agregar Access Policy (MFA + identidad)
- monitoreo y auditoría de accesos
