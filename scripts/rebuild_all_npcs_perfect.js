/**
 * ============================================================================
 * ANI-DIMENSION: RECONSTRUCCIÓN COMPLETA Y MINUCIOSA DE LOS 223 DUELISTAS
 * - Niveles progresivos y suaves desde Nivel 1 (Téa) hasta Nivel 300 (Z-one)
 * - Meticulosa reconstrucción de Decks y Extra Decks (Fusiones, Sincronías, Polimerización, Tuners)
 * - Sincronización 100% en base de datos SQL Server (dbo.AdventureEras, dbo.NPCs, dbo.AdventureNpcs, dbo.NpcDeckCards)
 * ============================================================================
 */
const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('../backend/config/db');

// Cargar catálogo Konami de 14,759 cartas
const cardIndex = JSON.parse(fs.readFileSync(path.join(__dirname, '../backend/data/cards_index.json'), 'utf8'));
const rawNpcs = JSON.parse(fs.readFileSync(path.join(__dirname, '../backend/data/all-223-canonical-npcs.json'), 'utf8'));

console.log(`Catálogo Konami cargado: ${Object.keys(cardIndex).length} cartas.`);
console.log(`NPCs a reconstruir: ${rawNpcs.length}.`);

// Helper para validar si una carta es del Extra Deck
function isExtraDeckCard(cardId) {
    const c = cardIndex[cardId];
    if (!c) return false;
    const type = c.type || 0;
    // 0x40 = Fusion, 0x2000 = Synchro, 0x800000 = Xyz, 0x4000000 = Link
    return !!((type & 0x40) || (type & 0x2000) || (type & 0x800000) || (type & 0x4000000));
}

function isFusionCard(cardId) {
    const c = cardIndex[cardId];
    return c ? !!((c.type || 0) & 0x40) : false;
}

function isSynchroCard(cardId) {
    const c = cardIndex[cardId];
    return c ? !!((c.type || 0) & 0x2000) : false;
}

