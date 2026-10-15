const { getPool } = require('../backend/config/db');

async function updateSp() {
    const pool = await getPool();
    await pool.request().query(`
        CREATE OR ALTER PROCEDURE dbo.sp_VenderCartaRepetida
            @UsuarioId INT,
            @CardCode INT
        AS
        BEGIN
            SET NOCOUNT ON;
            SET XACT_ABORT ON;

            BEGIN TRY
                BEGIN TRANSACTION;

                DECLARE @Qty INT;
                SELECT @Qty = Quantity 
                FROM dbo.UserCardsSql WITH (UPDLOCK, ROWLOCK) 
                WHERE UsuarioId = @UsuarioId AND CardCode = @CardCode;

                IF @Qty IS NULL OR @Qty <= 0
                BEGIN
                    THROW 51020, 'No posees copias de esta carta para vender.', 1;
                END

                -- Verificar si la carta está en el mazo activo
                DECLARE @InDeckCount INT = 0;
                SELECT @InDeckCount = COUNT(*) 
                FROM dbo.DeckCards dc
                INNER JOIN dbo.Decks d ON dc.DeckId = d.Id
                WHERE d.UsuarioId = @UsuarioId AND d.EsActivo = 1 AND dc.CardCode = @CardCode;

                IF @InDeckCount = 0
                BEGIN
                    SELECT @InDeckCount = CASE WHEN MainDeckJson LIKE '%' + CAST(@CardCode AS VARCHAR(20)) + '%' THEN 1 ELSE 0 END
                    FROM dbo.Decks
                    WHERE UsuarioId = @UsuarioId AND EsActivo = 1;
                END

                IF @Qty <= @InDeckCount
                BEGIN
                    THROW 51020, 'No puedes vender esta carta porque está equipada en tu Mazo activo. Quítala del mazo primero.', 1;
                END

                -- Descontar 1 copia
                UPDATE dbo.UserCardsSql
                SET Quantity = Quantity - 1
                WHERE UsuarioId = @UsuarioId AND CardCode = @CardCode;

                DELETE FROM dbo.UserCardsSql 
                WHERE UsuarioId = @UsuarioId AND CardCode = @CardCode AND Quantity <= 0;

                -- Abonar 100 estrellas al usuario
                UPDATE dbo.Usuarios
                SET Starships = Starships + 100
                WHERE Id = @UsuarioId;

                INSERT INTO dbo.StarshipTransactions (UserId, Amount, Description, TransactionType, CreatedAt)
                VALUES (@UsuarioId, 100, 'Venta de carta #' + CAST(@CardCode AS VARCHAR(20)), 'CARD_SALE', GETDATE());

                DECLARE @NewBalance BIGINT;
                SELECT @NewBalance = Starships FROM dbo.Usuarios WHERE Id = @UsuarioId;

                DECLARE @RemainingQty INT = @Qty - 1;

                COMMIT TRANSACTION;

                SELECT 
                    1 AS Success,
                    @RemainingQty AS RemainingQuantity,
                    @NewBalance AS NewBalance,
                    100 AS PaidAmount,
                    'Has vendido 1 copia por 100 estrellas.' AS Message;

            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                DECLARE @ErrSell NVARCHAR(4000) = ERROR_MESSAGE();
                THROW 51021, @ErrSell, 1;
            END CATCH
        END;
    `);

    console.log('✅ sp_VenderCartaRepetida updated successfully in SQL Server.');
    process.exit(0);
}

updateSp().catch(err => {
    console.error(err);
    process.exit(1);
});
