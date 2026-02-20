IF OBJECT_ID('dbo.tenants', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tenants (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    tenant_uuid UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    slug VARCHAR(80) NOT NULL,
    nombre_comercial VARCHAR(180) NOT NULL,
    nif_cif VARCHAR(30) NOT NULL,
    email_contacto VARCHAR(160) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'provisioning',
    schema_version INT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT uq_tenants_tenant_uuid UNIQUE (tenant_uuid),
    CONSTRAINT uq_tenants_slug UNIQUE (slug),
    CONSTRAINT uq_tenants_nif_cif UNIQUE (nif_cif),
    CONSTRAINT ck_tenants_status CHECK (status IN ('provisioning', 'active', 'suspended', 'failed', 'deleted'))
  );
END;

IF OBJECT_ID('dbo.provisioning_jobs', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.provisioning_jobs (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'queued',
    attempts INT NOT NULL DEFAULT 0,
    last_error NVARCHAR(MAX) NULL,
    run_after DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    locked_at DATETIME2 NULL,
    locked_by VARCHAR(120) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_jobs_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id),
    CONSTRAINT ck_jobs_status CHECK (status IN ('queued', 'running', 'done', 'failed'))
  );
END;

IF OBJECT_ID('dbo.tenant_datastores', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tenant_datastores (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    engine VARCHAR(20) NOT NULL DEFAULT 'sqlserver',
    db_name VARCHAR(120) NOT NULL,
    db_host VARCHAR(200) NOT NULL,
    db_port INT NOT NULL,
    db_user VARCHAR(120) NOT NULL,
    secret_ref VARCHAR(255) NOT NULL,
    is_primary BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_tenant_datastores_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id),
    CONSTRAINT ck_tenant_datastores_engine CHECK (engine IN ('sqlserver'))
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_tenants_status' AND object_id = OBJECT_ID('dbo.tenants'))
  CREATE INDEX idx_tenants_status ON dbo.tenants(status);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_jobs_status_run_after' AND object_id = OBJECT_ID('dbo.provisioning_jobs'))
  CREATE INDEX idx_jobs_status_run_after ON dbo.provisioning_jobs(status, run_after);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ux_tenant_datastores_primary' AND object_id = OBJECT_ID('dbo.tenant_datastores'))
  CREATE UNIQUE INDEX ux_tenant_datastores_primary ON dbo.tenant_datastores(tenant_id, engine, is_primary);
