/**
 * Ani-Dimension: Adaptador de Base de Datos SQL Server para OCG Core Card Reader
 * Lee las estadísticas y textos reglamentarios desde MS SQL Server (o cards.cdb)
 */
const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Configuración de SQL Server desde variables de entorno
const sqlConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'Oscar1982',
    server: process.env.DB_HOST || process.env.DB_SERVER || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    database: process.env.DB_NAME || 'AniDimensionDB',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const cardDbCache = new Map();

// Tablas oficiales de conversión OCG a texto para la interfaz gráfica
const OCG_ATTRIBUTES = {
    0x01: 'EARTH',
    0x02: 'WATER',
    0x04: 'FIRE',
    0x08: 'WIND',
    0x10: 'LIGHT',
    0x20: 'DARK',
    0x40: 'DIVINE'
};

const OCG_RACES = {
    0x1: 'Warrior',
    0x2: 'Spellcaster',
    0x4: 'Fairy',
    0x8: 'Fiend',
    0x10: 'Zombie',
    0x20: 'Machine',
    0x40: 'Aqua',
    0x80: 'Pyro',
    0x100: 'Rock',
    0x200: 'Winged Beast',
    0x400: 'Plant',
    0x800: 'Insect',
    0x1000: 'Thunder',
    0x2000: 'Dragon',
    0x4000: 'Beast',
    0x8000: 'Beast-Warrior',
    0x10000: 'Dinosaur',
    0x20000: 'Fish',
    0x40000: 'Sea Serpent',
    0x80000: 'Reptile',
    0x100000: 'Psychic',
    0x200000: 'Divine-Beast',
    0x400000: 'Creator God',
    0x800000: 'Wyrm',
    0x1000000: 'Cyberse'
};

const OCG_RACES_ES = {
    0x1: 'Guerrero',
    0x2: 'Lanzador de Conjuros',
    0x4: 'Hada',
    0x8: 'Demonio',
    0x10: 'Zombi',
    0x20: 'Máquina',
    0x40: 'Aqua',
    0x80: 'Piro',
    0x100: 'Roca',
    0x200: 'Bestia Alada',
    0x400: 'Planta',
    0x800: 'Insecto',
    0x1000: 'Trueno',
    0x2000: 'Dragón',
    0x4000: 'Bestia',
    0x8000: 'Guerrero-Bestia',
    0x10000: 'Dinosaurio',
    0x20000: 'Pez',
    0x40000: 'Serpiente Marina',
    0x80000: 'Reptil',
    0x100000: 'Psíquico',
    0x200000: 'Bestia Divina',
    0x400000: 'Dios Creador',
    0x800000: 'Wyrm',
    0x1000000: 'Ciberso'
};

const OCG_ATTRIBUTES_ES = {
    0x01: 'TIERRA',
    0x02: 'AGUA',
    0x04: 'FUEGO',
    0x08: 'VIENTO',
    0x10: 'LUZ',
    0x20: 'OSCURIDAD',
    0x40: 'DIVINIDAD'
};

