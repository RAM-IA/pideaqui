IF OBJECT_ID('dbo.tenants', 'U') IS NOT NULL
BEGIN
  IF COL_LENGTH('dbo.tenants', 'created_at') IS NULL
    ALTER TABLE dbo.tenants ADD created_at DATETIME2 NOT NULL CONSTRAINT df_tenants_created_at DEFAULT SYSUTCDATETIME();

  IF COL_LENGTH('dbo.tenants', 'updated_at') IS NULL
    ALTER TABLE dbo.tenants ADD updated_at DATETIME2 NOT NULL CONSTRAINT df_tenants_updated_at DEFAULT SYSUTCDATETIME();
END;

IF OBJECT_ID('dbo.provisioning_jobs', 'U') IS NOT NULL
BEGIN
  IF COL_LENGTH('dbo.provisioning_jobs', 'attempts') IS NULL
    ALTER TABLE dbo.provisioning_jobs ADD attempts INT NOT NULL CONSTRAINT df_jobs_attempts DEFAULT 0;

  IF COL_LENGTH('dbo.provisioning_jobs', 'last_error') IS NULL
    ALTER TABLE dbo.provisioning_jobs ADD last_error NVARCHAR(MAX) NULL;

  IF COL_LENGTH('dbo.provisioning_jobs', 'run_after') IS NULL
    ALTER TABLE dbo.provisioning_jobs ADD run_after DATETIME2 NOT NULL CONSTRAINT df_jobs_run_after DEFAULT SYSUTCDATETIME();

  IF COL_LENGTH('dbo.provisioning_jobs', 'locked_at') IS NULL
    ALTER TABLE dbo.provisioning_jobs ADD locked_at DATETIME2 NULL;

  IF COL_LENGTH('dbo.provisioning_jobs', 'locked_by') IS NULL
    ALTER TABLE dbo.provisioning_jobs ADD locked_by VARCHAR(120) NULL;

  IF COL_LENGTH('dbo.provisioning_jobs', 'created_at') IS NULL
    ALTER TABLE dbo.provisioning_jobs ADD created_at DATETIME2 NOT NULL CONSTRAINT df_jobs_created_at DEFAULT SYSUTCDATETIME();

  IF COL_LENGTH('dbo.provisioning_jobs', 'updated_at') IS NULL
    ALTER TABLE dbo.provisioning_jobs ADD updated_at DATETIME2 NOT NULL CONSTRAINT df_jobs_updated_at DEFAULT SYSUTCDATETIME();
END;

IF OBJECT_ID('dbo.tenant_datastores', 'U') IS NOT NULL
BEGIN
  IF COL_LENGTH('dbo.tenant_datastores', 'created_at') IS NULL
    ALTER TABLE dbo.tenant_datastores ADD created_at DATETIME2 NOT NULL CONSTRAINT df_tenant_datastores_created_at DEFAULT SYSUTCDATETIME();

  IF COL_LENGTH('dbo.tenant_datastores', 'updated_at') IS NULL
    ALTER TABLE dbo.tenant_datastores ADD updated_at DATETIME2 NOT NULL CONSTRAINT df_tenant_datastores_updated_at DEFAULT SYSUTCDATETIME();
END;
