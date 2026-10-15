const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('../backend/config/db');

const PACK_FILES = {
    'LOB': 'lob_cards_frontend.json',
    'MRD': 'mrd_cards_frontend.json',
    'MRL': 'mrl_cards_frontend.json',
    'PSV': 'psv_cards_frontend.json',
    'LON': 'lon_cards_frontend.json',
    'LOD': 'lod_cards_frontend.json',
    'PGD': 'pgd_cards_frontend.json',
    'MFC': 'mfc_cards_frontend.json',
    'DCR': 'dcr_cards_frontend.json',
    'IOC': 'ioc_cards_frontend.json',
    'AST': 'ast_cards_frontend.json',
    'TLM': 'tlm_cards_frontend.json',
    'CRV': 'crv_cards_frontend.json',
    'EEN': 'een_cards_frontend.json',
    'SOI': 'soi_cards_frontend.json',
    'EOJ': 'eoj_cards_frontend.json',
    'POTD': 'potd_cards_frontend.json',
    'CDIP': 'cdip_cards_frontend.json',
    'STON': 'ston_cards_frontend.json',
    'FOTB': 'fotb_cards_frontend.json',
    'TAEV': 'taev_cards_frontend.json',
    'GLAS': 'glas_cards_frontend.json',
    'PTDN': 'ptdn_cards_frontend.json',
    'LODT': 'lodt_cards_frontend.json',
    'TDGS': 'tdgs_cards_frontend.json',
    'CSOC': 'csoc_cards_frontend.json',
    'CRMS': 'crms_cards_frontend.json',
    'RGBT': 'rgbt_cards_frontend.json',
    'ANPR': 'anpr_cards_frontend.json',
    'SOVR': 'sovr_cards_frontend.json',
    'ABPF': 'abpf_cards_frontend.json',
    'TSHD': 'tshd_cards_frontend.json',
    'DREV': 'drev_cards_frontend.json',
    'STBL': 'stbl_cards_frontend.json',
    'STOR': 'stor_cards_frontend.json',
    'EXVC': 'exvc_cards_frontend.json',
    'DRLG': 'drlg_cards_frontend.json',
    'PROMO-DM': 'promo_dm_cards_frontend.json',
    'GODS-EGY': 'gods_cards_frontend.json'
};