function formatOcgCard(row) {
    if (typeof row.race === 'string' && typeof row.type === 'string' && isNaN(Number(row.race))) {
        const cId = parseInt(row.id || row.card_id || row.CardId, 10);
        return {
            id: cId,
            card_id: cId,
            name: row.name || row.Name,
            name_es: row.name_es || row.Name_ES || row.name || row.Name,
            type: row.type || row.CardType,
            typeCode: ((row.type || row.CardType || '').includes('Spell') ? 2 : ((row.type || row.CardType || '').includes('Trap') ? 4 : 1)),
            typeLine: row.typeLine || row.TypeLine || `[ ${row.race || row.Race} / ${row.type || row.CardType} ]`,
            typeLine_es: row.typeLine_es || row.TypeLine_ES || `[ ${row.race_es || row.Race_ES || row.race || row.Race} / ${row.type || row.CardType} ]`,
            race: row.race || row.Race,
            race_es: row.race_es || row.Race_ES || row.race || row.Race,
            attribute: row.attribute || row.Attribute,
            attribute_es: row.attribute_es || row.Attribute_ES || row.attribute || row.Attribute,
            atk: row.atk !== undefined && row.atk !== null ? parseInt(row.atk, 10) : null,
            def: row.def !== undefined && row.def !== null ? parseInt(row.def, 10) : null,
            level: row.level !== undefined && row.level !== null ? parseInt(row.level, 10) : 0,
            rank: 0,
            rarity: row.rarity || row.Rarity || 'COMMON',
            desc: row.desc || row.Description || '',
            desc_es: row.desc_es || row.Description_ES || row.desc || row.Description || '',
            description: row.description || row.Description || row.desc || '',
            description_es: row.description_es || row.Description_ES || row.desc_es || '',
            image_url: row.image_url || row.ImageUrl || `https://images.ygoprodeck.com/images/cards_small/${cId}.jpg`,
            image_large: row.image_large || row.ImageLargeUrl || `https://images.ygoprodeck.com/images/cards/${cId}.jpg`
        };
    }

    const rawType = Number(row.type !== undefined ? row.type : (row.typeCode || 0));
    const rawRace = Number(row.race !== undefined ? row.race : (row.raceCode || 0));
    const rawAttr = Number(row.attribute !== undefined ? row.attribute : (row.attributeCode || 0));
    const rawLevel = Number(row.level !== undefined ? row.level : 0);
    const isMonster = Boolean(rawType & 0x1);

    let typeStr = 'Normal Monster';
    let monsterSubtypes = [];
    let monsterSubtypesEs = [];

    if (rawType & 0x2) {
        if (rawType & 0x10000) typeStr = 'Quick-Play Spell';
        else if (rawType & 0x20000) typeStr = 'Continuous Spell';
        else if (rawType & 0x40000) typeStr = 'Equip Spell';
        else if (rawType & 0x80000) typeStr = 'Field Spell';
        else if (rawType & 0x80) typeStr = 'Ritual Spell';
        else typeStr = 'Normal Spell';
    } else if (rawType & 0x4) {
        if (rawType & 0x20000) typeStr = 'Continuous Trap';
        else if (rawType & 0x100000) typeStr = 'Counter Trap';
        else typeStr = 'Normal Trap';
    } else if (isMonster) {
        const parts = [];
        if (rawType & 0x40) { parts.push('Fusion'); monsterSubtypes.push('Fusion'); monsterSubtypesEs.push('Fusión'); }
        if (rawType & 0x80) { parts.push('Ritual'); monsterSubtypes.push('Ritual'); monsterSubtypesEs.push('Ritual'); }
        if (rawType & 0x2000) { parts.push('Synchro'); monsterSubtypes.push('Synchro'); monsterSubtypesEs.push('Sincronía'); }
        if (rawType & 0x800000) { parts.push('Xyz'); monsterSubtypes.push('Xyz'); monsterSubtypesEs.push('Xyz'); }
        if (rawType & 0x4000000) { parts.push('Link'); monsterSubtypes.push('Link'); monsterSubtypesEs.push('Enlace'); }
        if (rawType & 0x200000) { parts.push('Flip'); monsterSubtypes.push('Flip'); monsterSubtypesEs.push('Volteo'); }
        if (rawType & 0x2000000) { parts.push('Pendulum'); monsterSubtypes.push('Pendulum'); monsterSubtypesEs.push('Péndulo'); }
        if (rawType & 0x1000) { parts.push('Tuner'); monsterSubtypes.push('Tuner'); monsterSubtypesEs.push('Cantante'); }
        if (rawType & 0x200) { parts.push('Spirit'); monsterSubtypes.push('Spirit'); monsterSubtypesEs.push('Espíritu'); }
        if (rawType & 0x400) { parts.push('Union'); monsterSubtypes.push('Union'); monsterSubtypesEs.push('Unión'); }
        if (rawType & 0x800) { parts.push('Gemini'); monsterSubtypes.push('Gemini'); monsterSubtypesEs.push('Géminis'); }

        if (rawType & 0x20) {
            parts.push('Effect');
            monsterSubtypes.push('Effect');
            monsterSubtypesEs.push('Efecto');
        } else if (rawType & 0x10 || monsterSubtypes.length === 0) {
            parts.push('Normal');
            monsterSubtypes.push('Normal');
            monsterSubtypesEs.push('Normal');
        }
        parts.push('Monster');
        typeStr = parts.join(' ');
    }

    let attrStr = OCG_ATTRIBUTES[rawAttr];
    let attrStrEs = OCG_ATTRIBUTES_ES[rawAttr];
    if (!attrStr) {
        if (rawType & 0x2) { attrStr = 'SPELL'; attrStrEs = 'MÁGICA'; }
        else if (rawType & 0x4) { attrStr = 'TRAP'; attrStrEs = 'TRAMPA'; }
        else { attrStr = 'EARTH'; attrStrEs = 'TIERRA'; }
    }

    let raceStr = OCG_RACES[rawRace];
    let raceStrEs = OCG_RACES_ES[rawRace];
    if (!raceStr) {
        if (rawType & 0x2) { raceStr = 'Spell'; raceStrEs = 'Mágica'; }
        else if (rawType & 0x4) { raceStr = 'Trap'; raceStrEs = 'Trampa'; }
        else { raceStr = 'Warrior'; raceStrEs = 'Guerrero'; }
    }

    const typeLine = isMonster ? `[ ${raceStr} / ${monsterSubtypes.join(' / ')} ]` : `[ ${raceStr} / ${typeStr} ]`;
    const typeLineEs = isMonster ? `[ ${raceStrEs} / ${monsterSubtypesEs.join(' / ')} ]` : `[ ${raceStrEs} / ${typeStr} ]`;

    const atkVal = isMonster && row.atk !== null && row.atk !== undefined ? parseInt(row.atk, 10) : null;
    const defVal = isMonster && !(rawType & 0x4000000) && row.def !== null && row.def !== undefined ? parseInt(row.def, 10) : null;
    const levelVal = isMonster ? (rawLevel & 0xFF) : 0;
    const rankVal = isMonster && (rawType & 0x800000) ? (rawLevel & 0xFF) : 0;

    return {
        id: parseInt(row.id || row.card_id, 10),
        card_id: parseInt(row.id || row.card_id, 10),
        ot: row.ot || 1,
        alias: row.alias || 0,
        setcode: row.setcode || '0',
        type: typeStr,
        typeCode: rawType,
        typeLine: typeLine,
        typeLine_es: typeLineEs,
        race: raceStr,
        race_es: raceStrEs,
        raceCode: rawRace,
        attribute: attrStr,
        attribute_es: attrStrEs,
        attributeCode: rawAttr,
        atk: atkVal,
        def: defVal,
        level: levelVal,
        rank: rankVal,
        rarity: row.rarity || 'COMMON',
        category: Number(row.category || 0),
        name: row.name || `Carta #${row.id || row.card_id}`,
        name_es: row.name_es || row.name || `Carta #${row.id || row.card_id}`,
        desc: row.desc || '',
        desc_es: row.desc_es || row.descEs || row.description_es || row.desc || '',
        description: row.desc || '',
        description_es: row.desc_es || row.descEs || row.description_es || row.desc || '',
        image_url: (row.image_url && (row.image_url.startsWith('http') || row.image_url.startsWith('/'))) 
            ? row.image_url 
            : `https://images.ygoprodeck.com/images/cards_small/${row.id || row.card_id}.jpg`,
        image_large: `https://images.ygoprodeck.com/images/cards/${row.id || row.card_id}.jpg`
    };
}