// 1. DEFINICIÓN DE ERAS Y SUS NIVELES CALIBRADOS (1 A 300)
const ERAS_CONFIG = [
    { id: 1, minLvl: 1, maxLvl: 10, range: 'Nv. 1 - 10', assignedPack: 'LOB', title: 'Inicios en Ciudad Domino', subtitle: 'Escuela Domino, Tienda de Juegos Kame y Coliseo Kaiba', code: 'ERA_01_DOMINO', series: 'Yu-Gi-Oh! Clásico', icon: '🏙️', bgTheme: 'era-bg-domino', desc: 'Los primeros duelos de Yugi y sus amigos con cartas básicas sin fusiones.' },
    { id: 2, minLvl: 11, maxLvl: 35, range: 'Nv. 11 - 35', assignedPack: 'MRD', title: 'El Reino de los Duelistas', subtitle: 'La Isla Mística de Pegasus y Campos Elementales', code: 'ERA_02_KINGDOM', series: 'Yu-Gi-Oh! Clásico', icon: '🏰', bgTheme: 'era-bg-kingdom', desc: 'Torneo con campos temáticos de Océano, Bosque, Páramo, Montaña y el Castillo Toon.' },
    { id: 3, minLvl: 36, maxLvl: 65, range: 'Nv. 36 - 65', assignedPack: 'MRL', title: 'Ciudad Batallas: Preliminares', subtitle: 'Muelles de Domino, Acuario y Cazadores Raros', code: 'ERA_03_BATTLE_CITY', series: 'Yu-Gi-Oh! Clásico', icon: '🏙️', bgTheme: 'era-bg-battlecity', desc: 'La invasión de los Ghouls de Marik y las cartas de Dioses Egipcios.' },
    { id: 4, minLvl: 66, maxLvl: 95, range: 'Nv. 66 - 95', assignedPack: 'PSV', title: 'Dirigible Kaiba & Mundo Virtual', subtitle: 'Ciberespacio de Noah y los Cinco Grandes', code: 'ERA_04_VIRTUAL', series: 'Yu-Gi-Oh! Clásico', icon: '💾', bgTheme: 'era-bg-virtual', desc: 'Duelos con Maestros de Duelo en el Dirigible y la trampa digital en los cielos.' },
    { id: 5, minLvl: 96, maxLvl: 110, range: 'Nv. 96 - 110', assignedPack: 'LON', title: 'Torre de Duelo KaibaCorp', subtitle: 'Finales de Ciudad Batallas en la Torre de Alcatraz', code: 'ERA_05_TOWER', series: 'Yu-Gi-Oh! Clásico', icon: '🗼', bgTheme: 'era-bg-tower', desc: 'La confrontación cumbre de Dioses Egipcios: Obelisco, Slifer y el Dragón Alado de Ra.' },
    { id: 6, minLvl: 111, maxLvl: 135, range: 'Nv. 111 - 135', assignedPack: 'LOD', title: 'El Despertar del Orichalcos', subtitle: 'El Sello de Orichalcos y los Tres Dragones Legendarios', code: 'ERA_06_ORICHALCOS', series: 'Yu-Gi-Oh! Clásico', icon: '🔱', bgTheme: 'era-bg-orichalcos', desc: 'La orden de Dartz y la captura de almas en el templo de Atlantis.' },
    { id: 7, minLvl: 136, maxLvl: 160, range: 'Nv. 136 - 160', assignedPack: 'PGD', title: 'Mundo de las Memorias & Antiguo Egipto', subtitle: 'Pirámides de Kulk Elna, Mahad y Zorc', code: 'ERA_07_EGYPT', series: 'Yu-Gi-Oh! Clásico', icon: '🏺', bgTheme: 'era-bg-egypt', desc: 'El viaje al pasado milenario del Faraón Atem y el duelo definitivo.' },
    { id: 8, minLvl: 161, maxLvl: 195, range: 'Nv. 161 - 195', assignedPack: 'TLM', title: 'Academia de Duelos: Año 1', subtitle: 'Dormitorio Slifer Rojo, Obelisco Azul y los 7 Jinetes', code: 'ERA_08_GX_ACADEMY', series: 'Yu-Gi-Oh! GX', icon: '🎓', bgTheme: 'era-bg-academy', desc: 'La era de Jaden Yuki, Héroes Elementales y las Bestias Sagradas.' },
    { id: 9, minLvl: 196, maxLvl: 225, range: 'Nv. 196 - 225', assignedPack: 'EOJ', title: 'Sociedad de la Luz & Torneo GX', subtitle: 'Coliseo Blanco, Aster Phoenix y la Fuerza Arcana', code: 'ERA_09_GX_SOCIETY', series: 'Yu-Gi-Oh! GX', icon: '☀️', bgTheme: 'era-bg-society', desc: 'El duelo del destino con Héroes del Destino y el mazo del Tarot de Sartorius.' },
    { id: 10, minLvl: 226, maxLvl: 255, range: 'Nv. 226 - 255', assignedPack: 'STON', title: 'Dimensión Oscura & El Rey Supremo', subtitle: 'Páramo Interdimensional, Haou y Yubel', code: 'ERA_10_GX_DARK', series: 'Yu-Gi-Oh! GX', icon: '🌌', bgTheme: 'era-bg-darkdim', desc: 'El poder destructivo de los Héroes Malvados y la batalla del alma.' },
    { id: 11, minLvl: 256, maxLvl: 280, range: 'Nv. 256 - 280', assignedPack: 'TDGS', title: 'Neo Domino & Portadores Oscuros', subtitle: 'Calles de Satélite, Copa Fortuna y Duelos Turbo', code: 'ERA_11_5DS_DOMINO', series: "Yu-Gi-Oh! 5D's", icon: '🏍️', bgTheme: 'era-bg-5dsdomino', desc: 'Aceleración Synchro, Dragones Salvadores e Inmortales Terrestres.' },
    { id: 12, minLvl: 281, maxLvl: 300, range: 'Nv. 281 - 300', assignedPack: 'CRMS', title: 'Grand Prix WRGP & Abismo Z-ONE', subtitle: 'Autopistas Turbo Cósmicas y los Señores del Tiempo', code: 'ERA_12_5DS_WRGP', series: "Yu-Gi-Oh! 5D's", icon: '⚡', bgTheme: 'era-bg-wrgp', desc: 'Delta Accel Synchro, Sephylon y el destino final de la humanidad.' }
];

