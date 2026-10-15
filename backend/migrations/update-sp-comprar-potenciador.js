const { getPool, sql } = require('../config/db');

async function updateSpComprarPotenciador() {
    try {
        console.log('⚡ Conectando a SQL Server...');
        const pool = await getPool();

        // 1. Asegurar tabla UserMailbox si hiciera falta
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserMailbox')
            BEGIN
                CREATE TABLE dbo.UserMailbox (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    UsuarioId INT NULL,
                    GiftType NVARCHAR(50) NOT NULL,
                    Title NVARCHAR(150) NOT NULL,
                    Description NVARCHAR(500) NULL,
                    PayloadJson NVARCHAR(MAX) NOT NULL,
                    IsClaimed BIT NOT NULL DEFAULT 0,
                    ClaimedAt DATETIME NULL,
                    Sender NVARCHAR(100) NOT NULL DEFAULT 'Administración',
                    CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
                );
            END
        `);

        // 2. Crear o Alterar dbo.sp_ComprarPotenciador
        console.log('⚡ Actualizando stored procedure dbo.sp_ComprarPotenciador...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ComprarPotenciador
                @UserId INT,
                @ItemCode VARCHAR(50),
                @ItemName NVARCHAR(150),
                @ItemType VARCHAR(50),
                @BoostValue DECIMAL(5,2),
                @CostStarships INT
            AS
            BEGIN
                SET NOCOUNT ON;
                SET XACT_ABORT ON;

                BEGIN TRY
                    BEGIN TRANSACTION;

                    -- 1. Validar existencia de usuario y saldo de StarShips
                    DECLARE @Stars BIGINT;
                    SELECT @Stars = Starships FROM dbo.Usuarios WITH (UPDLOCK, ROWLOCK) WHERE Id = @UserId;

                    IF @Stars IS NULL
                    BEGIN
                        THROW 50040, 'Usuario no encontrado en la base de datos.', 1;
                    END

                    IF @Stars < @CostStarships
                    BEGIN
                        THROW 50041, 'Saldo insuficiente de StarShips para realizar la compra.', 1;
                    END

                    -- 2. Descontar StarShips
                    UPDATE dbo.Usuarios 
                    SET Starships = Starships - @CostStarships 
                    WHERE Id = @UserId;

                    -- 3. Insertar en dbo.UserMailbox (Buzón oficial del perfil del usuario)
                    DECLARE @Payload NVARCHAR(MAX) = CONCAT(
                        '{"code":"', @ItemCode, 
                        '","name":"', REPLACE(@ItemName, '"', '\"'), 
                        '","type":"', @ItemType, 
                        '","boost_value":', CAST(@BoostValue AS VARCHAR(10)), 
                        ',"value":', CAST(@BoostValue AS VARCHAR(10)), 
                        ',"amount":1}'
                    );

                    INSERT INTO dbo.UserMailbox (
                        UsuarioId, GiftType, Title, Description, PayloadJson, IsClaimed, Sender, CreatedAt
                    )
                    VALUES (
                        @UserId, 
                        'POTENCIADOR', 
                        @ItemName, 
                        'Potenciador adquirido en la Tienda Oficial', 
                        @Payload, 
                        0, 
                        'Tienda de Potenciadores', 
                        GETDATE()
                    );

                    -- 4. Registrar en BuzonRecompensas (para auditoría e histórico)
                    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'BuzonRecompensas')
                    BEGIN
                        INSERT INTO dbo.BuzonRecompensas (
                            UsuarioId, ItemCode, ItemName, ItemType, BoostValue, Source, IsConsumed, CreatedAt
                        )
                        VALUES (
                            @UserId, 
                            @ItemCode, 
                            @ItemName, 
                            @ItemType, 
                            @BoostValue, 
                            'Tienda de Potenciadores', 
                            0, 
                            GETDATE()
                        );
                    END

                    -- 5. Registrar en StarshipTransactions (Auditoría contable)
                    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'StarshipTransactions')
                    BEGIN
                        INSERT INTO dbo.StarshipTransactions (
                            UserId, Amount, Description, TransactionType, CreatedAt
                        )
                        VALUES (
                            @UserId, 
                            -@CostStarships, 
                            CONCAT('Compra de potenciador: ', @ItemName), 
                            'SHOP_PURCHASE', 
                            GETDATE()
                        );
                    END

                    -- 6. Obtener saldo actualizado
                    DECLARE @NewB BIGINT;
                    SELECT @NewB = Starships FROM dbo.Usuarios WHERE Id = @UserId;

                    COMMIT TRANSACTION;

                    SELECT 
                        1 AS Success, 
                        @NewB AS NewStarshipsBalance, 
                        'Potenciador adquirido con éxito y enviado a tu Buzón.' AS Message;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
                    THROW 50042, @ErrMsg, 1;
                END CATCH
            END
        `);

        console.log('✅ dbo.sp_ComprarPotenciador actualizado correctamente con registro en UserMailbox y StarshipTransactions.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error en migración:', err);
        process.exit(1);
    }
}

updateSpComprarPotenciador();