// Carga inmediata de la base de datos oficial cards.cdb
try {
    const cdbIndexPath = path.resolve(__dirname, 'cards_index.json');
    if (fs.existsSync(cdbIndexPath)) {
        const cdbData = JSON.parse(fs.readFileSync(cdbIndexPath, 'utf-8'));
        Object.values(cdbData).forEach(card => {
            const formatted = formatOcgCard(card);
            cardDbCache.set(formatted.id, formatted);
        });
        console.log(`✅ [CORE DIMENSION DB] Cargadas exitosamente ${cardDbCache.size} cartas en memoria.`);
    }
} catch (e) {
    console.warn('[CORE DIMENSION DB] Advertencia al leer cards_index.json:', e.message);
}
/**
 * Carga e hidrata todas las cartas desde SQL Server a memoria para acceso ultra rápido
 */
async function loadCardsFromSqlServer() {
    try {
        console.log('[SQL SERVER] Conectando a Microsoft SQL Server para cargar catálogo de cartas OCG...');
        const pool = new sql.ConnectionPool(sqlConfig);
        await pool.connect();
        
        // Consulta del catálogo unificado oficial desde la tabla centralizada dbo.Cards
        const result = await pool.request().query(`
            SELECT 
                CardId AS id, CardId AS card_id, 1 AS ot, 0 AS alias, '0' AS setcode,
                CardType AS type,
                CASE 
                    WHEN CardType LIKE '%Spell%' THEN 2
                    WHEN CardType LIKE '%Trap%' THEN 4
                    ELSE 1
                END AS typeCode,
                Atk AS atk, Def AS def, Level AS level,
                Race AS race, Attribute AS attribute,
                Name AS name, Name_ES AS name_es,
                Description AS [desc], Description_ES AS desc_es,
                Rarity AS rarity, TypeLine AS typeLine, TypeLine_ES AS typeLine_es,
                Race_ES AS race_es, Attribute_ES AS attribute_es,
                ImageUrl AS image_url, ImageLargeUrl AS image_large
            FROM dbo.Cards
        `);

        if (result.recordset && result.recordset.length > 0) {
            result.recordset.forEach(row => {
                const cardObj = formatOcgCard(row);
                cardDbCache.set(cardObj.id, cardObj);
            });
            console.log(`✅ [SQL SERVER] Cargadas ${cardDbCache.size} cartas reglamentarias desde SQL Server en memoria.`);
        }
        await pool.close();
    } catch (err) {
        console.warn(`[SQL SERVER] Aviso al consultar SQL Server (${err.message}). Usando base de datos en caché de respaldo.`);
    }
}