// Mapeo por Era
const eraNpcMap = new Map();
rawNpcs.forEach(n => {
    if (!eraNpcMap.has(n.EraId)) eraNpcMap.set(n.EraId, []);
    eraNpcMap.get(n.EraId).push(n);
});

// 2. CALIBRACIÓN DE NIVELES SUAVES Y SIN BACHES
const updatedNpcs = [];

ERAS_CONFIG.forEach(eraCfg => {
    const npcsInEra = eraNpcMap.get(eraCfg.id) || [];
    const count = npcsInEra.length;
    if (count === 0) return;

    npcsInEra.forEach((npc, idx) => {
        let assignedLvl;
        if (count === 1) {
            assignedLvl = eraCfg.maxLvl;
        } else if (idx === 0) {
            assignedLvl = eraCfg.minLvl;
        } else if (idx === count - 1) {
            assignedLvl = eraCfg.maxLvl;
        } else {
            const step = (eraCfg.maxLvl - eraCfg.minLvl) / (count - 1);
            assignedLvl = Math.round(eraCfg.minLvl + idx * step);
        }

        // Garantizar estrictamente orden no-decreciente
        const prevNpc = updatedNpcs[updatedNpcs.length - 1];
        if (prevNpc && assignedLvl < prevNpc.Level) {
            assignedLvl = prevNpc.Level;
        }

        npc.Level = assignedLvl;
        updatedNpcs.push(npc);
    });
});

console.log(`Niveles re-calibrados: NPC #1 = Nv ${updatedNpcs[0].Level}, NPC #223 = Nv ${updatedNpcs[updatedNpcs.length - 1].Level}.`);

// 3. CARTAS CANÓNICAS OFICIALES POR ARQUETIPO (IDs VERIFICADOS EN CARDS_INDEX)
const POLYMERIZATION_ID = 24094653;
const DARK_FUSION_ID = 94820406;
const POWER_BOND_ID = 37630732;
const MIRACLE_FUSION_ID = 45906428;

