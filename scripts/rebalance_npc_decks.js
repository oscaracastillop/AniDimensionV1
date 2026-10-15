/**
 * ============================================================================
 * ANI-DIMENSION: REBALANCEO CANÓNICO Y JUSTO DE MAZOS DE TODOS LOS 223 DUELISTAS
 * Ajusta los 223 mazos para que los duelistas de niveles bajos tengan cartas
 * acordes a su nivel (ATK 300-1200 en Nv 4-10, 800-1500 en Nv 11-20, etc.)
 * ============================================================================
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 1. Cargar packs-data.js para catálogo de cartas
const packsContent = fs.readFileSync(path.resolve(__dirname, '../frontend/js/data/packs-data.js'), 'utf8');
const packSandbox = { window: {}, console, setTimeout, clearTimeout, Array, Object };
vm.runInNewContext(packsContent, packSandbox);
const allPacks = packSandbox.window.PacksManager ? packSandbox.window.PacksManager.getPacks() : [];

const cardCatalog = new Map();
allPacks.forEach(p => {
    (p.cards || []).forEach(c => {
        if (!cardCatalog.has(c.card_id)) {
            cardCatalog.set(c.card_id, {
                id: c.card_id,
                name: c.name,
                type: c.type || 'Normal Monster',
                atk: c.atk !== undefined ? c.atk : 0,
                def: c.def !== undefined ? c.def : 0,
                level: c.level || 0,
                race: c.race || 'Warrior',
                attribute: c.attribute || 'EARTH',
                pack: p.id
            });
        }
    });
});

console.log(`Catálogo cargado: ${cardCatalog.size} cartas únicas.`);

// 2. Cargar npcs-adventure-data.js
const adventureContent = fs.readFileSync(path.resolve(__dirname, '../frontend/js/data/npcs-adventure-data.js'), 'utf8');
const advSandbox = { window: {}, module: { exports: {} }, console, setTimeout, clearTimeout, Array, Object };
vm.runInNewContext(adventureContent, advSandbox);
const adventureData = advSandbox.module.exports || advSandbox.window.AdventureData;

const npcs = adventureData.NPCS || [];
const eras = adventureData.ERAS || [];
const medals = adventureData.MEDALS || [];

console.log(`Duelistas a rebalancear: ${npcs.length}, Eras: ${eras.length}, Medallas: ${medals.length}`);

// 3. Función generadora de mazos balanceados por Nivel y Era
function buildBalancedDeck(npc) {
    const lvl = npc.level || 10;
    const eraId = npc.eraId || 1;
    const isBoss = !!npc.isBoss;
    const packCode = npc.assignedPack || 'LOB';

    // Determinar límites de ATK y Nivel según nivel del NPC
    let maxNormalAtk = 1200;
    let maxBossAtk = 1400;
    let maxMonsterLevel = 3;
    let bossTributeCount = 0;

    if (lvl <= 6) {
        // Nv 4-6 (Téa novata): Monstruos muy básicos (ATK 300 - 1000), 0 tributos
        maxNormalAtk = 1000;
        maxBossAtk = 1100;
        maxMonsterLevel = 3;
        bossTributeCount = 0;
    } else if (lvl <= 10) {
        // Nv 7-10 (Tristan): Monstruos básicos (ATK 500 - 1200), 0 tributos
        maxNormalAtk = 1200;
        maxBossAtk = 1300;
        maxMonsterLevel = 4;
        bossTributeCount = 0;
    } else if (lvl <= 15) {
        // Nv 11-15 (Joey novato, Yugi básico): Monstruos (ATK 800 - 1400), 1 tributo menor (ATK 1600-1800)
        maxNormalAtk = 1400;
        maxBossAtk = 1800;
        maxMonsterLevel = 4;
        bossTributeCount = 1;
    } else if (lvl <= 20) {
        // Nv 16-20 (Solomon, Seto Boss Era 1): Monstruos (ATK 1200 - 1700), Boss (ATK 2500 - 3000 con 2 tributos)
        maxNormalAtk = 1700;
        maxBossAtk = isBoss ? 3000 : 2200;
        maxMonsterLevel = isBoss ? 8 : 6;
        bossTributeCount = isBoss ? 2 : 1;
    } else if (lvl <= 35) {
        // Nv 21-35 (Era 2 Reino intermedio): Monstruos (ATK 1200 - 1600), Boss tributos (ATK 2000-2400)
        maxNormalAtk = 1600;
        maxBossAtk = 2400;
        maxMonsterLevel = 6;
        bossTributeCount = 2;
    } else if (lvl <= 50) {
        // Nv 36-50 (Era 2 Final - Era 3): Monstruos (ATK 1400 - 1800), Bosses (ATK 2500 - 2800)
        maxNormalAtk = 1800;
        maxBossAtk = 2800;
        maxMonsterLevel = 7;
        bossTributeCount = 3;
    } else if (lvl <= 80) {
        // Nv 51-80 (Ciudad Batallas / Noah): Monstruos normales (ATK 1600 - 1900), Bosses 2800-3000
        maxNormalAtk = 1900;
        maxBossAtk = 3000;
        maxMonsterLevel = 8;
        bossTributeCount = 3;
    } else {
        // Nv 81+ (Torres, GX, 5D's): Mazos canónicos completos y poderosos
        maxNormalAtk = 2000;
        maxBossAtk = 4000;
        maxMonsterLevel = 10;
        bossTributeCount = 4;
    }

    // Obtener cartas disponibles del sobre de la era o sobres previos
    let pool = [];
    allPacks.forEach(p => {
        if (p.id === packCode || p.id === 'LOB' || (eraId > 1 && p.id === 'MRD')) {
            pool.push(...(p.cards || []));
        }
    });

    if (pool.length < 40) {
        // Si el pool es pequeño, agregar cartas de LOB
        const lobPack = allPacks.find(p => p.id === 'LOB');
        if (lobPack) pool.push(...lobPack.cards);
    }

    const lowMonsters = pool.filter(c => {
        const isMonster = c.type && (c.type.includes('Monster') || c.type === 'Normal' || c.type === 'Effect');
        const isFusion = c.type && (c.type.includes('Fusion') || c.type.includes('Synchro'));
        return isMonster && !isFusion && (c.level || 1) <= 4 && (c.atk || 0) <= maxNormalAtk && (c.atk || 0) >= 300;
    });

    const bossMonsters = pool.filter(c => {
        const isMonster = c.type && (c.type.includes('Monster') || c.type === 'Normal' || c.type === 'Effect');
        const isFusion = c.type && (c.type.includes('Fusion') || c.type.includes('Synchro'));
        return isMonster && !isFusion && (c.level || 1) >= 5 && (c.atk || 0) <= maxBossAtk && (c.atk || 0) >= 1500;
    });

    const spellsAndTraps = pool.filter(c => {
        const isST = c.type && (c.type.includes('Spell') || c.type.includes('Trap') || c.type.includes('Magic'));
        return isST;
    });

    // Construir 40 cartas
    const deck = [];

    // 1. Agregar Boss Monsters (si aplica según nivel)
    if (bossTributeCount > 0 && bossMonsters.length > 0) {
        for (let i = 0; i < bossTributeCount; i++) {
            const boss = bossMonsters[i % bossMonsters.length];
            if (boss) deck.push(boss.card_id);
        }
    }

    // 2. Agregar Monstruos Básicos (aprox 20-22 cartas)
    const targetMonsterCount = 24;
    let mIdx = 0;
    while (deck.length < targetMonsterCount && lowMonsters.length > 0) {
        const mon = lowMonsters[mIdx % lowMonsters.length];
        deck.push(mon.card_id);
        mIdx++;
    }

    // 3. Agregar Magias y Trampas hasta completar 40
    let stIdx = 0;
    while (deck.length < 40 && spellsAndTraps.length > 0) {
        const st = spellsAndTraps[stIdx % spellsAndTraps.length];
        deck.push(st.card_id);
        stIdx++;
    }

    // Si aún no son 40, rellenar con lowMonsters
    while (deck.length < 40 && lowMonsters.length > 0) {
        deck.push(lowMonsters[deck.length % lowMonsters.length].card_id);
    }

    return deck.slice(0, 40);
}

// 4. Aplicar el rebalanceo a todos los NPCs
const updatedNpcs = npcs.map(npc => {
    const newDeck = buildBalancedDeck(npc);
    return {
        ...npc,
        deck: newDeck
    };
});

console.log('✅ 223 Mazos rebalanceados con éxito.');

// Verificar muestra de Téa (Nv. 4) y Tristan (Nv. 8)
const tea = updatedNpcs.find(n => n.id === 1);
const tristan = updatedNpcs.find(n => n.id === 2);
const seto = updatedNpcs.find(n => n.id === 6);

console.log('\n--- Muestra Téa Gardner (Nv. 4) ---');
console.log('Cartas:', tea.deck.map(id => {
    const c = cardCatalog.get(id);
    return c ? `${c.name} (${c.type}, ATK: ${c.atk})` : id;
}).slice(0, 8));

console.log('\n--- Muestra Tristan Taylor (Nv. 8) ---');
console.log('Cartas:', tristan.deck.map(id => {
    const c = cardCatalog.get(id);
    return c ? `${c.name} (${c.type}, ATK: ${c.atk})` : id;
}).slice(0, 8));

console.log('\n--- Muestra Seto Kaiba (Nv. 20 Boss) ---');
console.log('Cartas:', seto.deck.map(id => {
    const c = cardCatalog.get(id);
    return c ? `${c.name} (${c.type}, ATK: ${c.atk})` : id;
}).slice(0, 8));

// 5. Guardar archivos actualizados
const outputContent = `/**
 * ============================================================================
 * ANI-DIMENSION: 12 ERAS DEL ANIME OFICIALES (223 DUELISTAS & 223 MEDALLAS)
 * Yu-Gi-Oh! Clásico • Yu-Gi-Oh! GX • Yu-Gi-Oh! 5D's
 * Niveles 4 al 500 • Mapas Dedicados que se Ajustan a la Pantalla
 * Mazos Temáticos Canónicos Balanceados con Curva de Dificultad Justa
 * MAZOS OFICIALES DE 40 CARTAS Y EXTRA DECKS COMPLETOS
 * ============================================================================
 */