/**
 * Card Reader Callback requerido por OCG Core:
 * Retorna la estructura de datos nativa OCG para una carta dada su ID de 8 dígitos.
 */
function ocgCardReader(cardId) {
    const numericId = parseInt(cardId, 10);
    if (!isNaN(numericId) && cardDbCache.has(numericId)) {
        return cardDbCache.get(numericId);
    }
    
    // Si no está en caché de SQL Server, intentar leer de cards.data.js
    const { LOCAL_CARDS } = require('./cards.data');
    if (LOCAL_CARDS && LOCAL_CARDS[numericId]) {
        return LOCAL_CARDS[numericId];
    }
    if (LOCAL_CARDS && LOCAL_CARDS[cardId]) {
        return LOCAL_CARDS[cardId];
    }

    // Retornar fallback estructurado con imágen y passcode oficial en lugar de null
    return {
        id: numericId || 0,
        card_id: numericId || 0,
        name: `Carta #${cardId}`,
        type: 'Normal Monster',
        race: 'Warrior',
        attribute: 'EARTH',
        level: 4,
        atk: 1000,
        def: 1000,
        desc: 'Carta reglamentaria oficial OCG.',
        image_url: `https://images.ygoprodeck.com/images/cards_small/${cardId}.jpg`,
        image_large: `https://images.ygoprodeck.com/images/cards/${cardId}.jpg`
    };
}

module.exports = {
    loadCardsFromSqlServer,
    ocgCardReader,
    formatOcgCard,
    cardDbCache
};