// MAPA DE CONEXIÓN ARQUETÍPICA CANÓNICA PARA EXTRA DECKS Y SUS CARTAS OBLIGATORIAS EN MAIN DECK
const ARCHETYPE_EXTRA_CONFIG = {
    // KAIBA (Blue-Eyes)
    'KAIBA': {
        extra: [23997592, 91998119, 2111707], // Blue-Eyes Ultimate Dragon, XYZ Dragon Cannon, XZ Tank Cannon
        mainRequired: [89631139, 89631139, 89631139, POLYMERIZATION_ID, POLYMERIZATION_ID, 5053103, 14898066, 97590748, 17985575, 43973174]
    },
    // JOEY WHEELER (Flame Swordsman, Thousand Dragon, Alligator Dragon)
    'JOEY': {
        extra: [45231177, 41462024, 3336415, 51828629], // Flame Swordsman, Thousand Dragon, Alligator's Sword Dragon, Giltia
        mainRequired: [88819587, 88819587, 71625222, 71625222, 64428736, 64428736, 74677422, 423585, POLYMERIZATION_ID, POLYMERIZATION_ID]
    },
    // YUGI / ATEM (Gaia Dragon Champion, Chimera, Dark Paladin, Black Skull)
    'YUGI': {
        extra: [66889139, 4796100, 98502113, 6150044, 11901678], // Gaia Champion, Chimera, Dark Paladin, Arcana Joker, Black Skull
        mainRequired: [46986414, 46986414, 38033121, 78193831, 5818798, 77207191, 6368038, 28279543, POLYMERIZATION_ID, POLYMERIZATION_ID]
    },
    // PEGASUS (Thousand-Eyes Restrict)
    'PEGASUS': {
        extra: [63519819, 63519819], // Thousand-Eyes Restrict
        mainRequired: [64631466, 41426869, 27125110, 27125110, POLYMERIZATION_ID, POLYMERIZATION_ID]
    },
    // JADEN YUKI (Elemental HEROes)
    'JADEN': {
        extra: [35809262, 25366484, 61204971, 83121692, 10526791, 47737087, 1918087], // Flame Wingman, Shining Flare, Thunder Giant, Tempest, Wildedge, Rampart, Mariner
        mainRequired: [84327329, 84327329, 5893261, 5893261, 20721928, 20721928, 79979666, 86188410, POLYMERIZATION_ID, POLYMERIZATION_ID, POLYMERIZATION_ID, MIRACLE_FUSION_ID]
    },
    // ZANE TRUESDALE (Cyber Dragons)
    'ZANE': {
        extra: [1546123, 74157028, 9062329, 40418351], // Cyber End Dragon, Cyber Twin Dragon, Chimeratech Overdragon, Cyberdark Dragon
        mainRequired: [70095154, 70095154, 70095154, 26439287, 26439287, POLYMERIZATION_ID, POLYMERIZATION_ID, POLYMERIZATION_ID, POWER_BOND_ID, POWER_BOND_ID]
    },
    // CHAZZ PRINCETON (Ojamas & VWXYZ)
    'CHAZZ': {
        extra: [90140980, 40391316, 58859575], // Ojama King, Ojama Knight, VWXYZ Dragon Catapult Cannon
        mainRequired: [42941100, 42941100, 1248895, 1248895, 79335209, 79335209, POLYMERIZATION_ID, POLYMERIZATION_ID, POLYMERIZATION_ID]
    },
    // ALEXIS RHODES (Cyber Blader)
    'ALEXIS': {
        extra: [10248389, 10248389], // Cyber Blader
        mainRequired: [11460577, 11460577, 11460577, 97023549, 97023549, 97023549, POLYMERIZATION_ID, POLYMERIZATION_ID, POLYMERIZATION_ID]
    },
    // ASTER PHOENIX (Destiny End Dragoon)
    'ASTER': {
        extra: [60461880, 60461880], // Destiny End Dragoon
        mainRequired: [83965310, 83965310, 17132130, 17132130, POLYMERIZATION_ID, POLYMERIZATION_ID]
    },
    // HAOU JUDAI (Evil HEROes)
    'HAOU': {
        extra: [86066372, 22118750, 98715423, 21844576, 58554959], // Malicious Bane, Dark Gaia, Inferno Wing, Lightning Golem, Malicious Fiend
        mainRequired: [DARK_FUSION_ID, DARK_FUSION_ID, DARK_FUSION_ID, 84327329, 5893261, 20721928, 58554959]
    },
    // YUSEI FUDO (Stardust & Junk Synchros)
    'YUSEI': {
        extra: [44508094, 24696097, 35952884, 50091196, 60800381, 50321796, 18013090], // Stardust, Shooting Star, Shooting Quasar, Formula Synchron, Junk Warrior, Junk Archer, Nitro Warrior
        mainRequired: [63977008, 63977008, 63977008, 20932152, 20932152, 53855409, 11277340, 98884569]
    },
    // JACK ATLAS (Red Dragon Archfiend & Resonators)
    'JACK': {
        extra: [70902743, 73580471, 33198837, 80666118], // Red Dragon Archfiend, Red Nova Dragon, Exploder Dragonwing, Scarlight
        mainRequired: [97021196, 97021196, 97021196, 13440180, 13440180, 58831685, 58831685]
    },
    // CROW HOGAN (Blackwings)
    'CROW': {
        extra: [69031175, 76913983, 9012916, 33236860], // Armor Master, Armed Wing, Blackwing Dragon, Silverwind
        mainRequired: [63356631, 63356631, 63356631, 91345518, 91345518, 75498415, 75498415]
    },
    // AKIZA IZINSKI (Black Rose Dragon)
    'AKIZA': {
        extra: [73580471, 85243784], // Black Rose Dragon / Splendid Rose
        mainRequired: [53855409, 11277340, 63977008]
    },
    // LEO / RUA (Power Tool & Life Stream)
    'LEO': {
        extra: [2403771, 25165047], // Power Tool Dragon, Life Stream Dragon
        mainRequired: [63977008, 53855409]
    },
    // LUNA / RUKA (Ancient Fairy Dragon)
    'LUNA': {
        extra: [25862681], // Ancient Fairy Dragon
        mainRequired: [63977008, 53855409]
    },
    // KALIN KESSLER (Infernity Doom Dragon & Hundred-Eyes)
    'KALIN': {
        extra: [72896720, 95453143], // Infernity Doom Dragon, Hundred-Eyes Dragon
        mainRequired: [63977008, 97021196]
    },
    // BRUNO / ANTINOMY (T.G. Tech Genus)
    'BRUNO': {
        extra: [51447164, 97836201, 90953320, 98558751], // T.G. Blade Blaster, Halberd Cannon, Hyper Librarian, Wonder Magician
        mainRequired: [63977008, 20932152]
    }
};

