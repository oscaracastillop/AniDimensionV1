/**
 * ============================================================================
 * ANI-DIMENSION: RECONSTRUCCIÓN Y MIGRACIÓN CANÓNICA DE AVENTURA (223 DUELISTAS)
 * - 12 Eras Oficiales del Anime (DM: 1-7, GX: 8-10, 5D's: 11-12)
 * - 223 Duelistas Legendarios Canónicos Oficiales con ubicaciones y mapas 100% fieles
 * - Era 4: Dirigible Kaiba (47-54) y Mundo Virtual de Noah (55-69)
 * - Era 6: Joey Wheeler (Garra de Hermos / ID 82) y todos los duelistas de Orichalcos
 * - Decks 100% canónicos de 40 cartas acordes al nivel de progreso
 * - Sin Kuriboh en Kaiba, Téa Lv 4 nivelada como novata
 * - Asignación estricta de sobres por era
 * - 223 Medallas con potenciadores permanentes (EXP, Starships y Suerte)
 * ============================================================================
 */
const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('../config/db');

async function rebuildCanonicalAdventure() {
    console.log('================================================================');
    console.log('🚀 INICIANDO RECONSTRUCCIÓN CANÓNICA DE AVENTURA (223 DUELISTAS)');
    console.log('================================================================');

    const pool = await getPool();

    // 1. Cargar datos maestros de 223 NPCs
    const npcsPath = path.join(__dirname, '..', 'data', 'all-223-canonical-npcs.json');
    if (!fs.existsSync(npcsPath)) {
        throw new Error('No se encontró el archivo maestro all-223-canonical-npcs.json');
    }
    const npcs = JSON.parse(fs.readFileSync(npcsPath, 'utf8'));
    console.log(`[1/6] Cargados ${npcs.length} NPCs canónicos.`);

    // 2. Definición oficial de las 12 Eras
    const ERAS = [
        { id: 1, code: 'ERA_01_DOMINO', series: 'Yu-Gi-Oh! Clásico', title: 'Inicios en Ciudad Domino', subtitle: 'Escuela Domino, Tienda de Juegos Kame y Coliseo Kaiba', desc: 'Los primeros duelos de Yugi y sus amigos con cartas básicas sin fusiones.', icon: '🏙️', bgTheme: 'era-bg-domino', levelRange: 'Nv. 4 - 20', assignedPack: 'LOB' },
        { id: 2, code: 'ERA_02_KINGDOM', series: 'Yu-Gi-Oh! Clásico', title: 'El Reino de los Duelistas', subtitle: 'La Isla Mística de Pegasus y Campos Elementales', desc: 'Torneo con campos temáticos de Océano, Bosque, Páramo, Montaña y el Castillo Toon.', icon: '🏰', bgTheme: 'era-bg-kingdom', levelRange: 'Nv. 21 - 40', assignedPack: 'MRD' },
        { id: 3, code: 'ERA_03_BATTLE_CITY', series: 'Yu-Gi-Oh! Clásico', title: 'Ciudad Batallas: Preliminares', subtitle: 'Muelles de Domino, Acuario y Cazadores Raros', desc: 'La invasión de los Ghouls de Marik y las cartas de Dioses Egipcios.', icon: '🏙️', bgTheme: 'era-bg-battlecity', levelRange: 'Nv. 44 - 60', assignedPack: 'MRL' },
        { id: 4, code: 'ERA_04_VIRTUAL', series: 'Yu-Gi-Oh! Clásico', title: 'Dirigible Kaiba & Mundo Virtual', subtitle: 'Ciberespacio de Noah y los Cinco Grandes', desc: 'Duelos con Maestros de Duelo en el Dirigible y la trampa digital en los cielos.', icon: '💾', bgTheme: 'era-bg-virtual', levelRange: 'Nv. 64 - 80', assignedPack: 'PSV' },
        { id: 5, code: 'ERA_05_TOWER', series: 'Yu-Gi-Oh! Clásico', title: 'Torre de Duelo KaibaCorp', subtitle: 'Finales de Ciudad Batallas en la Torre de Alcatraz', desc: 'La confrontación cumbre de Dioses Egipcios: Obelisco, Slifer y el Dragón Alado de Ra.', icon: '🗼', bgTheme: 'era-bg-tower', levelRange: 'Nv. 84 - 100', assignedPack: 'LON' },
        { id: 6, code: 'ERA_06_ORICHALCOS', series: 'Yu-Gi-Oh! Clásico', title: 'El Despertar del Orichalcos', subtitle: 'El Sello de Orichalcos y los Tres Dragones Legendarios', desc: 'La orden de Dartz y la captura de almas en el templo de Atlantis.', icon: '🔱', bgTheme: 'era-bg-orichalcos', levelRange: 'Nv. 104 - 120', assignedPack: 'LOD' },
        { id: 7, code: 'ERA_07_EGYPT', series: 'Yu-Gi-Oh! Clásico', title: 'Mundo de las Memorias & Antiguo Egipto', subtitle: 'Pirámides de Kulk Elna, Mahad y Zorc', desc: 'El viaje al pasado milenario del Faraón Atem y el duelo definitivo.', icon: '🏺', bgTheme: 'era-bg-egypt', levelRange: 'Nv. 124 - 140', assignedPack: 'PGD' },
        { id: 8, code: 'ERA_08_GX_ACADEMY', series: 'Yu-Gi-Oh! GX', title: 'Academia de Duelos: Año 1', subtitle: 'Dormitorio Slifer Rojo, Obelisco Azul y los 7 Jinetes', desc: 'La era de Jaden Yuki, Héroes Elementales y las Bestias Sagradas.', icon: '🎓', bgTheme: 'era-bg-academy', levelRange: 'Nv. 228 - 272', assignedPack: 'TLM' },
        { id: 9, code: 'ERA_09_GX_SOCIETY', series: 'Yu-Gi-Oh! GX', title: 'Sociedad de la Luz & Torneo GX', subtitle: 'Coliseo Blanco, Aster Phoenix y la Fuerza Arcana', desc: 'El duelo del destino con Héroes del Destino y el mazo del Tarot de Sartorius.', icon: '☀️', bgTheme: 'era-bg-society', levelRange: 'Nv. 275 - 325', assignedPack: 'EOJ' },
        { id: 10, code: 'ERA_10_GX_DARK', series: 'Yu-Gi-Oh! GX', title: 'Dimensión Oscura & El Rey Supremo', subtitle: 'Páramo Interdimensional, Haou y Yubel', desc: 'El poder destructivo de los Héroes Malvados y la batalla del alma.', icon: '🌌', bgTheme: 'era-bg-darkdim', levelRange: 'Nv. 328 - 375', assignedPack: 'STON' },
        { id: 11, code: 'ERA_11_5DS_DOMINO', series: "Yu-Gi-Oh! 5D's", title: 'Neo Domino & Portadores Oscuros', subtitle: 'Calles de Satélite, Copa Fortuna y Duelos Turbo', desc: 'Aceleración Synchro, Dragones Salvadores e Inmortales Terrestres.', icon: '🏍️', bgTheme: 'era-bg-5dsdomino', levelRange: 'Nv. 205 - 225', assignedPack: 'TDGS' },
        { id: 12, code: 'ERA_12_5DS_WRGP', series: "Yu-Gi-Oh! 5D's", title: 'Grand Prix WRGP & Abismo Z-ONE', subtitle: 'Autopistas Turbo Cósmicas y los Señores del Tiempo', desc: 'Delta Accel Synchro, Sephylon y el destino final de la humanidad.', icon: '⚡', bgTheme: 'era-bg-wrgp', levelRange: 'Nv. 230 - 250', assignedPack: 'CRMS' }
    ];

    // 3. Limpieza de tablas dependientes y reinicio de identities
    console.log('[2/6] Limpiando tablas dependientes y preparando esquemas...');
    await pool.request().query(`
        ALTER TABLE dbo.NpcDeckCards NOCHECK CONSTRAINT ALL;
        ALTER TABLE dbo.AdventureMedals NOCHECK CONSTRAINT ALL;

        DELETE FROM dbo.PackNpcAssignments;
        DBCC CHECKIDENT ('dbo.PackNpcAssignments', RESEED, 0);

        DELETE FROM dbo.AdventureMedals;
        DBCC CHECKIDENT ('dbo.AdventureMedals', RESEED, 0);

        DELETE FROM dbo.NpcDeckCards;
        DBCC CHECKIDENT ('dbo.NpcDeckCards', RESEED, 0);

        ALTER TABLE dbo.NpcDeckCards CHECK CONSTRAINT ALL;
        ALTER TABLE dbo.AdventureMedals CHECK CONSTRAINT ALL;
    `);

    // 4. Actualizar / Insertar 12 Eras en dbo.AdventureEras
    console.log('[3/6] Sincronizando las 12 Eras Oficiales en dbo.AdventureEras...');
    for (const era of ERAS) {
        await pool.request()
            .input('Id', sql.Int, era.id)
            .input('Code', sql.VarChar(50), era.code)
            .input('Series', sql.NVarChar(50), era.series)
            .input('Title', sql.NVarChar(100), era.title)
            .input('Subtitle', sql.NVarChar(200), era.subtitle)
            .input('DescText', sql.NVarChar(500), era.desc)
            .input('Icon', sql.VarChar(20), era.icon)
            .input('BgTheme', sql.VarChar(50), era.bgTheme)
            .input('LevelRange', sql.VarChar(50), era.levelRange)
            .input('AssignedPack', sql.VarChar(50), era.assignedPack)
            .query(`
                IF EXISTS (SELECT 1 FROM dbo.AdventureEras WHERE Id = @Id)
                BEGIN
                    UPDATE dbo.AdventureEras SET
                        Code = @Code, Series = @Series, Title = @Title, Subtitle = @Subtitle,
                        DescText = @DescText, Icon = @Icon, BgTheme = @BgTheme,
                        LevelRange = @LevelRange, AssignedPack = @AssignedPack
                    WHERE Id = @Id;
                END
                ELSE
                BEGIN
                    INSERT INTO dbo.AdventureEras (Id, Code, Series, Title, Subtitle, DescText, Icon, BgTheme, LevelRange, AssignedPack)
                    VALUES (@Id, @Code, @Series, @Title, @Subtitle, @DescText, @Icon, @BgTheme, @LevelRange, @AssignedPack);
                END
            `);
    }

    // 5. Insertar / Actualizar los 223 NPCs en dbo.NPCs y dbo.AdventureNpcs
    console.log('[4/6] Insertando los 223 duelistas en dbo.NPCs y dbo.AdventureNpcs...');
    for (const npc of npcs) {
        // A) dbo.NPCs
        await pool.request()
            .input('Id', sql.Int, npc.Id)
            .input('EraId', sql.Int, npc.EraId)
            .input('Name', sql.NVarChar(100), npc.Name)
            .input('Level', sql.Int, npc.Level)
            .input('AvatarCode', sql.VarChar(50), npc.AvatarCode)
            .input('PortraitCode', sql.VarChar(50), npc.PortraitCode)
            .input('LocationName', sql.NVarChar(150), npc.LocationName)
            .input('LocX', sql.Int, npc.LocX)
            .input('LocY', sql.Int, npc.LocY)
            .input('IsBoss', sql.Bit, npc.IsBoss ? 1 : 0)
            .input('DeckTheme', sql.NVarChar(150), npc.DeckTheme)
            .input('KeyCards', sql.NVarChar(250), npc.KeyCards)
            .input('Quote', sql.NVarChar(500), npc.Quote)
            .input('AssignedPack', sql.VarChar(50), npc.AssignedPack)
            .input('Difficulty', sql.NVarChar(50), npc.Difficulty)
            .input('AiLevel', sql.Int, npc.AiLevel || 1)
            .input('ExpReward', sql.Int, npc.Level * 25)
            .input('StarshipsReward', sql.Int, npc.Level * 15)
            .query(`
                IF EXISTS (SELECT 1 FROM dbo.NPCs WHERE Id = @Id)
                BEGIN
                    UPDATE dbo.NPCs SET
                        EraId = @EraId, Name = @Name, Level = @Level, AvatarCode = @AvatarCode,
                        PortraitCode = @PortraitCode, LocationName = @LocationName, LocX = @LocX,
                        LocY = @LocY, IsBoss = @IsBoss, DeckTheme = @DeckTheme, KeyCards = @KeyCards,
                        Quote = @Quote, AssignedPack = @AssignedPack, Difficulty = @Difficulty,
                        AiLevel = @AiLevel, ExpReward = @ExpReward, StarshipsReward = @StarshipsReward,
                        UpdatedAt = GETDATE()
                    WHERE Id = @Id;
                END
                ELSE
                BEGIN
                    INSERT INTO dbo.NPCs (Id, EraId, Name, Level, AvatarCode, PortraitCode, LocationName, LocX, LocY, IsBoss, DeckTheme, KeyCards, Quote, AssignedPack, Difficulty, AiLevel, ExpReward, StarshipsReward, CreatedAt, UpdatedAt)
                    VALUES (@Id, @EraId, @Name, @Level, @AvatarCode, @PortraitCode, @LocationName, @LocX, @LocY, @IsBoss, @DeckTheme, @KeyCards, @Quote, @AssignedPack, @Difficulty, @AiLevel, @ExpReward, @StarshipsReward, GETDATE(), GETDATE());
                END
            `);

        // B) dbo.AdventureNpcs
        await pool.request()
            .input('Id', sql.Int, npc.Id)
            .input('EraId', sql.Int, npc.EraId)
            .input('Name', sql.NVarChar(100), npc.Name)
            .input('Level', sql.Int, npc.Level)
            .input('AvatarCode', sql.VarChar(50), npc.AvatarCode)
            .input('PortraitCode', sql.VarChar(50), npc.PortraitCode)
            .input('LocationName', sql.NVarChar(150), npc.LocationName)
            .input('LocX', sql.Int, npc.LocX)
            .input('LocY', sql.Int, npc.LocY)
            .input('IsBoss', sql.Bit, npc.IsBoss ? 1 : 0)
            .input('DeckTheme', sql.NVarChar(150), npc.DeckTheme)
            .input('KeyCards', sql.NVarChar(250), npc.KeyCards)
            .input('Quote', sql.NVarChar(500), npc.Quote)
            .input('AssignedPack', sql.VarChar(50), npc.AssignedPack)
            .input('Difficulty', sql.NVarChar(50), npc.Difficulty)
            .input('AiLevel', sql.Int, npc.AiLevel || 1)
            .input('DeckJson', sql.NVarChar(sql.MAX), npc.DeckJson)
            .input('ExtraDeckJson', sql.NVarChar(sql.MAX), npc.ExtraDeckJson || '[]')
            .query(`
                IF EXISTS (SELECT 1 FROM dbo.AdventureNpcs WHERE Id = @Id)
                BEGIN
                    UPDATE dbo.AdventureNpcs SET
                        EraId = @EraId, Name = @Name, Level = @Level, AvatarCode = @AvatarCode,
                        PortraitCode = @PortraitCode, LocationName = @LocationName, LocX = @LocX,
                        LocY = @LocY, IsBoss = @IsBoss, DeckTheme = @DeckTheme, KeyCards = @KeyCards,
                        Quote = @Quote, AssignedPack = @AssignedPack, Difficulty = @Difficulty,
                        AiLevel = @AiLevel, DeckJson = @DeckJson, ExtraDeckJson = @ExtraDeckJson,
                        UpdatedAt = GETDATE()
                    WHERE Id = @Id;
                END
                ELSE
                BEGIN
                    INSERT INTO dbo.AdventureNpcs (Id, EraId, Name, Level, AvatarCode, PortraitCode, LocationName, LocX, LocY, IsBoss, DeckTheme, KeyCards, Quote, AssignedPack, Difficulty, AiLevel, DeckJson, ExtraDeckJson, UpdatedAt)
                    VALUES (@Id, @EraId, @Name, @Level, @AvatarCode, @PortraitCode, @LocationName, @LocX, @LocY, @IsBoss, @DeckTheme, @KeyCards, @Quote, @AssignedPack, @Difficulty, @AiLevel, @DeckJson, @ExtraDeckJson, GETDATE());
                END
            `);

        // C) dbo.PackNpcAssignments
        await pool.request()
            .input('PackId', sql.VarChar(20), npc.AssignedPack || 'LOB')
            .input('NpcId', sql.Int, npc.Id)
            .query(`INSERT INTO dbo.PackNpcAssignments (PackId, NpcId) VALUES (@PackId, @NpcId)`);

        // D) dbo.NpcDeckCards (Poblar las cartas del mazo individualmente en la tabla relacional)
        const mainCards = JSON.parse(npc.DeckJson || '[]');
        const extraCards = JSON.parse(npc.ExtraDeckJson || '[]');

        // Obtener nombres y tipos de cartas
        const cardIdsToLookup = [...new Set([...mainCards, ...extraCards])];
        const cardInfoMap = new Map();
        if (cardIdsToLookup.length > 0) {
            const cardInfoRes = await pool.request().query(`
                SELECT d.id, t.name, d.type 
                FROM dbo.datas d 
                JOIN dbo.texts t ON d.id = t.id 
                WHERE d.id IN (${cardIdsToLookup.join(',')})
            `);
            cardInfoRes.recordset.forEach(c => cardInfoMap.set(c.id, c));
        }

        // Agrupar por CardCode para Main
        const cardCounts = {};
        mainCards.forEach(cid => {
            cardCounts[cid] = (cardCounts[cid] || 0) + 1;
        });

        let slotOrder = 1;
        for (const [cardIdStr, count] of Object.entries(cardCounts)) {
            const cid = parseInt(cardIdStr, 10);
            const cinfo = cardInfoMap.get(cid) || { name: 'Carta', type: 17 };
            let cardTypeStr = 'Monster';
            if (cinfo.type & 0x2) cardTypeStr = 'Spell';
            else if (cinfo.type & 0x4) cardTypeStr = 'Trap';

            await pool.request()
                .input('NpcId', sql.Int, npc.Id)
                .input('CardCode', sql.BigInt, cid)
                .input('CardName', sql.NVarChar(150), cinfo.name)
                .input('CardType', sql.NVarChar(50), cardTypeStr)
                .input('Section', sql.NVarChar(20), 'Main')
                .input('Quantity', sql.Int, count)
                .input('SlotOrder', sql.Int, slotOrder++)
                .query(`
                    INSERT INTO dbo.NpcDeckCards (NpcId, CardCode, CardName, CardType, Section, Quantity, SlotOrder, CreatedAt)
                    VALUES (@NpcId, @CardCode, @CardName, @CardType, @Section, @Quantity, @SlotOrder, GETDATE())
                `);
        }

        const extraCounts = {};
        extraCards.forEach(cid => {
            extraCounts[cid] = (extraCounts[cid] || 0) + 1;
        });
        for (const [cardIdStr, count] of Object.entries(extraCounts)) {
            const cid = parseInt(cardIdStr, 10);
            const cinfo = cardInfoMap.get(cid) || { name: 'Fusión', type: 0x40 };
            let cardTypeStr = 'Fusion';
            if (cinfo.type & 0x2000) cardTypeStr = 'Synchro';

            await pool.request()
                .input('NpcId', sql.Int, npc.Id)
                .input('CardCode', sql.BigInt, cid)
                .input('CardName', sql.NVarChar(150), cinfo.name)
                .input('CardType', sql.NVarChar(50), cardTypeStr)
                .input('Section', sql.NVarChar(20), 'Extra')
                .input('Quantity', sql.Int, count)
                .input('SlotOrder', sql.Int, slotOrder++)
                .query(`
                    INSERT INTO dbo.NpcDeckCards (NpcId, CardCode, CardName, CardType, Section, Quantity, SlotOrder, CreatedAt)
                    VALUES (@NpcId, @CardCode, @CardName, @CardType, @Section, @Quantity, @SlotOrder, GETDATE())
                `);
        }
    }
    console.log(`✅ Los 223 NPCs registrados con sus mazos y asignaciones de sobres.`);

    // 6. Poblar las 223 Medallas y Calibrar Potenciadores
    console.log('[5/6] Generando y calibrando las 223 Medallas Oficiales...');
    const eraBossIds = new Set([6, 23, 40, 69, 73, 90, 107, 132, 159, 184, 202, 223]);
    const luckyKeywords = ['joey', 'jono', 'duke', 'tristan', 'carly', 'rex raptor', 'fortune', 'dice', 'dados', 'martha', 'taiyo'];

    let totalExpBoost = 0;
    let totalStarshipsBoost = 0;
    let totalLuckBoost = 0;

    for (const npc of npcs) {
        const medalCode = `MEDAL_${String(npc.Id).padStart(3, '0')}`;
        const nameLower = npc.Name.toLowerCase();
        let bType = 'exp';
        let bVal = 1.0;
        let badgeIcon = '🥉';

        if (eraBossIds.has(npc.Id)) {
            bType = 'starships';
            bVal = 2.5;
            badgeIcon = '👑';
            totalStarshipsBoost += bVal;
        } else if (npc.IsBoss || npc.Level >= 400 || nameLower.includes('supremo') || nameLower.includes('dios') || nameLower.includes('atem')) {
            bType = 'starships';
            bVal = 1.0;
            badgeIcon = '🥇';
            totalStarshipsBoost += bVal;
        } else if (luckyKeywords.some(k => nameLower.includes(k))) {
            bType = 'luck';
            bVal = 0.5;
            badgeIcon = '🍀';
            totalLuckBoost += bVal;
        } else {
            bType = 'exp';
            bVal = 1.0;
            badgeIcon = '⚡';
            totalExpBoost += bVal;
        }

        const medalName = `Medalla de ${npc.Name.replace(/[👑⭐]/g, '').trim()}`;
        const medalDesc = bType === 'exp' 
            ? `+${bVal}% de experiencia ganada en todos los modos por derrotar a ${npc.Name}.`
            : (bType === 'starships'
                ? `+${bVal}% de Starships ganadas en recompensas por derrotar a ${npc.Name}.`
                : `+${bVal}% de suerte en aperturas de sobres y drops raros por derrotar a ${npc.Name}.`);

        await pool.request()
            .input('MedalCode', sql.VarChar(50), medalCode)
            .input('NpcId', sql.Int, npc.Id)
            .input('EraId', sql.Int, npc.EraId)
            .input('Name', sql.NVarChar(100), medalName)
            .input('Icon', sql.NVarChar(50), badgeIcon)
            .input('DescText', sql.NVarChar(300), medalDesc)
            .input('BoosterType', sql.VarChar(20), bType)
            .input('BoosterValue', sql.Decimal(5, 2), bVal)
            .input('Requirement', sql.NVarChar(150), `Derrotar a ${npc.Name}`)
            .query(`
                INSERT INTO dbo.AdventureMedals (MedalCode, NpcId, EraId, Name, Icon, DescText, BoosterType, BoosterValue, Requirement, CreatedAt)
                VALUES (@MedalCode, @NpcId, @EraId, @Name, @Icon, @DescText, @BoosterType, @BoosterValue, @Requirement, GETDATE())
            `);
    }

    console.log(`✅ 223 Medallas calibradas e insertadas.`);
    console.log(`   📊 Resumen de Potenciadores al 100%:`);
    console.log(`      ⚡ EXP: +${totalExpBoost.toFixed(1)}%`);
    console.log(`      ⭐ Starships: +${totalStarshipsBoost.toFixed(1)}%`);
    console.log(`      🍀 Suerte: +${totalLuckBoost.toFixed(1)}%`);
    console.log(`      🔥 TOTAL BONIFICACIÓN: +${(totalExpBoost + totalStarshipsBoost + totalLuckBoost).toFixed(1)}%`);

    // 7. Recompilar Stored Procedures Oficiales
    console.log('[6/6] Actualizando Stored Procedures sp_ObtenerCatalogoAventura y sp_RegistrarVictoriaNpc...');
    await pool.request().query(`
        CREATE OR ALTER PROCEDURE dbo.sp_ObtenerCatalogoAventura
        AS
        BEGIN
            SET NOCOUNT ON;

            -- 1. Eras Oficiales
            SELECT Id, Code, Series, Title, Subtitle, DescText, Icon, BgTheme, LevelRange, AssignedPack
            FROM dbo.AdventureEras
            ORDER BY Id ASC;

            -- 2. NPCs Oficiales
            SELECT Id, EraId, Name, Level, AvatarCode, PortraitCode, LocationName, LocX, LocY,
                   IsBoss, DeckTheme, KeyCards, Quote, AssignedPack, Difficulty, AiLevel,
                   DeckJson, ExtraDeckJson
            FROM dbo.AdventureNpcs
            ORDER BY Id ASC;

            -- 3. Medallas Oficiales
            SELECT Id, MedalCode, NpcId, EraId, Name, Icon, DescText, BoosterType, BoosterValue, Requirement
            FROM dbo.AdventureMedals
            ORDER BY NpcId ASC;
        END;
    `);

    await pool.request().query(`
        CREATE OR ALTER PROCEDURE dbo.sp_RegistrarVictoriaNpc
            @UserId INT,
            @NpcId INT,
            @Turns INT,
            @MaxNpcUnlocked INT OUTPUT,
            @NewMedalUnlocked BIT OUTPUT,
            @ExpReward INT OUTPUT,
            @StarshipsReward INT OUTPUT
        AS
        BEGIN
            SET NOCOUNT ON;
            SET @NewMedalUnlocked = 0;

            -- Normalizar alias de sesión Admin si viniera como 999
            IF @UserId = 999
            BEGIN
                SELECT TOP 1 @UserId = Id FROM dbo.Usuarios WHERE IsAdmin = 1 OR Id = 1;
                IF @UserId IS NULL SET @UserId = 1;
            END

            -- Obtener recompensa del NPC
            SELECT 
                @ExpReward = ISNULL(ExpReward, Level * 25),
                @StarshipsReward = ISNULL(StarshipsReward, Level * 15)
            FROM dbo.NPCs WHERE Id = @NpcId;

            IF @ExpReward IS NULL SET @ExpReward = 50;
            IF @StarshipsReward IS NULL SET @StarshipsReward = 20;

            -- Desbloquear siguiente NPC hasta el límite canónico de 223
            DECLARE @CurrentMax INT = 1;
            SELECT @CurrentMax = MaxNpcUnlocked FROM dbo.UserAdventureProgress WHERE UserId = @UserId;

            IF @CurrentMax IS NULL
            BEGIN
                SET @MaxNpcUnlocked = CASE WHEN @NpcId + 1 > 223 THEN 223 ELSE @NpcId + 1 END;
                INSERT INTO dbo.UserAdventureProgress (UserId, MaxNpcUnlocked, UpdatedAt)
                VALUES (@UserId, @MaxNpcUnlocked, GETDATE());
            END
            ELSE
            BEGIN
                IF @NpcId >= @CurrentMax AND @CurrentMax < 223
                BEGIN
                    SET @MaxNpcUnlocked = @NpcId + 1;
                    IF @MaxNpcUnlocked > 223 SET @MaxNpcUnlocked = 223;
                    UPDATE dbo.UserAdventureProgress 
                    SET MaxNpcUnlocked = @MaxNpcUnlocked, UpdatedAt = GETDATE()
                    WHERE UserId = @UserId;
                END
                ELSE
                BEGIN
                    SET @MaxNpcUnlocked = @CurrentMax;
                END
            END

            -- Registrar récord de victoria
            IF EXISTS (SELECT 1 FROM dbo.UserNpcRecords WHERE UserId = @UserId AND NpcId = @NpcId)
            BEGIN
                UPDATE dbo.UserNpcRecords SET
                    Wins = Wins + 1,
                    BestTurns = CASE WHEN @Turns < BestTurns THEN @Turns ELSE BestTurns END,
                    LastDefeatedAt = GETDATE()
                WHERE UserId = @UserId AND NpcId = @NpcId;
            END
            ELSE
            BEGIN
                INSERT INTO dbo.UserNpcRecords (UserId, NpcId, Wins, Losses, BestTurns, LastDefeatedAt)
                VALUES (@UserId, @NpcId, 1, 0, @Turns, GETDATE());
            END

            -- Desbloquear Medalla si existe
            DECLARE @MedalCode VARCHAR(50);
            SELECT @MedalCode = MedalCode FROM dbo.AdventureMedals WHERE NpcId = @NpcId;

            IF @MedalCode IS NOT NULL
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM dbo.UserMedals WHERE UserId = @UserId AND MedalId = @MedalCode)
                BEGIN
                    INSERT INTO dbo.UserMedals (UserId, MedalId, UnlockedAt)
                    VALUES (@UserId, @MedalCode, GETDATE());
                    SET @NewMedalUnlocked = 1;
                END
            END
        END;
    `);

    console.log('✅ Stored Procedures actualizados con límite de 223 NPCs.');

    // 8. Limpiar base temporal
    try {
        await pool.request().query(`
            IF EXISTS (SELECT name FROM sys.databases WHERE name = 'AniDimensionDB_TempBackup')
            BEGIN
                ALTER DATABASE AniDimensionDB_TempBackup SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                DROP DATABASE AniDimensionDB_TempBackup;
            END
        `);
        console.log('🧹 Base temporal AniDimensionDB_TempBackup eliminada limpiamente.');
    } catch(e) {}

    return {
        totalNpcs: npcs.length,
        totalExpBoost,
        totalStarshipsBoost,
        totalLuckBoost,
        totalBoost: totalExpBoost + totalStarshipsBoost + totalLuckBoost
    };
}

if (require.main === module) {
    rebuildCanonicalAdventure()
        .then(res => {
            console.log('\n🎉 ¡MIGRACIÓN DE 223 DUELISTAS CANÓNICOS COMPLETADA CON ÉXITO!');
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ Error en migración:', err);
            process.exit(1);
        });
}

module.exports = { rebuildCanonicalAdventure };
