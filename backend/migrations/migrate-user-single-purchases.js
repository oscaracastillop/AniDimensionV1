/**
 * Migración: Creación de tabla dbo.UserSinglePurchases y Stored Procedures para Auditoría Contable de Cartas Singles
 */
const sql = require('mssql');
const { getPool } = require('../config/db');

async function migrate() {
    try {
        console.log('[MIGRATION] Conectando a SQL Server para crear tabla de auditoría dbo.UserSinglePurchases...');
        const pool = await getPool();

        // 1. Crear tabla dbo.UserSinglePurchases si no existe
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserSinglePurchases')
            BEGIN
                CREATE TABLE dbo.UserSinglePurchases (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    UsuarioId INT NOT NULL,
                    CardCode VARCHAR(50) NOT NULL,
                    CardName NVARCHAR(150) NULL,
                    PriceUsd DECIMAL(10, 2) DEFAULT 0.00,
                    PriceStarships INT DEFAULT 0,
                    PaymentMethod VARCHAR(50) DEFAULT 'STARSHIPS',
                    FoilType VARCHAR(50) DEFAULT 'NORMAL',
                    Quantity INT DEFAULT 1,
                    StarshipsBalanceBefore INT NULL,
                    StarshipsBalanceAfter INT NULL,
                    PurchasedAt DATETIME DEFAULT GETDATE(),
                    CONSTRAINT FK_UserSinglePurchases_Usuarios FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuarios(Id) ON DELETE CASCADE
                );
                CREATE INDEX IX_UserSinglePurchases_UsuarioId ON dbo.UserSinglePurchases(UsuarioId);
                CREATE INDEX IX_UserSinglePurchases_CardCode ON dbo.UserSinglePurchases(CardCode);
                CREATE INDEX IX_UserSinglePurchases_PurchasedAt ON dbo.UserSinglePurchases(PurchasedAt DESC);
                PRINT '✅ Tabla dbo.UserSinglePurchases creada exitosamente.';
            END
            ELSE
            BEGIN
                PRINT 'ℹ️ La tabla dbo.UserSinglePurchases ya existe.';
            END
        `);

        // 2. Crear o actualizar SP dbo.sp_ComprarCartaSingle
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ComprarCartaSingle
                @UsuarioId INT,
                @CardCode VARCHAR(50),
                @CardName NVARCHAR(150) = NULL,
                @PriceUsd DECIMAL(10, 2) = 0.00,
                @PriceStarships INT = 0,
                @PaymentMethod VARCHAR(50) = 'STARSHIPS',
                @FoilType VARCHAR(50) = 'NORMAL',
                @Quantity INT = 1
            AS
            BEGIN
                SET NOCOUNT ON;
                SET XACT_ABORT ON;

                BEGIN TRY
                    BEGIN TRANSACTION;

                    -- 1. Validar usuario
                    DECLARE @CurrentStarships INT;
                    SELECT @CurrentStarships = Starships 
                    FROM dbo.Usuarios WITH (UPDLOCK, ROWLOCK)
                    WHERE Id = @UsuarioId;

                    IF @CurrentStarships IS NULL
                    BEGIN
                        ROLLBACK TRANSACTION;
                        SELECT 0 AS Success, 'Usuario no encontrado en el sistema.' AS Message, 0 AS NewStarshipsBalance;
                        RETURN;
                    END

                    -- 2. Validar saldo si el método de pago es STARSHIPS
                    IF UPPER(@PaymentMethod) = 'STARSHIPS' AND @PriceStarships > 0
                    BEGIN
                        IF @CurrentStarships < @PriceStarships
                        BEGIN
                            ROLLBACK TRANSACTION;
                            SELECT 0 AS Success, 
                                   CONCAT('Saldo insuficiente de Starships (Requiere: ', @PriceStarships, ', Tienes: ', @CurrentStarships, ').') AS Message,
                                   @CurrentStarships AS NewStarshipsBalance;
                            RETURN;
                        END

                        -- Descontar Starships
                        UPDATE dbo.Usuarios 
                        SET Starships = Starships - @PriceStarships
                        WHERE Id = @UsuarioId;
                    END

                    DECLARE @NewStarships INT;
                    SELECT @NewStarships = Starships FROM dbo.Usuarios WHERE Id = @UsuarioId;

                    -- 3. Entregar carta a dbo.UserCardsSql (Insertar o Incrementar cantidad)
                    IF EXISTS (SELECT 1 FROM dbo.UserCardsSql WHERE UsuarioId = @UsuarioId AND CardCode = @CardCode)
                    BEGIN
                        UPDATE dbo.UserCardsSql
                        SET Quantity = Quantity + @Quantity
                        WHERE UsuarioId = @UsuarioId AND CardCode = @CardCode;
                    END
                    ELSE
                    BEGIN
                        INSERT INTO dbo.UserCardsSql (UsuarioId, CardCode, Quantity, FoilType, AcquiredAt)
                        VALUES (@UsuarioId, @CardCode, @Quantity, @FoilType, GETDATE());
                    END

                    -- 4. Registrar auditoría en dbo.UserSinglePurchases
                    INSERT INTO dbo.UserSinglePurchases (
                        UsuarioId,
                        CardCode,
                        CardName,
                        PriceUsd,
                        PriceStarships,
                        PaymentMethod,
                        FoilType,
                        Quantity,
                        StarshipsBalanceBefore,
                        StarshipsBalanceAfter,
                        PurchasedAt
                    )
                    VALUES (
                        @UsuarioId,
                        @CardCode,
                        @CardName,
                        @PriceUsd,
                        @PriceStarships,
                        UPPER(@PaymentMethod),
                        @FoilType,
                        @Quantity,
                        @CurrentStarships,
                        @NewStarships,
                        GETDATE()
                    );

                    DECLARE @PurchaseId INT = SCOPE_IDENTITY();

                    COMMIT TRANSACTION;

                    SELECT 1 AS Success, 
                           '¡Compra realizada con éxito! La carta ha sido agregada a tu inventario.' AS Message,
                           @NewStarships AS NewStarshipsBalance,
                           @PurchaseId AS PurchaseId;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    SELECT 0 AS Success, ERROR_MESSAGE() AS Message, 0 AS NewStarshipsBalance;
                END CATCH
            END;
        `);
        console.log('✅ Stored Procedure dbo.sp_ComprarCartaSingle creado / actualizado.');

        // 3. Crear o actualizar SP dbo.sp_ObtenerHistorialComprasSingles
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ObtenerHistorialComprasSingles
                @UsuarioId INT = NULL,
                @Limit INT = 50
            AS
            BEGIN
                SET NOCOUNT ON;
                IF @UsuarioId IS NOT NULL AND @UsuarioId > 0
                BEGIN
                    SELECT TOP (@Limit)
                        p.Id,
                        p.UsuarioId,
                        u.Username,
                        p.CardCode,
                        p.CardName,
                        p.PriceUsd,
                        p.PriceStarships,
                        p.PaymentMethod,
                        p.FoilType,
                        p.Quantity,
                        p.StarshipsBalanceBefore,
                        p.StarshipsBalanceAfter,
                        p.PurchasedAt
                    FROM dbo.UserSinglePurchases p
                    INNER JOIN dbo.Usuarios u ON p.UsuarioId = u.Id
                    WHERE p.UsuarioId = @UsuarioId
                    ORDER BY p.PurchasedAt DESC;
                END
                ELSE
                BEGIN
                    SELECT TOP (@Limit)
                        p.Id,
                        p.UsuarioId,
                        u.Username,
                        p.CardCode,
                        p.CardName,
                        p.PriceUsd,
                        p.PriceStarships,
                        p.PaymentMethod,
                        p.FoilType,
                        p.Quantity,
                        p.StarshipsBalanceBefore,
                        p.StarshipsBalanceAfter,
                        p.PurchasedAt
                    FROM dbo.UserSinglePurchases p
                    INNER JOIN dbo.Usuarios u ON p.UsuarioId = u.Id
                    ORDER BY p.PurchasedAt DESC;
                END
            END;
        `);
        console.log('✅ Stored Procedure dbo.sp_ObtenerHistorialComprasSingles creado / actualizado.');

        console.log('🎉 Migración de Auditoría de Compras Singles completada exitosamente.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error en migración:', e);
        process.exit(1);
    }
}

migrate();
