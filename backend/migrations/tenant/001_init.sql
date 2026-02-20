IF OBJECT_ID('dbo.productos', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.productos (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nombre VARCHAR(180) NOT NULL,
    descripcion NVARCHAR(MAX) NULL,
    precio DECIMAL(10,2) NOT NULL,
    activo BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT ck_productos_precio CHECK (precio >= 0)
  );
END;

IF OBJECT_ID('dbo.clientes', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.clientes (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nombre VARCHAR(140) NOT NULL,
    telefono VARCHAR(30) NULL,
    email VARCHAR(160) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.pedidos', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.pedidos (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    cliente_id BIGINT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_pedidos_clientes FOREIGN KEY (cliente_id) REFERENCES dbo.clientes(id)
  );
END;

IF OBJECT_ID('dbo.pedido_items', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.pedido_items (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    pedido_id BIGINT NOT NULL,
    producto_id BIGINT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal AS (cantidad * precio_unitario),
    CONSTRAINT fk_items_pedidos FOREIGN KEY (pedido_id) REFERENCES dbo.pedidos(id) ON DELETE CASCADE,
    CONSTRAINT fk_items_productos FOREIGN KEY (producto_id) REFERENCES dbo.productos(id),
    CONSTRAINT ck_items_cantidad CHECK (cantidad > 0),
    CONSTRAINT ck_items_precio CHECK (precio_unitario >= 0)
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_pedidos_estado' AND object_id = OBJECT_ID('dbo.pedidos'))
  CREATE INDEX idx_pedidos_estado ON dbo.pedidos(estado);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_pedidos_created_at' AND object_id = OBJECT_ID('dbo.pedidos'))
  CREATE INDEX idx_pedidos_created_at ON dbo.pedidos(created_at DESC);
