/*
  Ejecutar en SSMS con una cuenta administradora del servidor.
  Requiere SQL Server Authentication habilitada (modo mixto).
*/

USE [master];
GO

DECLARE @LoginName SYSNAME = N'pideaqui_app';
DECLARE @LoginPassword NVARCHAR(128) = N'Pideaqui#2026!Cambiar';

IF NOT EXISTS (
  SELECT 1 FROM sys.sql_logins WHERE name = @LoginName
)
BEGIN
  DECLARE @CreateLoginSql NVARCHAR(MAX) =
    N'CREATE LOGIN ' + QUOTENAME(@LoginName) +
    N' WITH PASSWORD = ' + QUOTENAME(@LoginPassword, '''') +
    N', CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;';

  EXEC (@CreateLoginSql);
END;
GO

DECLARE @DbName SYSNAME;

DECLARE db_cursor CURSOR FAST_FORWARD FOR
SELECT name
FROM sys.databases
WHERE name IN (N'padb', N'master_db', N'tenant_demo');

OPEN db_cursor;
FETCH NEXT FROM db_cursor INTO @DbName;

WHILE @@FETCH_STATUS = 0
BEGIN
  DECLARE @Sql NVARCHAR(MAX) = N'
    USE ' + QUOTENAME(@DbName) + N';

    IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N''pideaqui_app'')
      CREATE USER [pideaqui_app] FOR LOGIN [pideaqui_app];

    ALTER ROLE [db_datareader] ADD MEMBER [pideaqui_app];
    ALTER ROLE [db_datawriter] ADD MEMBER [pideaqui_app];
    ALTER ROLE [db_ddladmin] ADD MEMBER [pideaqui_app];
  ';

  EXEC (@Sql);

  FETCH NEXT FROM db_cursor INTO @DbName;
END;

CLOSE db_cursor;
DEALLOCATE db_cursor;
GO

PRINT 'Login [pideaqui_app] y permisos base aplicados.';