// 4. REVISIÓN MINUCIOSA DE CADA DUELISTA
let totalExtraDeckCardsCount = 0;
let npcsWithArchetypeExtra = 0;

updatedNpcs.forEach(npc => {
    let rawMain = [];
    try { rawMain = JSON.parse(npc.DeckJson || '[]'); } catch(e){}
    let rawExtra = [];
    try { rawExtra = JSON.parse(npc.ExtraDeckJson || '[]'); } catch(e){}

    // Limpiar cartas inválidas de Extra Deck (quitar monstruos normales o de main deck que pudieran estar colados)
    let cleanedExtra = rawExtra.filter(id => isExtraDeckCard(id));

    // Determinar arquetipo especial
    const nameUpper = (npc.Name || '').toUpperCase();
    const themeUpper = (npc.DeckTheme || '').toUpperCase();
    let archKey = null;

    if (nameUpper.includes('KAIBA') && !nameUpper.includes('MOKUBA') && !nameUpper.includes('NOAH')) archKey = 'KAIBA';
    else if (nameUpper.includes('JOEY') || nameUpper.includes('JONOUCHI')) archKey = 'JOEY';
    else if (nameUpper.includes('YUGI') || nameUpper.includes('ATEM')) archKey = 'YUGI';
    else if (nameUpper.includes('PEGASUS')) archKey = 'PEGASUS';
    else if (nameUpper.includes('JADEN') || nameUpper.includes('JUDAI')) archKey = (nameUpper.includes('SUPREMO') || nameUpper.includes('HAOU')) ? 'HAOU' : 'JADEN';
    else if (nameUpper.includes('ZANE') || nameUpper.includes('RYO') || nameUpper.includes('KÁISER')) archKey = 'ZANE';
    else if (nameUpper.includes('CHAZZ') || nameUpper.includes('MANJOUME')) archKey = 'CHAZZ';
    else if (nameUpper.includes('ALEXIS') || nameUpper.includes('ASUKA')) archKey = 'ALEXIS';
    else if (nameUpper.includes('ASTER') || nameUpper.includes('EDO')) archKey = 'ASTER';
    else if (nameUpper.includes('YUSEI')) archKey = 'YUSEI';
    else if (nameUpper.includes('JACK ATLAS')) archKey = 'JACK';
    else if (nameUpper.includes('CROW')) archKey = 'CROW';
    else if (nameUpper.includes('AKIZA') || nameUpper.includes('AKI')) archKey = 'AKIZA';
    else if (nameUpper.includes('LEO') || nameUpper.includes('RUA')) archKey = 'LEO';
    else if (nameUpper.includes('LUNA') || nameUpper.includes('RUKA')) archKey = 'LUNA';
    else if (nameUpper.includes('KALIN') || nameUpper.includes('KIRYU')) archKey = 'KALIN';
    else if (nameUpper.includes('BRUNO') || nameUpper.includes('ANTINOMY') || nameUpper.includes('VIZOR')) archKey = 'BRUNO';

    if (archKey && ARCHETYPE_EXTRA_CONFIG[archKey]) {
        npcsWithArchetypeExtra++;
        const cfg = ARCHETYPE_EXTRA_CONFIG[archKey];
        // Asignar Extra Deck canónico
        cleanedExtra = [...cfg.extra];

        // Asegurar cartas clave en Main Deck
        cfg.mainRequired.forEach(reqCard => {
            if (!rawMain.includes(reqCard)) {
                rawMain.unshift(reqCard);
            }
        });
    } else {
        // Para NPCs sin arquetipo exclusivo que tienen fusiones en cleanedExtra, asegurar Polymerization en Main Deck
        const hasFusionInExtra = cleanedExtra.some(id => isFusionCard(id));
        if (hasFusionInExtra) {
            if (!rawMain.includes(POLYMERIZATION_ID)) {
                rawMain.unshift(POLYMERIZATION_ID);
                rawMain.unshift(POLYMERIZATION_ID);
            }
        }
    }

    // Filtrar cartas válidas en Main Deck (no deben ser del Extra Deck)
    let validMain = rawMain.filter(id => {
        return cardIndex[id] && !isExtraDeckCard(id);
    });

    // Asegurar exactamente 40 cartas en el Main Deck
    // Si faltan, rellenar con staples acordes al nivel
    const stapleFillers = [84257639, 46130346, 63102017, 77414722, 51482758, 83764720, 72302403, 53129443, 86318356, 23424603];
    let fillIdx = 0;
    while (validMain.length < 40) {
        validMain.push(stapleFillers[fillIdx % stapleFillers.length]);
        fillIdx++;
    }
    if (validMain.length > 40) {
        validMain = validMain.slice(0, 40);
    }

    // Guardar arreglos procesados
    npc.DeckJson = JSON.stringify(validMain);
    npc.ExtraDeckJson = JSON.stringify(cleanedExtra);
    totalExtraDeckCardsCount += cleanedExtra.length;
});

