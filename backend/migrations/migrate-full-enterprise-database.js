const { getPool, sql } = require('../config/db');
const adventureData = require('../../frontend/js/data/npcs-adventure-data');

async function runEnterpriseMigration() {
    console.log('[MIGRATION] === INICIANDO REESTRUCTURACIÓN COMPLETA DE BASE DE DATOS EMPRESARIAL ===');
    const pool = await getPool();

    // =========================================================================
    // 1. TABLA PADRE: dbo.NPCs (Catálogo Maestro Relacional de NPCs)
    // =========================================================================
    console.log('[1/7] Creando/Verificando tabla maestra dbo.NPCs...');
    await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'NPCs')
        BEGIN
            CREATE TABLE dbo.NPCs (
                Id INT PRIMARY KEY,
                EraId INT NOT NULL,
                Name NVARCHAR(100) NOT NULL,
                Level INT NOT NULL,
                AvatarCode VARCHAR(50) NULL,
                PortraitCode VARCHAR(50) NULL,
                LocationName NVARCHAR(150) NULL,
                LocX INT NULL,
                LocY INT NULL,
                IsBoss BIT NOT NULL DEFAULT 0,
                DeckTheme NVARCHAR(150) NULL,
                KeyCards NVARCHAR(250) NULL,
                Quote NVARCHAR(500) NULL,
                AssignedPack VARCHAR(50) NULL,
                Difficulty NVARCHAR(50) NULL,
                AiLevel INT NOT NULL DEFAULT 1,
                ExpReward INT NOT NULL DEFAULT 100,
                StarshipsReward INT NOT NULL DEFAULT 50,
                CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
            );
            CREATE INDEX IX_NPCs_EraId ON dbo.NPCs(EraId);
            CREATE INDEX IX_NPCs_Level ON dbo.NPCs(Level);
            PRINT 'Tabla dbo.NPCs creada exitosamente.';
        END
    `);

    // =========================================================================
    // 2. TABLA HIJA: dbo.NpcDeckCards (Cartas de Mazos de NPCs Fila por Fila)
    // =========================================================================
    console.log('[2/7] Creando/Verificando tabla hija dbo.NpcDeckCards...');
    await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'NpcDeckCards')
        BEGIN
            CREATE TABLE dbo.NpcDeckCards (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                NpcId INT NOT NULL,
                CardCode BIGINT NOT NULL,
                CardName NVARCHAR(150) NULL,
                CardType NVARCHAR(50) NULL,
                Section NVARCHAR(10) NOT NULL, -- 'MAIN', 'EXTRA', 'SIDE'
                Quantity INT NOT NULL DEFAULT 1,
                SlotOrder INT NOT NULL,
                CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                CONSTRAINT FK_NpcDeckCards_NPCs FOREIGN KEY (NpcId) REFERENCES dbo.NPCs(Id) ON DELETE CASCADE
            );
            CREATE INDEX IX_NpcDeckCards_Npc_Section ON dbo.NpcDeckCards(NpcId, Section, SlotOrder);
            CREATE INDEX IX_NpcDeckCards_CardCode ON dbo.NpcDeckCards(CardCode);
            PRINT 'Tabla dbo.NpcDeckCards creada exitosamente.';
        END
    `);

    // =========================================================================
    // 3. TABLA MAESTRA: dbo.AdventureMedals (Medallas de Aventura Relacionales)
    // =========================================================================
    console.log('[3/7] Creando/Verificando tabla dbo.AdventureMedals...');
    await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AdventureMedals')
        BEGIN
            CREATE TABLE dbo.AdventureMedals (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                MedalCode VARCHAR(50) NOT NULL UNIQUE,
                NpcId INT NOT NULL,
                EraId INT NOT NULL,
                Name NVARCHAR(150) NOT NULL,
                Icon NVARCHAR(50) NULL,
                DescText NVARCHAR(500) NULL,
                BoosterType VARCHAR(20) NOT NULL, -- 'exp', 'starships', 'luck'
                BoosterValue DECIMAL(10,4) NOT NULL,
                Requirement NVARCHAR(255) NULL,
                CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                CONSTRAINT FK_AdventureMedals_NPCs FOREIGN KEY (NpcId) REFERENCES dbo.NPCs(Id) ON DELETE CASCADE
            );
            CREATE INDEX IX_AdventureMedals_NpcId ON dbo.AdventureMedals(NpcId);
            CREATE INDEX IX_AdventureMedals_EraId ON dbo.AdventureMedals(EraId);
            PRINT 'Tabla dbo.AdventureMedals creada exitosamente.';
        END
    `);

    // =========================================================================
    // 4. TABLA HIJA: dbo.UserAvatarPotenciadores (Historial de Potenciadores por Avatar)
    // =========================================================================
    console.log('[4/7] Creando/Verificando tabla hija dbo.UserAvatarPotenciadores...');
    await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'UserAvatarPotenciadores')
        BEGIN
            CREATE TABLE dbo.UserAvatarPotenciadores (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                UserId INT NOT NULL,
                AvatarCode VARCHAR(50) NOT NULL,
                PotenciadorCode VARCHAR(50) NOT NULL,
                PotenciadorName NVARCHAR(150) NOT NULL,
                BoostType VARCHAR(20) NOT NULL, -- 'EXP', 'STARSHIPS', 'LUCK'
                BoostValue DECIMAL(10,4) NOT NULL,
                AppliedAt DATETIME NOT NULL DEFAULT GETDATE()
            );
            CREATE INDEX IX_UserAvatarPotenciadores_User_Avatar ON dbo.UserAvatarPotenciadores(UserId, AvatarCode);
            PRINT 'Tabla dbo.UserAvatarPotenciadores creada exitosamente.';
        END
    `);

    // =========================================================================
    // 5. TABLA HIJA: dbo.DeckCards (Cartas de Mazos de Usuario Relacional)
    // =========================================================================
    console.log('[5/7] Creando/Verificando tabla hija dbo.DeckCards...');
    await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DeckCards')
        BEGIN
            CREATE TABLE dbo.DeckCards (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                DeckId INT NOT NULL,
                CardCode BIGINT NOT NULL,
                Section NVARCHAR(10) NOT NULL, -- 'MAIN', 'EXTRA', 'SIDE'
                SlotOrder INT NOT NULL,
                CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                CONSTRAINT FK_DeckCards_Decks FOREIGN KEY (DeckId) REFERENCES dbo.Decks(Id) ON DELETE CASCADE
            );
            CREATE INDEX IX_DeckCards_Deck_Section ON dbo.DeckCards(DeckId, Section, SlotOrder);
            PRINT 'Tabla dbo.DeckCards creada exitosamente.';
        END
    `);

    // =========================================================================
    // 6. TABLA: dbo.GameConfigurations (Configuraciones y Parámetros Globales)
    // =========================================================================
    console.log('[6/7] Creando/Verificando tabla dbo.GameConfigurations...');
    await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'GameConfigurations')
        BEGIN
            CREATE TABLE dbo.GameConfigurations (
                ConfigKey VARCHAR(100) PRIMARY KEY,
                ConfigCategory VARCHAR(50) NOT NULL,
                ConfigValue NVARCHAR(MAX) NOT NULL,
                DataType VARCHAR(20) NOT NULL, -- 'STRING', 'INT', 'FLOAT', 'JSON', 'BOOLEAN'
                Description NVARCHAR(255) NULL,
                UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
            );
            CREATE INDEX IX_GameConfigurations_Category ON dbo.GameConfigurations(ConfigCategory);
            PRINT 'Tabla dbo.GameConfigurations creada exitosamente.';
        END
    `);

    // =========================================================================
    // POBLAR DATOS RELACIONALES DE NPCs, DECK CARDS Y MEDALLAS
    // =========================================================================
    console.log('[7/7] Sincronizando catálogo completo de 223 NPCs, medallas y miles de cartas de mazo fila por fila...');
    
    // Cargar nombres de cartas desde dbo.texts para resolución ultra rápida
    console.log(' -> Cargando índice de nombres de cartas desde dbo.texts...');
    const cardNamesMap = new Map();
    const textsQuery = await pool.request().query(`SELECT id, name FROM dbo.texts`);
    textsQuery.recordset.forEach(r => cardNamesMap.set(r.id, r.name));
    console.log(` -> ${cardNamesMap.size} cartas indexadas en memoria.`);

    const npcsList = adventureData.NPCS || [];
    const medalsList = adventureData.MEDALS || [];

    // 1. Insertar / Actualizar dbo.NPCs
    console.log(` -> Sincronizando ${npcsList.length} NPCs en dbo.NPCs...`);
    for (const npc of npcsList) {
        const expReward = Math.max(50, npc.level * 25);
        const starshipsReward = Math.max(20, npc.level * 15);

        await pool.request()
            .input('id', sql.Int, npc.id)
            .input('eraId', sql.Int, npc.eraId)
            .input('name', sql.NVarChar(100), npc.name)
            .input('level', sql.Int, npc.level)
            .input('avatar', sql.VarChar(50), npc.avatar || 'AVA-002')
            .input('portrait', sql.VarChar(50), npc.portrait || npc.avatar || 'AVA-002')
            .input('locName', sql.NVarChar(150), npc.locationName || '')
            .input('locX', sql.Int, npc.locX || 0)
            .input('locY', sql.Int, npc.locY || 0)
            .input('isBoss', sql.Bit, npc.isBoss ? 1 : 0)
            .input('theme', sql.NVarChar(150), npc.deckTheme || '')
            .input('keyCards', sql.NVarChar(250), npc.keyCards || '')
            .input('quote', sql.NVarChar(500), npc.quote || '')
            .input('pack', sql.VarChar(50), npc.assignedPack || '')
            .input('diff', sql.NVarChar(50), npc.difficulty || '')
            .input('aiLevel', sql.Int, npc.aiLevel || 1)
            .input('expReward', sql.Int, expReward)
            .input('starReward', sql.Int, starshipsReward)
            .query(`
                MERGE dbo.NPCs AS target
                USING (SELECT @id AS Id) AS source
                ON target.Id = source.Id
                WHEN MATCHED THEN
                    UPDATE SET
                        EraId = @eraId,
                        Name = @name,
                        Level = @level,
                        AvatarCode = @avatar,
                        PortraitCode = @portrait,
                        LocationName = @locName,
                        LocX = @locX,
                        LocY = @locY,
                        IsBoss = @isBoss,
                        DeckTheme = @theme,
                        KeyCards = @keyCards,
                        Quote = @quote,
                        AssignedPack = @pack,
                        Difficulty = @diff,
                        AiLevel = @aiLevel,
                        ExpReward = @expReward,
                        StarshipsReward = @starReward,
                        UpdatedAt = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (Id, EraId, Name, Level, AvatarCode, PortraitCode, LocationName, LocX, LocY,
                            IsBoss, DeckTheme, KeyCards, Quote, AssignedPack, Difficulty, AiLevel,
                            ExpReward, StarshipsReward, CreatedAt, UpdatedAt)
                    VALUES (@id, @eraId, @name, @level, @avatar, @portrait, @locName, @locX, @locY,
                            @isBoss, @theme, @keyCards, @quote, @pack, @diff, @aiLevel,
                            @expReward, @starReward, GETDATE(), GETDATE());
            `);
    }

    // 2. Poblar dbo.NpcDeckCards fila por fila
    const countNpcCards = await pool.request().query(`SELECT COUNT(*) AS c FROM dbo.NpcDeckCards`);
    if (countNpcCards.recordset[0].c === 0) {
        console.log(` -> Poblando dbo.NpcDeckCards (mazos completos fila por fila)...`);
        let totalInsertedCards = 0;

        for (const npc of npcsList) {
            // Main Deck
            const mainDeck = Array.isArray(npc.deck) ? npc.deck : [];
            for (let i = 0; i < mainDeck.length; i++) {
                const cardCode = mainDeck[i];
                const cardName = cardNamesMap.get(Number(cardCode)) || `Carta #${cardCode}`;
                
                await pool.request()
                    .input('npcId', sql.Int, npc.id)
                    .input('cardCode', sql.BigInt, cardCode)
                    .input('cardName', sql.NVarChar(150), cardName)
                    .input('section', sql.NVarChar(10), 'MAIN')
                    .input('slotOrder', sql.Int, i + 1)
                    .query(`
                        INSERT INTO dbo.NpcDeckCards (NpcId, CardCode, CardName, Section, Quantity, SlotOrder)
                        VALUES (@npcId, @cardCode, @cardName, @section, 1, @slotOrder)
                    `);
                totalInsertedCards++;
            }

            // Extra Deck
            const extraDeck = Array.isArray(npc.extraDeck) ? npc.extraDeck : [];
            for (let i = 0; i < extraDeck.length; i++) {
                const cardCode = extraDeck[i];
                const cardName = cardNamesMap.get(Number(cardCode)) || `Carta Extra #${cardCode}`;
                
                await pool.request()
                    .input('npcId', sql.Int, npc.id)
                    .input('cardCode', sql.BigInt, cardCode)
                    .input('cardName', sql.NVarChar(150), cardName)
                    .input('section', sql.NVarChar(10), 'EXTRA')
                    .input('slotOrder', sql.Int, i + 1)
                    .query(`
                        INSERT INTO dbo.NpcDeckCards (NpcId, CardCode, CardName, Section, Quantity, SlotOrder)
                        VALUES (@npcId, @cardCode, @cardName, @section, 1, @slotOrder)
                    `);
                totalInsertedCards++;
            }
        }
        console.log(` -> ¡${totalInsertedCards} cartas de mazo de NPCs insertadas con éxito en dbo.NpcDeckCards!`);
    } else {
        console.log(` -> dbo.NpcDeckCards ya contenía ${countNpcCards.recordset[0].c} registros. Conservados.`);
    }

    // 3. Poblar dbo.AdventureMedals
    console.log(` -> Sincronizando ${medalsList.length} medallas en dbo.AdventureMedals...`);
    for (const m of medalsList) {
        await pool.request()
            .input('code', sql.VarChar(50), m.id)
            .input('npcId', sql.Int, m.npcId)
            .input('eraId', sql.Int, m.eraId)
            .input('name', sql.NVarChar(150), m.name)
            .input('icon', sql.NVarChar(50), m.icon || '🏅')
            .input('desc', sql.NVarChar(500), m.desc || '')
            .input('boosterType', sql.VarChar(20), m.boosterType)
            .input('boosterValue', sql.Decimal(10, 4), m.boosterValue)
            .input('req', sql.NVarChar(255), m.requirement || `Derrotar al NPC #${m.npcId}`)
            .query(`
                MERGE dbo.AdventureMedals AS target
                USING (SELECT @code AS MedalCode) AS source
                ON target.MedalCode = source.MedalCode
                WHEN MATCHED THEN
                    UPDATE SET
                        NpcId = @npcId,
                        EraId = @eraId,
                        Name = @name,
                        Icon = @icon,
                        DescText = @desc,
                        BoosterType = @boosterType,
                        BoosterValue = @boosterValue,
                        Requirement = @req
                WHEN NOT MATCHED THEN
                    INSERT (MedalCode, NpcId, EraId, Name, Icon, DescText, BoosterType, BoosterValue, Requirement)
                    VALUES (@code, @npcId, @eraId, @name, @icon, @desc, @boosterType, @boosterValue, @req);
            `);
    }

    // 4. Poblar dbo.GameConfigurations
    console.log(` -> Inicializando configuraciones de juego en dbo.GameConfigurations...`);
    const initialConfigs = [
        { key: 'STARTING_STARSHIPS', cat: 'ECONOMY', val: '5000', type: 'INT', desc: 'Starships iniciales otorgados al registrarse' },
        { key: 'STARTING_AVATAR', cat: 'COSMETICS', val: 'AVA-001', type: 'STRING', desc: 'Código del avatar por defecto otorgado al registrarse' },
        { key: 'MAX_PLAYER_LEVEL', cat: 'PROGRESSION', val: '100', type: 'INT', desc: 'Nivel máximo alcanzable por un jugador' },
        { key: 'BASE_DUEL_EXP_WIN', cat: 'REWARDS', val: '250', type: 'INT', desc: 'EXP base ganada en duelo victoria' },
        { key: 'BASE_DUEL_EXP_LOSS', cat: 'REWARDS', val: '50', type: 'INT', desc: 'EXP base ganada en duelo derrota' },
        { key: 'BASE_DUEL_STARSHIPS_WIN', cat: 'REWARDS', val: '150', type: 'INT', desc: 'Starships base ganados en duelo victoria' },
        { key: 'BASE_DUEL_STARSHIPS_LOSS', cat: 'REWARDS', val: '25', type: 'INT', desc: 'Starships base ganados en duelo derrota' },
        { key: 'NPC_COUNT_TOTAL', cat: 'ADVENTURE', val: '125', type: 'INT', desc: 'Cantidad total de NPCs disponibles en el modo Aventura' },
        { key: 'ADVENTURE_ERAS_TOTAL', cat: 'ADVENTURE', val: '12', type: 'INT', desc: 'Cantidad total de Eras en la Aventura' },
        { key: 'BOOSTER_PACK_COST_STARSHIPS', cat: 'SHOP', val: '500', type: 'INT', desc: 'Precio estándar de sobre de cartas en Starships' },
        { key: 'BOOSTER_PACK_CARDS_COUNT', cat: 'SHOP', val: '5', type: 'INT', desc: 'Cantidad de cartas obtenidas por cada sobre abierto' },
        { key: 'VIP_DEFAULT_EXP_BOOST', cat: 'VIP', val: '0.50', type: 'FLOAT', desc: 'Multiplicador de bonificación de EXP de membresía VIP (+50%)' },
        { key: 'VIP_DEFAULT_STARSHIPS_BOOST', cat: 'VIP', val: '0.50', type: 'FLOAT', desc: 'Multiplicador de bonificación de Starships VIP (+50%)' },
        { key: 'VIP_DEFAULT_LUCK_BOOST', cat: 'VIP', val: '0.25', type: 'FLOAT', desc: 'Multiplicador de bonificación de Suerte VIP (+25%)' },
        { key: 'ECONOMY_CURRENCY_SYMBOL', cat: 'ECONOMY', val: '⭐', type: 'STRING', desc: 'Símbolo visual de la moneda principal del juego' },
        { key: 'ECONOMY_CURRENCY_NAME', cat: 'ECONOMY', val: 'Starships', type: 'STRING', desc: 'Nombre oficial de la moneda del juego' }
    ];

    for (const cfg of initialConfigs) {
        await pool.request()
            .input('key', sql.VarChar(100), cfg.key)
            .input('cat', sql.VarChar(50), cfg.cat)
            .input('val', sql.NVarChar(sql.MAX), cfg.val)
            .input('type', sql.VarChar(20), cfg.type)
            .input('desc', sql.NVarChar(255), cfg.desc)
            .query(`
                IF NOT EXISTS (SELECT 1 FROM dbo.GameConfigurations WHERE ConfigKey = @key)
                    INSERT INTO dbo.GameConfigurations (ConfigKey, ConfigCategory, ConfigValue, DataType, Description, UpdatedAt)
                    VALUES (@key, @cat, @val, @type, @desc, GETDATE())
                ELSE
                    UPDATE dbo.GameConfigurations
                    SET ConfigCategory = @cat,
                        DataType = @type,
                        Description = @desc,
                        UpdatedAt = GETDATE()
                    WHERE ConfigKey = @key;
            `);
    }

    // =========================================================================
    // CREACIÓN / ACTUALIZACIÓN DE PROCEDIMIENTOS ALMACENADOS EMPRESARIALES
    // =========================================================================
    console.log('[PROCEDIMIENTOS] Compilando procedimientos almacenados oficiales...');

    // 1. sp_ObtenerCatalogoAventura
    await pool.request().query(`
        CREATE OR ALTER PROCEDURE dbo.sp_ObtenerCatalogoAventura
        AS
        BEGIN
            SET NOCOUNT ON;
            
            -- Resultset 1: Eras
            SELECT Id, Code, Series, Title, Subtitle, DescText AS [desc], Icon, BgTheme, LevelRange, AssignedPack
            FROM dbo.AdventureEras
            ORDER BY Id ASC;

            -- Resultset 2: NPCs
            SELECT n.Id, n.EraId, n.Name, n.Level, n.AvatarCode AS avatar, n.PortraitCode AS portrait,
                   n.LocationName, n.LocX, n.LocY, n.IsBoss, n.DeckTheme, n.KeyCards, n.Quote,
                   n.AssignedPack, n.Difficulty, n.AiLevel, n.ExpReward, n.StarshipsReward
            FROM dbo.NPCs n
            ORDER BY n.Id ASC;

            -- Resultset 3: Medallas
            SELECT m.Id, m.MedalCode AS id, m.NpcId, m.EraId, m.Name, m.Icon, m.DescText AS [desc],
                   m.BoosterType, m.BoosterValue, m.Requirement
            FROM dbo.AdventureMedals m
            ORDER BY m.NpcId ASC;
        END;
    `);
    console.log(' -> sp_ObtenerCatalogoAventura compilado.');

    // 2. sp_ObtenerDeckNpc
    await pool.request().query(`
        CREATE OR ALTER PROCEDURE dbo.sp_ObtenerDeckNpc
            @NpcId INT
        AS
        BEGIN
            SET NOCOUNT ON;

            -- Resultset 1: NPC Header Info
            SELECT n.Id, n.EraId, n.Name, n.Level, n.AvatarCode, n.PortraitCode,
                   n.LocationName, n.LocX, n.LocY, n.IsBoss, n.DeckTheme, n.KeyCards, n.Quote,
                   n.AssignedPack, n.Difficulty, n.AiLevel, n.ExpReward, n.StarshipsReward
            FROM dbo.NPCs n
            WHERE n.Id = @NpcId;

            -- Resultset 2: Normalized Deck Cards
            SELECT c.Id, c.NpcId, c.CardCode, c.CardName, c.Section, c.Quantity, c.SlotOrder
            FROM dbo.NpcDeckCards c
            WHERE c.NpcId = @NpcId
            ORDER BY c.Section ASC, c.SlotOrder ASC;
        END;
    `);
    console.log(' -> sp_ObtenerDeckNpc compilado.');

    // 3. sp_ObtenerMedallasUsuario
    await pool.request().query(`
        CREATE OR ALTER PROCEDURE dbo.sp_ObtenerMedallasUsuario
            @UserId INT
        AS
        BEGIN
            SET NOCOUNT ON;

            -- 1. Resumen de Multiplicadores Acumulados
            SELECT 
                ISNULL(SUM(CASE WHEN m.BoosterType = 'exp' THEN m.BoosterValue ELSE 0 END), 0) AS TotalExpBonus,
                ISNULL(SUM(CASE WHEN m.BoosterType = 'starships' THEN m.BoosterValue ELSE 0 END), 0) AS TotalStarshipsBonus,
                ISNULL(SUM(CASE WHEN m.BoosterType = 'luck' THEN m.BoosterValue ELSE 0 END), 0) AS TotalLuckBonus,
                COUNT(um.MedalId) AS TotalUnlockedMedals
            FROM dbo.UserMedals um
            INNER JOIN dbo.AdventureMedals m ON um.MedalId = m.MedalCode
            WHERE um.UserId = @UserId;

            -- 2. Lista de Medallas Desbloqueadas
            SELECT m.MedalCode AS id, m.NpcId, m.EraId, m.Name, m.Icon, m.DescText AS [desc],
                   m.BoosterType, m.BoosterValue, um.UnlockedAt
            FROM dbo.UserMedals um
            INNER JOIN dbo.AdventureMedals m ON um.MedalId = m.MedalCode
            WHERE um.UserId = @UserId
            ORDER BY m.NpcId ASC;
        END;
    `);
    console.log(' -> sp_ObtenerMedallasUsuario compilado.');

    // 4. sp_RegistrarVictoriaNpc
    await pool.request().query(`
        CREATE OR ALTER PROCEDURE dbo.sp_RegistrarVictoriaNpc
            @UserId INT,
            @NpcId INT,
            @Turns INT = 10,
            @IsWinner BIT = 1
        AS
        BEGIN
            SET NOCOUNT ON;
            SET XACT_ABORT ON;

            BEGIN TRY
                BEGIN TRANSACTION;

                DECLARE @IsFirstTimeWin BIT = 0;
                DECLARE @CurrentWins INT = 0;
                DECLARE @CurrentBestTurns INT = 999;
                DECLARE @TurnsVal INT = ISNULL(@Turns, 10);
                IF @TurnsVal <= 0 SET @TurnsVal = 10;

                -- 1. Actualizar Récord de Duelos del NPC
                SELECT @CurrentWins = Wins, @CurrentBestTurns = BestTurns
                FROM dbo.UserNpcRecords WITH (UPDLOCK)
                WHERE UserId = @UserId AND NpcId = @NpcId;

                IF @@ROWCOUNT = 0
                BEGIN
                    IF @IsWinner = 1 SET @IsFirstTimeWin = 1;
                    INSERT INTO dbo.UserNpcRecords (UserId, NpcId, Wins, Losses, BestTurns, LastDefeatedAt)
                    VALUES (@UserId, @NpcId, CASE WHEN @IsWinner = 1 THEN 1 ELSE 0 END, 
                                             CASE WHEN @IsWinner = 1 THEN 0 ELSE 1 END,
                                             CASE WHEN @IsWinner = 1 THEN @TurnsVal ELSE 999 END,
                                             CASE WHEN @IsWinner = 1 THEN GETDATE() ELSE NULL END);
                END
                ELSE
                BEGIN
                    IF @IsWinner = 1 AND @CurrentWins = 0 SET @IsFirstTimeWin = 1;
                    DECLARE @NewBestTurns INT = CASE WHEN @IsWinner = 1 AND @TurnsVal < @CurrentBestTurns THEN @TurnsVal ELSE @CurrentBestTurns END;

                    UPDATE dbo.UserNpcRecords
                    SET Wins = Wins + (CASE WHEN @IsWinner = 1 THEN 1 ELSE 0 END),
                        Losses = Losses + (CASE WHEN @IsWinner = 1 THEN 0 ELSE 1 END),
                        BestTurns = @NewBestTurns,
                        LastDefeatedAt = CASE WHEN @IsWinner = 1 THEN GETDATE() ELSE LastDefeatedAt END
                    WHERE UserId = @UserId AND NpcId = @NpcId;
                END

                -- 2. Desbloquear Medalla si es Victoria
                DECLARE @MedalCode VARCHAR(50) = NULL;
                DECLARE @MedalName NVARCHAR(150) = NULL;
                DECLARE @MedalUnlocked BIT = 0;

                IF @IsWinner = 1
                BEGIN
                    SELECT @MedalCode = MedalCode, @MedalName = Name
                    FROM dbo.AdventureMedals
                    WHERE NpcId = @NpcId;

                    IF @MedalCode IS NOT NULL
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM dbo.UserMedals WHERE UserId = @UserId AND MedalId = @MedalCode)
                        BEGIN
                            INSERT INTO dbo.UserMedals (UserId, MedalId, UnlockedAt)
                            VALUES (@UserId, @MedalCode, GETDATE());
                            SET @MedalUnlocked = 1;
                        END
                    END
                END

                -- 3. Progreso Máximo Desbloqueado
                DECLARE @CurrentMaxUnlocked INT = 1;
                DECLARE @NewMaxUnlocked INT = 1;
                DECLARE @IsNewNpcUnlocked BIT = 0;

                SELECT @CurrentMaxUnlocked = MaxNpcUnlocked
                FROM dbo.UserAdventureProgress WITH (UPDLOCK)
                WHERE UserId = @UserId;

                IF @@ROWCOUNT = 0
                BEGIN
                    SET @CurrentMaxUnlocked = 1;
                    INSERT INTO dbo.UserAdventureProgress (UserId, MaxNpcUnlocked, UpdatedAt)
                    VALUES (@UserId, 1, GETDATE());
                END

                IF @IsWinner = 1 AND @NpcId >= @CurrentMaxUnlocked AND @NpcId < 125
                BEGIN
                    SET @NewMaxUnlocked = @NpcId + 1;
                    SET @IsNewNpcUnlocked = 1;
                    UPDATE dbo.UserAdventureProgress
                    SET MaxNpcUnlocked = @NewMaxUnlocked,
                        UpdatedAt = GETDATE()
                    WHERE UserId = @UserId;
                END
                ELSE
                BEGIN
                    SET @NewMaxUnlocked = @CurrentMaxUnlocked;
                END

                COMMIT TRANSACTION;

                SELECT 1 AS Success,
                       @IsWinner AS IsWinner,
                       @IsFirstTimeWin AS IsFirstTimeWin,
                       @MedalUnlocked AS MedalUnlocked,
                       @MedalCode AS UnlockedMedalCode,
                       @MedalName AS UnlockedMedalName,
                       @IsNewNpcUnlocked AS IsNewNpcUnlocked,
                       @NewMaxUnlocked AS MaxNpcUnlocked;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
            END CATCH
        END;
    `);
    console.log(' -> sp_RegistrarVictoriaNpc compilado.');

    // 5. sp_ObtenerCatalogoAvatares
    await pool.request().query(`
        CREATE OR ALTER PROCEDURE dbo.sp_ObtenerCatalogoAvatares
            @UserId INT = NULL
        AS
        BEGIN
            SET NOCOUNT ON;

            SELECT 
                c.Id,
                c.Code,
                c.Name,
                c.ImageUrl,
                c.ExpBoost,
                c.StarshipsBoost,
                c.LuckBoost,
                c.Currency,
                c.PriceStarships,
                c.PriceUsd,
                c.OfferText,
                c.IsVipOnly,
                c.IsActive,
                CASE WHEN ua.Id IS NOT NULL THEN 1 ELSE 0 END AS IsOwned,
                CASE WHEN ua.IsActive = 1 THEN 1 ELSE 0 END AS IsCurrentActive
            FROM dbo.AvatarsCatalog c
            LEFT JOIN dbo.UserAvatars ua ON c.Code = ua.AvatarCode AND ua.UserId = @UserId
            WHERE c.IsActive = 1
            ORDER BY c.Id ASC;
        END;
    `);
    console.log(' -> sp_ObtenerCatalogoAvatares compilado.');

    // 6. sp_ObtenerAvataresUsuario
    await pool.request().query(`
        CREATE OR ALTER PROCEDURE dbo.sp_ObtenerAvataresUsuario
            @UserId INT
        AS
        BEGIN
            SET NOCOUNT ON;

            -- Resultset 1: Avatares adquiridos por el usuario con estadísticas totales
            SELECT 
                ua.Id,
                ua.UserId,
                ua.AvatarCode,
                c.Name,
                c.ImageUrl,
                ua.ExpBoost,
                ua.StarshipsBoost,
                ua.LuckBoost,
                ua.IsActive,
                ua.AcquiredAt
            FROM dbo.UserAvatars ua
            LEFT JOIN dbo.AvatarsCatalog c ON ua.AvatarCode = c.Code
            WHERE ua.UserId = @UserId
            ORDER BY ua.AcquiredAt DESC;

            -- Resultset 2: Potenciadores aplicados por avatar
            SELECT 
                p.Id,
                p.UserId,
                p.AvatarCode,
                p.PotenciadorCode,
                p.PotenciadorName,
                p.BoostType,
                p.BoostValue,
                p.AppliedAt
            FROM dbo.UserAvatarPotenciadores p
            WHERE p.UserId = @UserId
            ORDER BY p.AppliedAt DESC;
        END;
    `);
    console.log(' -> sp_ObtenerAvataresUsuario compilado.');

    // 7. sp_AplicarPotenciadorAvatar
    await pool.request().query(`
        CREATE OR ALTER PROCEDURE dbo.sp_AplicarPotenciadorAvatar
            @UserId INT,
            @AvatarCode VARCHAR(50),
            @PotenciadorCode VARCHAR(50)
        AS
        BEGIN
            SET NOCOUNT ON;
            SET XACT_ABORT ON;

            BEGIN TRY
                BEGIN TRANSACTION;

                -- 1. Validar que el usuario posea el avatar
                DECLARE @UserAvatarId INT = NULL;
                DECLARE @CurrentExpBoost DECIMAL(10,4) = 0;
                DECLARE @CurrentStarshipsBoost DECIMAL(10,4) = 0;
                DECLARE @CurrentLuckBoost DECIMAL(10,4) = 0;

                SELECT @UserAvatarId = Id,
                       @CurrentExpBoost = ISNULL(ExpBoost, 0),
                       @CurrentStarshipsBoost = ISNULL(StarshipsBoost, 0),
                       @CurrentLuckBoost = ISNULL(LuckBoost, 0)
                FROM dbo.UserAvatars WITH (UPDLOCK)
                WHERE UserId = @UserId AND AvatarCode = @AvatarCode;

                IF @UserAvatarId IS NULL
                BEGIN
                    ROLLBACK TRANSACTION;
                    SELECT 0 AS Success, 'No posees este avatar para aplicarle un potenciador.' AS Message;
                    RETURN;
                END

                -- 2. Validar potenciador en catálogo
                DECLARE @PotName NVARCHAR(150);
                DECLARE @PotType VARCHAR(50);
                DECLARE @BoostValue DECIMAL(10,4);
                DECLARE @CostStarships INT;

                SELECT @PotName = Name,
                       @PotType = UPPER(Type),
                       @BoostValue = ISNULL(BoostValue, 0),
                       @CostStarships = ISNULL(PriceStarships, 0)
                FROM dbo.PotenciadoresCatalog
                WHERE Code = @PotenciadorCode AND IsActive = 1;

                IF @PotName IS NULL
                BEGIN
                    ROLLBACK TRANSACTION;
                    SELECT 0 AS Success, 'El potenciador especificado no existe o no está activo.' AS Message;
                    RETURN;
                END

                -- 3. Validar y descontar saldo de Starships
                DECLARE @CurrentStarships INT = 0;
                SELECT @CurrentStarships = Starships
                FROM dbo.Usuarios WITH (UPDLOCK)
                WHERE Id = @UserId;

                IF @CurrentStarships < @CostStarships
                BEGIN
                    ROLLBACK TRANSACTION;
                    SELECT 0 AS Success, 'Saldo insuficiente de Starships para adquirir este potenciador.' AS Message;
                    RETURN;
                END

                IF @CostStarships > 0
                BEGIN
                    UPDATE dbo.Usuarios
                    SET Starships = Starships - @CostStarships
                    WHERE Id = @UserId;

                    -- Registrar transacción
                    INSERT INTO dbo.StarshipTransactions (UserId, Amount, TransactionType, Description, CreatedAt)
                    VALUES (@UserId, -@CostStarships, 'BOOSTER_AVATAR', 'Potenciador ' + @PotName + ' aplicado a avatar ' + @AvatarCode, GETDATE());
                END

                -- 4. Insertar en tabla hija de detalle dbo.UserAvatarPotenciadores
                INSERT INTO dbo.UserAvatarPotenciadores (UserId, AvatarCode, PotenciadorCode, PotenciadorName, BoostType, BoostValue, AppliedAt)
                VALUES (@UserId, @AvatarCode, @PotenciadorCode, @PotName, @PotType, @BoostValue, GETDATE());

                -- 5. Actualizar estadísticas acumuladas en dbo.UserAvatars
                IF @PotType = 'EXP'
                    SET @CurrentExpBoost = @CurrentExpBoost + @BoostValue;
                ELSE IF @PotType = 'STARSHIPS'
                    SET @CurrentStarshipsBoost = @CurrentStarshipsBoost + @BoostValue;
                ELSE IF @PotType = 'LUCK' OR @PotType = 'SUERTE'
                    SET @CurrentLuckBoost = @CurrentLuckBoost + @BoostValue;

                UPDATE dbo.UserAvatars
                SET ExpBoost = @CurrentExpBoost,
                    StarshipsBoost = @CurrentStarshipsBoost,
                    LuckBoost = @CurrentLuckBoost
                WHERE Id = @UserAvatarId;

                -- Obtener saldo actualizado
                DECLARE @NewStarships INT;
                SELECT @NewStarships = Starships FROM dbo.Usuarios WHERE Id = @UserId;

                COMMIT TRANSACTION;

                SELECT 1 AS Success,
                       'Potenciador ' + @PotName + ' aplicado con éxito al avatar.' AS Message,
                       @AvatarCode AS AvatarCode,
                       @CurrentExpBoost AS ExpBoost,
                       @CurrentStarshipsBoost AS StarshipsBoost,
                       @CurrentLuckBoost AS LuckBoost,
                       @NewStarships AS NewStarshipsBalance;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
            END CATCH
        END;
    `);
    console.log(' -> sp_AplicarPotenciadorAvatar compilado.');

    // 8. sp_ObtenerConfiguracionesJuego
    await pool.request().query(`
        CREATE OR ALTER PROCEDURE dbo.sp_ObtenerConfiguracionesJuego
            @Category VARCHAR(50) = NULL
        AS
        BEGIN
            SET NOCOUNT ON;
            SELECT ConfigKey, ConfigCategory, ConfigValue, DataType, Description, UpdatedAt
            FROM dbo.GameConfigurations
            WHERE @Category IS NULL OR ConfigCategory = @Category
            ORDER BY ConfigCategory, ConfigKey;
        END;
    `);
    console.log(' -> sp_ObtenerConfiguracionesJuego compilado.');

    // 9. sp_GuardarConfiguracionJuego
    await pool.request().query(`
        CREATE OR ALTER PROCEDURE dbo.sp_GuardarConfiguracionJuego
            @ConfigKey VARCHAR(100),
            @ConfigValue NVARCHAR(MAX),
            @Category VARCHAR(50) = 'GENERAL',
            @DataType VARCHAR(20) = 'STRING',
            @Description NVARCHAR(255) = NULL
        AS
        BEGIN
            SET NOCOUNT ON;
            MERGE dbo.GameConfigurations AS target
            USING (SELECT @ConfigKey AS ConfigKey) AS source
            ON target.ConfigKey = source.ConfigKey
            WHEN MATCHED THEN
                UPDATE SET
                    ConfigValue = @ConfigValue,
                    ConfigCategory = ISNULL(@Category, target.ConfigCategory),
                    DataType = ISNULL(@DataType, target.DataType),
                    Description = ISNULL(@Description, target.Description),
                    UpdatedAt = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (ConfigKey, ConfigCategory, ConfigValue, DataType, Description, UpdatedAt)
                VALUES (@ConfigKey, @Category, @ConfigValue, @DataType, @Description, GETDATE());

            SELECT 1 AS Success, 'Configuración actualizada con éxito.' AS Message;
        END;
    `);
    console.log(' -> sp_GuardarConfiguracionJuego compilado.');

    console.log('[MIGRATION] === ¡REESTRUCTURACIÓN COMPLETA FINALIZADA CON ÉXITO! ===');
    process.exit(0);
}

runEnterpriseMigration().catch(err => {
    console.error('[MIGRATION FATAL ERROR]', err);
    process.exit(1);
});