async function migratePackCards() {
    console.log('🚀 Iniciando migración de cartas de sobres oficiales a SQL Server...');
    const pool = await getPool();

    // 1. Crear tabla dbo.BoosterPackCards si no existe
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BoosterPackCards')
        BEGIN
            CREATE TABLE dbo.BoosterPackCards (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                PackId NVARCHAR(50) NOT NULL,
                CardId INT NOT NULL,
                CardNumber NVARCHAR(50) NULL,
                CardName NVARCHAR(255) NULL,
                CardType NVARCHAR(100) NULL,
                Atk INT NULL,
                Def INT NULL,
                [Level] INT NULL,
                Attribute NVARCHAR(50) NULL,
                Race NVARCHAR(50) NULL,
                Description NVARCHAR(MAX) NULL,
                Rarity NVARCHAR(50) NOT NULL DEFAULT 'COMMON',
                IsActive BIT NOT NULL DEFAULT 1,
                PackDrop BIT NOT NULL DEFAULT 1,
                DeckUsable BIT NOT NULL DEFAULT 1,
                NpcDrop BIT NOT NULL DEFAULT 1,
                CreatedAt DATETIME DEFAULT GETDATE(),
                CONSTRAINT UQ_BoosterPackCards UNIQUE (PackId, CardId)
            );
            CREATE NONCLUSTERED INDEX IX_BoosterPackCards_PackId ON dbo.BoosterPackCards(PackId);
            CREATE NONCLUSTERED INDEX IX_BoosterPackCards_CardId ON dbo.BoosterPackCards(CardId);
            PRINT 'Tabla dbo.BoosterPackCards creada exitosamente.';
        END
    `);

    // 2. Traer overrides existentes de dbo.PackCardOverrides
    const ovRes = await pool.request().query('SELECT PackId, CardId, IsActive, PackDrop, DeckUsable, NpcDrop FROM dbo.PackCardOverrides');
    const overridesMap = new Map();
    for (const ov of ovRes.recordset) {
        overridesMap.set(`${ov.PackId.toUpperCase()}_${ov.CardId}`, ov);
    }

    let totalMigrated = 0;

    // 3. Iterar por cada sobre y migrar a SQL
    for (const [packId, fileName] of Object.entries(PACK_FILES)) {
        const filePath = path.resolve(__dirname, `../backend/data/${fileName}`);
        if (!fs.existsSync(filePath)) {
            console.warn(`Archivo no encontrado: ${fileName}`);
            continue;
        }

        const cards = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`📦 Procesando sobre [${packId}] (${cards.length} cartas)...`);

        for (const c of cards) {
            const cardId = parseInt(c.card_id || c.id, 10);
            if (!cardId) continue;

            const cardNumber = c.set || c.card_number || null;
            const cardName = c.name || `Carta #${cardId}`;
            const cardType = c.type || 'Normal Monster';
            const atk = c.atk !== undefined && c.atk !== null ? parseInt(c.atk, 10) : null;
            const def = c.def !== undefined && c.def !== null ? parseInt(c.def, 10) : null;
            const level = c.level !== undefined && c.level !== null ? parseInt(c.level, 10) : null;
            const attribute = c.attribute || null;
            const race = c.race || null;
            const desc = c.desc || '';
            const rarity = c.rarity || 'COMMON';

            const ov = overridesMap.get(`${packId.toUpperCase()}_${cardId}`);
            const isActive = ov ? (ov.IsActive ? 1 : 0) : (c.active !== false ? 1 : 0);
            const packDrop = ov ? (ov.PackDrop ? 1 : 0) : (c.pack_drop !== false ? 1 : 0);
            const deckUsable = ov ? (ov.DeckUsable ? 1 : 0) : (c.deck_usable !== false ? 1 : 0);
            const npcDrop = ov ? (ov.NpcDrop ? 1 : 0) : (c.npc_drop !== false ? 1 : 0);

            await pool.request()
                .input('PackId', sql.NVarChar(50), packId)
                .input('CardId', sql.Int, cardId)
                .input('CardNumber', sql.NVarChar(50), cardNumber)
                .input('CardName', sql.NVarChar(255), cardName)
                .input('CardType', sql.NVarChar(100), cardType)
                .input('Atk', sql.Int, atk)
                .input('Def', sql.Int, def)
                .input('Level', sql.Int, level)
                .input('Attribute', sql.NVarChar(50), attribute)
                .input('Race', sql.NVarChar(50), race)
                .input('Description', sql.NVarChar(sql.MAX), desc)
                .input('Rarity', sql.NVarChar(50), rarity)
                .input('IsActive', sql.Bit, isActive)
                .input('PackDrop', sql.Bit, packDrop)
                .input('DeckUsable', sql.Bit, deckUsable)
                .input('NpcDrop', sql.Bit, npcDrop)
                .query(`
                    MERGE dbo.BoosterPackCards AS target
                    USING (SELECT @PackId AS PackId, @CardId AS CardId) AS source
                    ON (target.PackId = source.PackId AND target.CardId = source.CardId)
                    WHEN MATCHED THEN
                        UPDATE SET
                            CardNumber = @CardNumber,
                            CardName = @CardName,
                            CardType = @CardType,
                            Atk = @Atk,
                            Def = @Def,
                            [Level] = @Level,
                            Attribute = @Attribute,
                            Race = @Race,
                            Description = @Description,
                            Rarity = @Rarity,
                            IsActive = @IsActive,
                            PackDrop = @PackDrop,
                            DeckUsable = @DeckUsable,
                            NpcDrop = @NpcDrop
                    WHEN NOT MATCHED THEN
                        INSERT (PackId, CardId, CardNumber, CardName, CardType, Atk, Def, [Level], Attribute, Race, Description, Rarity, IsActive, PackDrop, DeckUsable, NpcDrop, CreatedAt)
                        VALUES (@PackId, @CardId, @CardNumber, @CardName, @CardType, @Atk, @Def, @Level, @Attribute, @Race, @Description, @Rarity, @IsActive, @PackDrop, @DeckUsable, @NpcDrop, GETDATE());
                `);

            totalMigrated++;
        }
    }

    console.log(`\n🎉 Migración completa: ${totalMigrated} cartas registradas en dbo.BoosterPackCards.`);

    // 4. Crear Stored Procedures nativos en SQL Server
    console.log('⚡ Creando procedimientos almacenados para sobres y cartas...');

    await pool.request().query(`
        -- SP: Obtener cartas de un sobre específico o de todos los sobres
        CREATE OR ALTER PROCEDURE dbo.sp_ObtenerCartasDeSobres
            @PackId NVARCHAR(50) = NULL
        AS
        BEGIN
            SET NOCOUNT ON;
            SELECT 
                bpc.Id,
                bpc.PackId,
                bpc.CardId,
                bpc.CardNumber,
                bpc.CardName,
                ISNULL(t.name_es, bpc.CardName) AS CardNameEs,
                bpc.CardType,
                bpc.Atk,
                bpc.Def,
                bpc.[Level],
                bpc.Attribute,
                bpc.Race,
                bpc.Description,
                ISNULL(t.desc_es, bpc.Description) AS DescriptionEs,
                bpc.Rarity,
                bpc.IsActive,
                bpc.PackDrop,
                bpc.DeckUsable,
                bpc.NpcDrop,
                CONCAT('https://images.ygoprodeck.com/images/cards_small/', bpc.CardId, '.jpg') AS ImageUrl,
                CONCAT('https://images.ygoprodeck.com/images/cards/', bpc.CardId, '.jpg') AS ImageLargeUrl
            FROM dbo.BoosterPackCards bpc
            LEFT JOIN dbo.texts t ON bpc.CardId = t.id
            WHERE (@PackId IS NULL OR bpc.PackId = @PackId)
            ORDER BY bpc.PackId, bpc.Id ASC;
        END;
    `);

    await pool.request().query(`
        -- SP: Obtener catálogo completo de sobres con sus cartas
        CREATE OR ALTER PROCEDURE dbo.sp_ObtenerCatalogoSobresYCartas
        AS
        BEGIN
            SET NOCOUNT ON;

            -- Recordset 1: Sobres
            SELECT 
                PackId, Name, Code, Series, Price, OfferText, Image, Description, CardsPerPack, IsActive, IsVisible
            FROM dbo.BoosterPacks
            ORDER BY 
                CASE Series 
                    WHEN 'DM' THEN 1 
                    WHEN 'GX' THEN 2 
                    WHEN '5D' THEN 3 
                    ELSE 4 
                END,
                Price ASC;

            -- Recordset 2: Cartas de los sobres
            SELECT 
                bpc.Id,
                bpc.PackId,
                bpc.CardId,
                bpc.CardNumber,
                bpc.CardName,
                ISNULL(t.name_es, bpc.CardName) AS CardNameEs,
                bpc.CardType,
                bpc.Atk,
                bpc.Def,
                bpc.[Level],
                bpc.Attribute,
                bpc.Race,
                bpc.Description,
                ISNULL(t.desc_es, bpc.Description) AS DescriptionEs,
                bpc.Rarity,
                bpc.IsActive,
                bpc.PackDrop,
                bpc.DeckUsable,
                bpc.NpcDrop,
                CONCAT('https://images.ygoprodeck.com/images/cards_small/', bpc.CardId, '.jpg') AS ImageUrl,
                CONCAT('https://images.ygoprodeck.com/images/cards/', bpc.CardId, '.jpg') AS ImageLargeUrl
            FROM dbo.BoosterPackCards bpc
            LEFT JOIN dbo.texts t ON bpc.CardId = t.id
            ORDER BY bpc.PackId, bpc.Id ASC;
        END;
    `);

    console.log('✅ Stored procedures dbo.sp_ObtenerCartasDeSobres y dbo.sp_ObtenerCatalogoSobresYCartas creados.');

    // 5. Validar conteo final en base de datos
    const checkCount = await pool.request().query('SELECT COUNT(*) AS Total FROM dbo.BoosterPackCards');
    console.log(`📊 Total en base de datos dbo.BoosterPackCards: ${checkCount.recordset[0].Total} cartas.`);

    await pool.close();
}

migratePackCards().catch(console.error);
