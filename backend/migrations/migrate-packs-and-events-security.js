/**
 * MIGRACIÓN: Persistencia 100% en Base de Datos de Sobres, Configuración de Cartas y Eventos
 * Elimina la dependencia de localStorage y utiliza Procedimientos Almacenados en SQL Server.
 */
const { getPool, sql } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function migratePacksAndEventsSecurity() {
    try {
        console.log('[MIGRATION] Conectando a SQL Server para migrar persistencia y seguridad...');
        const pool = await getPool();

        // 1. Desactivar eventos de Torneo y Subasta inmediatamente
        console.log('[MIGRATION] Desactivando eventos de Torneo y Subasta...');
        await pool.request().query(`
            UPDATE dbo.Torneos 
            SET Estado = 'FINALIZADO' 
            WHERE Estado IN ('REGISTRO', 'EN_CURSO');

            UPDATE dbo.EventosSubasta 
            SET Status = 'FINISHED' 
            WHERE Status = 'ACTIVE';
        `);

        // 2. Crear / Asegurar Tablas dbo.BoosterPacks y dbo.PackCardOverrides
        console.log('[MIGRATION] Creando tablas dbo.BoosterPacks y dbo.PackCardOverrides...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BoosterPacks')
            BEGIN
                CREATE TABLE dbo.BoosterPacks (
                    PackId NVARCHAR(50) PRIMARY KEY,
                    Name NVARCHAR(150) NOT NULL,
                    Code NVARCHAR(50) NOT NULL,
                    Series NVARCHAR(50) NOT NULL DEFAULT 'DM',
                    Price INT NOT NULL DEFAULT 1500,
                    OfferText NVARCHAR(100) NULL,
                    Image NVARCHAR(255) NULL,
                    Description NVARCHAR(1000) NULL,
                    CardsPerPack INT NOT NULL DEFAULT 4,
                    IsActive BIT NOT NULL DEFAULT 0,
                    IsVisible BIT NOT NULL DEFAULT 1,
                    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
                );
            END

            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PackCardOverrides')
            BEGIN
                CREATE TABLE dbo.PackCardOverrides (
                    PackId NVARCHAR(50) NOT NULL,
                    CardId INT NOT NULL,
                    IsActive BIT NOT NULL DEFAULT 1,
                    PackDrop BIT NOT NULL DEFAULT 1,
                    DeckUsable BIT NOT NULL DEFAULT 1,
                    NpcDrop BIT NOT NULL DEFAULT 1,
                    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                    CONSTRAINT PK_PackCardOverrides PRIMARY KEY (PackId, CardId)
                );
            END
        `);

        // 3. Crear Stored Procedures Oficiales
        console.log('[MIGRATION] Creando Procedimientos Almacenados sp_GetBoosterPacks, sp_UpdateBoosterPack, sp_UpdateCardOverride, sp_DeactivateAllEvents...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_GetBoosterPacks
            AS
            BEGIN
                SET NOCOUNT ON;
                -- 1. Lista de sobres
                SELECT 
                    PackId, Name, Code, Series, Price, OfferText, Image, Description, CardsPerPack,
                    IsActive, IsVisible, UpdatedAt
                FROM dbo.BoosterPacks
                ORDER BY 
                    CASE WHEN PackId = 'LOB' THEN 0 ELSE 1 END,
                    PackId ASC;

                -- 2. Lista de overrides de cartas
                SELECT 
                    PackId, CardId, IsActive, PackDrop, DeckUsable, NpcDrop, UpdatedAt
                FROM dbo.PackCardOverrides;
            END;
        `);

        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_UpdateBoosterPack
                @PackId NVARCHAR(50),
                @IsActive BIT,
                @IsVisible BIT = 1,
                @Price INT = 1500,
                @OfferText NVARCHAR(100) = NULL
            AS
            BEGIN
                SET NOCOUNT ON;
                IF EXISTS (SELECT 1 FROM dbo.BoosterPacks WHERE PackId = @PackId)
                BEGIN
                    UPDATE dbo.BoosterPacks
                    SET 
                        IsActive = @IsActive,
                        IsVisible = @IsVisible,
                        Price = @Price,
                        OfferText = @OfferText,
                        UpdatedAt = GETDATE()
                    WHERE PackId = @PackId;
                END
                ELSE
                BEGIN
                    INSERT INTO dbo.BoosterPacks (PackId, Name, Code, Price, OfferText, IsActive, IsVisible, UpdatedAt)
                    VALUES (@PackId, @PackId, @PackId, @Price, @OfferText, @IsActive, @IsVisible, GETDATE());
                END

                SELECT * FROM dbo.BoosterPacks WHERE PackId = @PackId;
            END;
        `);

        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_UpdateCardOverride
                @PackId NVARCHAR(50),
                @CardId INT,
                @IsActive BIT = 1,
                @PackDrop BIT = 1,
                @DeckUsable BIT = 1,
                @NpcDrop BIT = 1
            AS
            BEGIN
                SET NOCOUNT ON;
                MERGE dbo.PackCardOverrides AS target
                USING (SELECT @PackId AS PackId, @CardId AS CardId) AS source
                ON (target.PackId = source.PackId AND target.CardId = source.CardId)
                WHEN MATCHED THEN
                    UPDATE SET 
                        IsActive = @IsActive,
                        PackDrop = @PackDrop,
                        DeckUsable = @DeckUsable,
                        NpcDrop = @NpcDrop,
                        UpdatedAt = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (PackId, CardId, IsActive, PackDrop, DeckUsable, NpcDrop, UpdatedAt)
                    VALUES (@PackId, @CardId, @IsActive, @PackDrop, @DeckUsable, @NpcDrop, GETDATE());

                SELECT * FROM dbo.PackCardOverrides WHERE PackId = @PackId AND CardId = @CardId;
            END;
        `);

        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_DeactivateAllEvents
            AS
            BEGIN
                SET NOCOUNT ON;
                UPDATE dbo.Torneos SET Estado = 'FINALIZADO' WHERE Estado IN ('REGISTRO', 'EN_CURSO');
                UPDATE dbo.EventosSubasta SET Status = 'FINISHED' WHERE Status = 'ACTIVE';
                
                SELECT @@ROWCOUNT AS ImpactedRows;
            END;
        `);

        // 4. Poblar BoosterPacks con todos los sobres iniciales
        console.log('[MIGRATION] Sincronizando catálogo inicial de sobres en dbo.BoosterPacks...');
        const packsDataPath = path.resolve(__dirname, '../data/build_packs_data.js');
        const frontendPacksPath = path.resolve(__dirname, '../../frontend/js/data/packs-data.js');

        let initialPacksList = [];
        if (fs.existsSync(frontendPacksPath)) {
            const fContent = fs.readFileSync(frontendPacksPath, 'utf8');
            const m = fContent.match(/const INITIAL_PACKS = (\[[\s\S]*?\]);\s*const STORAGE_KEY/);
            if (m) {
                try {
                    initialPacksList = eval(m[1]);
                } catch(e) {}
            }
        }

        for (const p of initialPacksList) {
            const isLOB = (p.id === 'LOB');
            const isActive = isLOB ? 1 : 0;
            const isVisible = p.visible !== false ? 1 : 0;
            const price = p.price || 1500;
            const offer = p.offer_text || (isLOB ? 'POPULAR 🔥' : 'PRÓXIMAMENTE');

            await pool.request()
                .input('PackId', sql.NVarChar(50), p.id)
                .input('Name', sql.NVarChar(150), p.name)
                .input('Code', sql.NVarChar(50), p.code || p.id)
                .input('Series', sql.NVarChar(50), p.series || 'DM')
                .input('Price', sql.Int, price)
                .input('OfferText', sql.NVarChar(100), offer)
                .input('Image', sql.NVarChar(255), p.image || '../../assets/images/packs/lob_pack.jpg')
                .input('Description', sql.NVarChar(1000), (p.description || '').slice(0, 1000))
                .input('CardsPerPack', sql.Int, p.cards_per_pack || 4)
                .input('IsActive', sql.Bit, isActive)
                .input('IsVisible', sql.Bit, isVisible)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM dbo.BoosterPacks WHERE PackId = @PackId)
                    BEGIN
                        INSERT INTO dbo.BoosterPacks 
                            (PackId, Name, Code, Series, Price, OfferText, Image, Description, CardsPerPack, IsActive, IsVisible, UpdatedAt)
                        VALUES 
                            (@PackId, @Name, @Code, @Series, @Price, @OfferText, @Image, @Description, @CardsPerPack, @IsActive, @IsVisible, GETDATE());
                    END
                    ELSE
                    BEGIN
                        UPDATE dbo.BoosterPacks
                        SET 
                            Name = @Name,
                            Code = @Code,
                            Series = @Series,
                            Price = @Price,
                            OfferText = @OfferText,
                            Image = @Image,
                            Description = @Description,
                            CardsPerPack = @CardsPerPack,
                            IsActive = @IsActive,
                            IsVisible = @IsVisible,
                            UpdatedAt = GETDATE()
                        WHERE PackId = @PackId;
                    END
                `);
        }

        console.log(`[MIGRATION EXITOSA] Se sincronizaron ${initialPacksList.length} sobres en dbo.BoosterPacks con Stored Procedures.`);
        process.exit(0);
    } catch (err) {
        console.error('[MIGRATION ERROR]', err);
        process.exit(1);
    }
}

migratePacksAndEventsSecurity();