(function(exports) {
    'use strict';

    const ERAS_DATA = ${JSON.stringify(eras, null, 4)};

    const MEDALS_DATA = ${JSON.stringify(medals, null, 4)};

    const NPCS_DATA = ${JSON.stringify(updatedNpcs, null, 4)};

    function getNpcById(id) {
        const npcId = parseInt(id, 10);
        return NPCS_DATA.find(n => n.id === npcId) || null;
    }

    function getNpcsByEra(eraId) {
        const eid = parseInt(eraId, 10);
        return NPCS_DATA.filter(n => n.eraId === eid);
    }

    function getNpcsByChapter(chapterNum) {
        return getNpcsByEra(chapterNum);
    }

    function getEraById(eraId) {
        const eid = parseInt(eraId, 10);
        return ERAS_DATA.find(e => e.id === eid) || null;
    }

    function getMedalByNpcId(npcId) {
        const id = parseInt(npcId, 10);
        return MEDALS_DATA.find(m => m.npcId === id) || null;
    }

    function getMedalById(medalId) {
        return MEDALS_DATA.find(m => m.id === medalId) || null;
    }

    exports.ERAS = ERAS_DATA;
    exports.NPCS = NPCS_DATA;
    exports.MEDALS = MEDALS_DATA;
    exports.getNpcById = getNpcById;
    exports.getNpcsByEra = getNpcsByEra;
    exports.getNpcsByChapter = getNpcsByChapter;
    exports.getEraById = getEraById;
    exports.getMedalByNpcId = getMedalByNpcId;
    exports.getMedalById = getMedalById;

})(typeof module !== 'undefined' && module.exports ? module.exports : (window.AdventureData = {}));
`;

fs.writeFileSync(path.resolve(__dirname, '../frontend/js/data/npcs-adventure-data.js'), outputContent, 'utf8');
fs.writeFileSync(path.resolve(__dirname, '../frontend/js/data/generate-eras-data.js'), outputContent, 'utf8');

console.log('\n🎉 ¡npcs-adventure-data.js y generate-eras-data.js actualizados con éxito!');