console.log(`Revisión completada: ${npcsWithArchetypeExtra} duelistas con arquetipos canónicos precisos. Total cartas Extra Deck: ${totalExtraDeckCardsCount}.`);

// 5. GUARDAR ARCHIVO JSON MAESTRO ACTUALIZADO
fs.writeFileSync(
    path.join(__dirname, '../backend/data/all-223-canonical-npcs.json'),
    JSON.stringify(updatedNpcs, null, 2),
    'utf8'
);
console.log('✅ all-223-canonical-npcs.json actualizado exitosamente.');

// 6. APLICAR MIGRACIÓN EN BASE DE DATOS SQL SERVER
async function applyToSqlServer() {
    console.log('\n--- Sincronizando con Microsoft SQL Server ---');
    const pool = await getPool();

    // A. Actualizar dbo.AdventureEras
    console.log('[1/4] Actualizando las 12 Eras con sus rangos de nivel calibrados...');
    for (const era of ERAS_CONFIG) {
        await pool.request()
            .input('Id', sql.Int, era.id)
            .input('Code', sql.VarChar(50), era.code)
            .input('Series', sql.NVarChar(50), era.series)
            .input('Title', sql.NVarChar(100), era.title)
            .input('Subtitle', sql.NVarChar(200), era.subtitle)
            .input('DescText', sql.NVarChar(500), era.desc)
            .input('Icon', sql.VarChar(20), era.icon)
            .input('BgTheme', sql.VarChar(50), era.bgTheme)
            .input('LevelRange', sql.VarChar(50), era.range)
            .input('AssignedPack', sql.VarChar(50), era.assignedPack)
            .query(`
                UPDATE dbo.AdventureEras SET
                    Code = @Code, Series = @Series, Title = @Title, Subtitle = @Subtitle,
                    DescText = @DescText, Icon = @Icon, BgTheme = @BgTheme,
                    LevelRange = @LevelRange, AssignedPack = @AssignedPack
                WHERE Id = @Id;
            `);
    }

    // B. Actualizar dbo.NPCs y dbo.AdventureNpcs con UPSERT completo
    console.log('[2/4] Actualizando los 223 NPCs en dbo.NPCs y dbo.AdventureNpcs...');
    for (const npc of updatedNpcs) {
        // En dbo.NPCs
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
            .input('ExpReward', sql.Int, Math.max(50, npc.Level * 25))
            .input('StarshipsReward', sql.Int, Math.max(20, npc.Level * 15))
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

        // En dbo.AdventureNpcs
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
            .input('ExtraDeckJson', sql.NVarChar(sql.MAX), npc.ExtraDeckJson)
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
    }

    // C. Limpiar y repoblar dbo.NpcDeckCards con Main Deck y Extra Deck normalizados
    console.log('[3/4] Repoblando dbo.NpcDeckCards (Main & Extra Decks)...');
    await pool.request().query(`
        DELETE FROM dbo.NpcDeckCards;
        DBCC CHECKIDENT ('dbo.NpcDeckCards', RESEED, 0);
    `);

    for (const npc of updatedNpcs) {
        const mainCards = JSON.parse(npc.DeckJson || '[]');
        const extraCards = JSON.parse(npc.ExtraDeckJson || '[]');

        // Insertar MAIN DECK
        for (let i = 0; i < mainCards.length; i++) {
            const cardId = mainCards[i];
            const cInfo = cardIndex[cardId] || { name: `Carta #${cardId}`, type: 'Spell' };
            await pool.request()
                .input('NpcId', sql.Int, npc.Id)
                .input('CardCode', sql.Int, cardId)
                .input('CardName', sql.NVarChar(100), cInfo.name || `Carta #${cardId}`)
                .input('CardType', sql.VarChar(50), String(cInfo.type || 'Normal'))
                .input('Section', sql.VarChar(10), 'MAIN')
                .input('Quantity', sql.Int, 1)
                .input('SlotOrder', sql.Int, i + 1)
                .query(`
                    INSERT INTO dbo.NpcDeckCards (NpcId, CardCode, CardName, CardType, Section, Quantity, SlotOrder, CreatedAt)
                    VALUES (@NpcId, @CardCode, @CardName, @CardType, @Section, @Quantity, @SlotOrder, GETDATE());
                `);
        }

        // Insertar EXTRA DECK
        for (let j = 0; j < extraCards.length; j++) {
            const cardId = extraCards[j];
            const cInfo = cardIndex[cardId] || { name: `Carta #${cardId}`, type: 'Fusion' };
            await pool.request()
                .input('NpcId', sql.Int, npc.Id)
                .input('CardCode', sql.Int, cardId)
                .input('CardName', sql.NVarChar(100), cInfo.name || `Carta #${cardId}`)
                .input('CardType', sql.VarChar(50), String(cInfo.type || 'Fusion'))
                .input('Section', sql.VarChar(10), 'EXTRA')
                .input('Quantity', sql.Int, 1)
                .input('SlotOrder', sql.Int, j + 1)
                .query(`
                    INSERT INTO dbo.NpcDeckCards (NpcId, CardCode, CardName, CardType, Section, Quantity, SlotOrder, CreatedAt)
                    VALUES (@NpcId, @CardCode, @CardName, @CardType, @Section, @Quantity, @SlotOrder, GETDATE());
                `);
        }
    }

    // D. Actualizar Stored Procedure dbo.sp_RegistrarVictoriaNpc para garantizar entrega de Medallas
    console.log('[4/4] Actualizando procedimiento dbo.sp_RegistrarVictoriaNpc en SQL Server...');
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

                -- Normalizar alias de sesión Admin si viniera como 999
                IF @UserId = 999
                BEGIN
                    SELECT TOP 1 @UserId = Id FROM dbo.Usuarios WHERE IsAdmin = 1 OR Id = 1;
                    IF @UserId IS NULL SET @UserId = 1;
                END

                DECLARE @IsFirstTimeWin BIT = 0;
                DECLARE @MedalUnlocked BIT = 0;
                DECLARE @UnlockedMedalCode VARCHAR(50) = NULL;
                DECLARE @UnlockedMedalName NVARCHAR(100) = NULL;
                DECLARE @IsNewNpcUnlocked BIT = 0;
                DECLARE @CurrentMax INT = 1;

                SELECT @CurrentMax = ISNULL(MaxNpcUnlocked, 1) 
                FROM dbo.UserAdventureProgress WITH (UPDLOCK, ROWLOCK)
                WHERE UserId = @UserId;

                IF @CurrentMax IS NULL SET @CurrentMax = 1;

                -- Si fue victoria
                IF @IsWinner = 1
                BEGIN
                    -- Verificar si es la primera victoria contra este NPC
                    DECLARE @ExistingWins INT = 0;
                    SELECT @ExistingWins = ISNULL(Wins, 0)
                    FROM dbo.UserNpcRecords WITH (UPDLOCK, ROWLOCK)
                    WHERE UserId = @UserId AND NpcId = @NpcId;

                    IF @ExistingWins = 0
                    BEGIN
                        SET @IsFirstTimeWin = 1;

                        -- Desbloquear Medalla oficial de este NPC si no la tiene
                        SELECT @UnlockedMedalCode = MedalCode, @UnlockedMedalName = Name
                        FROM dbo.AdventureMedals
                        WHERE NpcId = @NpcId;

                        IF @UnlockedMedalCode IS NOT NULL
                        BEGIN
                            IF NOT EXISTS (SELECT 1 FROM dbo.UserMedals WHERE UserId = @UserId AND MedalId = @UnlockedMedalCode)
                            BEGIN
                                INSERT INTO dbo.UserMedals (UserId, MedalId, UnlockedAt)
                                VALUES (@UserId, @UnlockedMedalCode, GETDATE());
                                SET @MedalUnlocked = 1;
                            END
                        END

                        -- Desbloquear el siguiente NPC en la campaña de aventura (hasta 223)
                        IF @NpcId >= @CurrentMax AND @CurrentMax < 223
                        BEGIN
                            SET @CurrentMax = @NpcId + 1;
                            SET @IsNewNpcUnlocked = 1;

                            IF EXISTS (SELECT 1 FROM dbo.UserAdventureProgress WHERE UserId = @UserId)
                            BEGIN
                                UPDATE dbo.UserAdventureProgress 
                                SET MaxNpcUnlocked = @CurrentMax, UpdatedAt = GETDATE()
                                WHERE UserId = @UserId;
                            END
                            ELSE
                            BEGIN
                                INSERT INTO dbo.UserAdventureProgress (UserId, MaxNpcUnlocked, UpdatedAt)
                                VALUES (@UserId, @CurrentMax, GETDATE());
                            END
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
                END
                ELSE
                BEGIN
                    -- Registrar récord de derrota
                    IF EXISTS (SELECT 1 FROM dbo.UserNpcRecords WHERE UserId = @UserId AND NpcId = @NpcId)
                    BEGIN
                        UPDATE dbo.UserNpcRecords SET Losses = Losses + 1 WHERE UserId = @UserId AND NpcId = @NpcId;
                    END
                    ELSE
                    BEGIN
                        INSERT INTO dbo.UserNpcRecords (UserId, NpcId, Wins, Losses, BestTurns, LastDefeatedAt)
                        VALUES (@UserId, @NpcId, 0, 1, @Turns, NULL);
                    END
                END

                COMMIT TRANSACTION;

                SELECT 
                    1 AS Success,
                    @IsWinner AS IsWinner,
                    @IsFirstTimeWin AS IsFirstTimeWin,
                    @MedalUnlocked AS MedalUnlocked,
                    @UnlockedMedalCode AS UnlockedMedalCode,
                    @UnlockedMedalName AS UnlockedMedalName,
                    @IsNewNpcUnlocked AS IsNewNpcUnlocked,
                    @CurrentMax AS MaxNpcUnlocked;

            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
                THROW 51022, @ErrMsg, 1;
            END CATCH
        END;
    `);

    // Resetear el progreso del usuario 1 a su estado real ganado (ha derrotado a Téa NpcId 1 -> MaxNpcUnlocked = 2)
    await pool.request().query(`
        UPDATE dbo.UserAdventureProgress 
        SET MaxNpcUnlocked = 2, UpdatedAt = GETDATE() 
        WHERE UserId = 1;
    `);

    console.log('🎉 Migración completada con éxito en SQL Server.');
    process.exit(0);
}

applyToSqlServer().catch(err => {
    console.error('❌ Error en applyToSqlServer:', err);
    process.exit(1);
});
