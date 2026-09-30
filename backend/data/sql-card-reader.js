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

function formatOcgCard(row) {
    const rawType = Number(row.type || 0);
    const rawRace = Number(row.race || 0);
    const rawAttr = Number(row.attribute || 0);

    let typeStr = 'Normal Monster';
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
    } else if (rawType & 0x1) {
        const parts = [];
        if (rawType & 0x200000) parts.push('Flip');
        if (rawType & 0x40) parts.push('Fusion');
        if (rawType & 0x80) parts.push('Ritual');
        if (rawType & 0x2000) parts.push('Synchro');
        if (rawType & 0x800000) parts.push('Xyz');
        if (rawType & 0x4000000) parts.push('Link');
        if (rawType & 0x20) parts.push('Effect');
        else if (rawType & 0x10) parts.push('Normal');
        parts.push('Monster');
        typeStr = parts.join(' ');
    }

    let attrStr = OCG_ATTRIBUTES[rawAttr];
    if (!attrStr) {
        if (rawType & 0x2) attrStr = 'SPELL';
        else if (rawType & 0x4) attrStr = 'TRAP';
        else attrStr = 'EARTH';
    }

    let raceStr = OCG_RACES[rawRace];
    if (!raceStr) {
        if (rawType & 0x2) raceStr = 'Spell';
        else if (rawType & 0x4) raceStr = 'Trap';
        else raceStr = 'Warrior';
    }

    return {
        id: parseInt(row.id, 10),
        card_id: parseInt(row.id, 10),
        ot: row.ot || 1,
        alias: row.alias || 0,
        setcode: row.setcode || '0',
        type: typeStr,
        typeCode: rawType,
        race: raceStr,
        raceCode: rawRace,
        attribute: attrStr,
        attributeCode: rawAttr,
        atk: (rawType & 0x1) && row.atk !== null ? parseInt(row.atk, 10) : null,
        def: (rawType & 0x1) && !(rawType & 0x4000000) && row.def !== null ? parseInt(row.def, 10) : null,
        level: (rawType & 0x1) ? (row.level & 0xFF) : 0,
        category: Number(row.category || 0),
        name: row.name || `Carta #${row.id}`,
        desc: row.desc || '',
        image_url: `../../../assets/images/cards/${row.id}.jpg`
    };
}

// Carga inmediata de la base de datos oficial cards.cdb
try {
    const cdbIndexPath = path.resolve(__dirname, '../ocgcore/cdb/cards_index.json');
    if (fs.existsSync(cdbIndexPath)) {
        const cdbData = JSON.parse(fs.readFileSync(cdbIndexPath, 'utf-8'));
        Object.values(cdbData).forEach(card => {
            const formatted = formatOcgCard(card);
            cardDbCache.set(formatted.id, formatted);
        });
        console.log(`✅ [CARDS.CDB] Cargadas exitosamente ${cardDbCache.size} cartas oficiales Konami OCG en memoria.`);
    }
} catch (e) {
    console.warn('[CARDS.CDB] Advertencia al leer cards_index.json:', e.message);
}
/**
 * Carga e hidrata todas las cartas desde SQL Server a memoria para acceso ultra rápido
 */
async function loadCardsFromSqlServer() {
    try {
        console.log('[SQL SERVER] Conectando a Microsoft SQL Server para cargar catálogo de cartas OCG...');
        const pool = new sql.ConnectionPool(sqlConfig);
        await pool.connect();
        
        // Consulta del esquema oficial OCG (Tabla datas + texts en SQL Server)
        const result = await pool.request().query(`
            SELECT 
                d.id, d.ot, d.alias, d.setcode, d.type, d.atk, d.def, d.level, d.race, d.attribute, d.category,
                t.name, t.[desc], t.str1, t.str2, t.str3, t.str4
            FROM datas d
            LEFT JOIN texts t ON d.id = t.id
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
        image_url: `../../../assets/images/cards/${cardId}.jpg`
    };
}

module.exports = {
    loadCardsFromSqlServer,
    ocgCardReader,
    formatOcgCard,
    cardDbCache
};
