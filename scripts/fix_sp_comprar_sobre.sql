USE [AniDimensionDB];
GO

IF OBJECT_ID('dbo.sp_ComprarYGuardarSobre', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_ComprarYGuardarSobre;
GO

CREATE PROCEDURE dbo.sp_ComprarYGuardarSobre
    @UsuarioId INT,
    @PackId NVARCHAR(50),
    @Costo INT,
    @CardsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Validar que el sobre exista y esté activo
        DECLARE @IsActive BIT, @PackPrice INT, @PackName NVARCHAR(150);
        SELECT @IsActive = IsActive, @PackPrice = Price, @PackName = Name
        FROM dbo.BoosterPacks
        WHERE PackId = @PackId;

        IF @IsActive IS NULL OR @IsActive = 0
        BEGIN
            RAISERROR('El sobre solicitado no está disponible para compra.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- 2. Validar saldo de Starships del usuario
        DECLARE @CurrentStarships BIGINT;
        SELECT @CurrentStarships = ISNULL(Starships, 0)
        FROM dbo.Usuarios
        WHERE Id = @UsuarioId;

        IF @CurrentStarships < @Costo
        BEGIN
            RAISERROR('Saldo insuficiente de Starships para comprar este sobre.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- 3. Descontar saldo y registrar transacción
        UPDATE dbo.Usuarios
        SET Starships = Starships - @Costo
        WHERE Id = @UsuarioId;

        INSERT INTO dbo.StarshipTransactions 
            (UserId, Amount, Description, TransactionType, CreatedAt)
        VALUES 
            (@UsuarioId, -@Costo, 'Compra de sobre: ' + @PackName, 'SHOP_PURCHASE', GETDATE());

        -- 4. Insertar / Actualizar las cartas en dbo.UserCardsSql agrupadas por CardCode
        -- El GROUP BY evita el error "The MERGE statement attempted to UPDATE or DELETE the same row more than once"
        -- al abrir cajas de 10 sobres (30 cartas con posibles copias repetidas)
        MERGE dbo.UserCardsSql AS target
        USING (
            SELECT 
                @UsuarioId AS UsuarioId,
                CAST(JSON_VALUE(value, '$.card_id') AS INT) AS CardCode,
                MAX(ISNULL(JSON_VALUE(value, '$.rarity'), 'NORMAL')) AS FoilType,
                COUNT(*) AS QuantityToAdd
            FROM OPENJSON(@CardsJson)
            WHERE JSON_VALUE(value, '$.card_id') IS NOT NULL
            GROUP BY CAST(JSON_VALUE(value, '$.card_id') AS INT)
        ) AS source
        ON (target.UsuarioId = source.UsuarioId AND target.CardCode = source.CardCode)
        WHEN MATCHED THEN
            UPDATE SET target.Quantity = target.Quantity + source.QuantityToAdd
        WHEN NOT MATCHED THEN
            INSERT (UsuarioId, CardCode, Quantity, FoilType, AcquiredAt)
            VALUES (source.UsuarioId, source.CardCode, source.QuantityToAdd, source.FoilType, GETDATE());

        COMMIT TRANSACTION;

        -- Devolver balance actualizado
        SELECT 
            1 AS Success, 
            @CurrentStarships - @Costo AS NewStarships, 
            'Sobre abierto y cartas agregadas al inventario con éxito.' AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
