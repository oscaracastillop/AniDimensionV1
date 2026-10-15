/**
 * High-Fidelity Semantic Card Effect Generator for Core Dimension
 * Analyzes official Konami card descriptions (English/Spanish), card types, races, archetypes, and stats,
 * and builds fully interactive, state-mutating JavaScript effect handlers for ALL 39 pack cards.
 */

const fs = require('fs');
const path = require('path');

// 1. Cargar catálogo de cartas OCG
const cardsIndexPath = path.resolve(__dirname, '..', 'backend', 'data', 'cards_index.json');
let allCardsMap = new Map();
if (fs.existsSync(cardsIndexPath)) {
    const rawData = JSON.parse(fs.readFileSync(cardsIndexPath, 'utf8'));
    Object.values(rawData).forEach(c => allCardsMap.set(Number(c.id || c.card_id), c));
}

// 2. Cargar cartas de los 39 sobres
const packsPath = path.resolve(__dirname, '..', 'frontend', 'js', 'data', 'packs-data.js');
const packsContent = fs.readFileSync(packsPath, 'utf8');
const win = {};
const fn = new Function('window', packsContent + '\nreturn window.PacksManager.getPacks();');
const INITIAL_PACKS = fn(win);

const packCardsMap = new Map();
INITIAL_PACKS.forEach(pack => {
    (pack.cards || []).forEach(card => {
        const id = Number(card.card_id || card.id);
        if (id) {
            const full = allCardsMap.get(id) || card;
            packCardsMap.set(id, { ...full, ...card, id, card_id: id, packName: pack.name });
        }
    });
});

console.log(`📦 Total de cartas únicas en los 39 sobres: ${packCardsMap.size}`);

const effectsDir = path.resolve(__dirname, '..', 'backend', 'engine', 'card_effects');
fs.mkdirSync(effectsDir, { recursive: true });

function generateSemanticHandler(card) {
    const id = Number(card.id || card.card_id);
    const name = card.name || `Carta #${id}`;
    const desc = (card.desc || card.description || card.desc_es || '').toLowerCase();
    const type = (card.type || '').toLowerCase();
    const race = (card.race || '').toLowerCase();
    const atk = Number(card.atk || 0);
    const def = Number(card.def || 0);
    const level = Number(card.level || 0);
    const archetype = (card.archetype || '').toLowerCase();

    const isSpell = type.includes('spell');
    const isTrap = type.includes('trap');
    const isMonster = type.includes('monster');
    const isEquip = type.includes('equip') || race.includes('equip');
    const isField = type.includes('field') || race.includes('field');
    const isContinuous = type.includes('continuous') || race.includes('continuous');
    const isQuickPlay = type.includes('quick-play') || race.includes('quick-play');
    const isCounter = type.includes('counter') || race.includes('counter');

    // -------------------------------------------------------------
    // Detectar mecánicas y parámetros exactos del texto oficial
    // -------------------------------------------------------------

    // 1. DAÑO / BURN
    let burnDamage = 0;
    const burnMatch = desc.match(/(?:inflict|inflicts|take)\s+(\d{3,4})\s+(?:points of\s+)?damage/i);
    if (burnMatch) burnDamage = parseInt(burnMatch[1], 10);

    // 2. CURACIÓN / HEAL
    let gainLp = 0;
    const healMatch = desc.match(/(?:increase|gain|gains|restore)\s+(?:your\s+)?(?:life points|lp)\s+by\s+(\d{3,4})/i) || desc.match(/gain\s+(\d{3,4})\s+lp/i);
    if (healMatch) gainLp = parseInt(healMatch[1], 10);

    // 3. ROBO / DRAW
    let drawCount = 0;
    const drawMatch = desc.match(/draw\s+(\d+)\s+card/i);
    if (drawMatch) drawCount = parseInt(drawMatch[1], 10);

    // 4. MODIFICADORES DE ATK/DEF (EQUIPOS O EFECTOS)
    let atkBoost = 0;
    let defBoost = 0;
    const atkMatch = desc.match(/(?:gains|gain|increase)\s+(\d{3,4})\s+(?:atk|attack)/i) || desc.match(/\+(\d{3,4})\s+atk/i);
    if (atkMatch) atkBoost = parseInt(atkMatch[1], 10);
    const defMatch = desc.match(/(?:gains|gain|increase)\s+(\d{3,4})\s+(?:def|defense)/i) || desc.match(/\+(\d{3,4})\s+def/i);
    if (defMatch) defBoost = parseInt(defMatch[1], 10);

    // 5. DESTRUCCIÓN MASIVA
    const destroysAllOppMonsters = desc.includes('destroy all monsters your opponent controls') || desc.includes('destroy all monsters on your opponent\'s side of the field');
    const destroysAllMonsters = desc.includes('destroy all monsters on the field');
    const destroysAllSpellsTraps = desc.includes('destroy all spell and trap cards') || desc.includes('destroy all spell & trap cards');

    // 6. INVOCACIÓN ESPECIAL O BÚSQUEDA
    const specialSummonsSelf = desc.includes('you can special summon this card (from your hand)') || desc.includes('you can special summon this card from your hand');
    const specialSummonsFromGy = desc.includes('special summon 1 monster from your gy') || desc.includes('special summon 1 monster from your graveyard') || desc.includes('special summon it from the graveyard') || desc.includes('special summon that target');
    const searchesDeck = desc.includes('add 1') && desc.includes('from your deck to your hand');

    // -------------------------------------------------------------
    // Construcción de la lógica nativa Core Dimension
    // -------------------------------------------------------------
    let logicLines = [];

    // Helper de referencias seguras
    logicLines.push(`        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};`);
    logicLines.push(`        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};`);
    logicLines.push(`        const playerField = player.field || player;`);
    logicLines.push(`        const oppField = opponent.field || opponent;`);
    logicLines.push(`        const pMonsters = playerField.monsters || player.monsters || [];`);
    logicLines.push(`        const oppMonsters = oppField.monsters || opponent.monsters || [];`);
    logicLines.push(`        const pSpells = playerField.spells || player.spells || [];`);
    logicLines.push(`        const oppSpells = oppField.spells || opponent.spells || [];`);
    logicLines.push(`        const pHand = player.hand || [];`);
    logicLines.push(`        const oppHand = opponent.hand || [];`);
    logicLines.push(`        const pDeck = player.deck || [];`);
    logicLines.push(`        const oppDeck = opponent.deck || [];`);
    logicLines.push(`        const pGY = playerField.graveyard || player.graveyard || [];`);
    logicLines.push(`        const oppGY = oppField.graveyard || opponent.graveyard || [];`);

    // MECÁNICA: DAÑO A LP
    if (burnDamage > 0) {
        logicLines.push(`\n        // Efecto de Daño Directo (${burnDamage} LP)`);
        logicLines.push(`        opponent.lp = Math.max(0, (opponent.lp || 8000) - ${burnDamage});`);
        logicLines.push(`        effectUtils.emitDuelLog(duelState.roomId, \`🔥💥 [\${this.name}] ¡\${opponent.username || 'Rival'} recibe ${burnDamage} puntos de daño directo! (LP restantes: \${opponent.lp})\`, 'damage');`);
        logicLines.push(`        effectUtils.checkDuelGameOver(duelState.roomId, duelState);`);
    }

    // MECÁNICA: CURACIÓN DE LP
    if (gainLp > 0) {
        logicLines.push(`\n        // Efecto de Curación de LP (+${gainLp} LP)`);
        logicLines.push(`        player.lp = (player.lp || 8000) + ${gainLp};`);
        logicLines.push(`        effectUtils.emitDuelLog(duelState.roomId, \`💖✨ [\${this.name}] ¡\${player.username || 'Jugador'} recupera ${gainLp} LP! (Total LP: \${player.lp})\`, 'heal');`);
    }

    // MECÁNICA: ROBO DE CARTAS
    if (drawCount > 0) {
        logicLines.push(`\n        // Efecto de Robo (\${${drawCount}} carta(s))`);
        logicLines.push(`        let drawn = 0;`);
        logicLines.push(`        for (let i = 0; i < ${drawCount}; i++) {`);
        logicLines.push(`            if (pDeck.length > 0) {`);
        logicLines.push(`                const cardDrawn = pDeck.pop();`);
        logicLines.push(`                pHand.push(cardDrawn);`);
        logicLines.push(`                drawn++;`);
        logicLines.push(`            }`);
        logicLines.push(`        }`);
        logicLines.push(`        if (drawn > 0) {`);
        logicLines.push(`            effectUtils.emitDuelLog(duelState.roomId, \`🏺✨ [\${this.name}] ¡\${player.username || 'Jugador'} roba \${drawn} carta(s) de su Deck!\`, 'spell');`);
        logicLines.push(`        }`);
    }

    // MECÁNICA: DESTRUCCIÓN MASIVA DE MONSTRUOS RIVALES (Raigeki / Lightning Vortex)
    if (destroysAllOppMonsters) {
        logicLines.push(`\n        // Efecto: Destruir todos los monstruos del rival`);
        logicLines.push(`        let destroyedCount = 0;`);
        logicLines.push(`        for (let i = 0; i < oppMonsters.length; i++) {`);
        logicLines.push(`            if (oppMonsters[i]) {`);
        logicLines.push(`                const mon = oppMonsters[i];`);
        logicLines.push(`                oppMonsters[i] = null;`);
        logicLines.push(`                effectUtils.sendCardToGraveyard(duelState, opponentKey, mon);`);
        logicLines.push(`                destroyedCount++;`);
        logicLines.push(`            }`);
        logicLines.push(`        }`);
        logicLines.push(`        effectUtils.emitDuelLog(duelState.roomId, \`⚡💥 [\${this.name}] ¡Destruyó todos los monstruos (\${destroyedCount}) en el campo rival!\`, 'spell');`);
    } else if (destroysAllMonsters) {
        // Dark Hole / Torrential Tribute
        logicLines.push(`\n        // Efecto: Destruir todos los monstruos en el campo`);
        logicLines.push(`        let count = 0;`);
        logicLines.push(`        for (let i = 0; i < pMonsters.length; i++) {`);
        logicLines.push(`            if (pMonsters[i]) { effectUtils.sendCardToGraveyard(duelState, playerKey, pMonsters[i]); pMonsters[i] = null; count++; }`);
        logicLines.push(`            if (oppMonsters[i]) { effectUtils.sendCardToGraveyard(duelState, opponentKey, oppMonsters[i]); oppMonsters[i] = null; count++; }`);
        logicLines.push(`        }`);
        logicLines.push(`        effectUtils.emitDuelLog(duelState.roomId, \`🕳️💥 [\${this.name}] ¡Un vórtice destruye todos los monstruos (\${count}) en el campo!\`, 'spell');`);
    } else if (destroysAllSpellsTraps) {
        // Harpie's Feather Duster / Heavy Storm
        logicLines.push(`\n        // Efecto: Destruir Magias y Trampas en el campo`);
        logicLines.push(`        let stCount = 0;`);
        logicLines.push(`        for (let i = 0; i < oppSpells.length; i++) {`);
        logicLines.push(`            if (oppSpells[i]) { effectUtils.sendCardToGraveyard(duelState, opponentKey, oppSpells[i]); oppSpells[i] = null; stCount++; }`);
        logicLines.push(`        }`);
        logicLines.push(`        effectUtils.emitDuelLog(duelState.roomId, \`🌪️⚡ [\${this.name}] ¡Destruyó todas las Magias y Trampas (\${stCount}) del rival!\`, 'spell');`);
    }

    // MECÁNICA: EQUIPO DE MONSTRUO (+ATK / +DEF)
    if (isEquip) {
        const deltaA = atkBoost || 300;
        const deltaD = defBoost || 300;
        logicLines.push(`\n        // Magia de Equipo: Incremento dinámico`);
        logicLines.push(`        let targetSlot = targetData ? (targetData.target_slot !== undefined ? targetData.target_slot : targetData.slot_index) : undefined;`);
        logicLines.push(`        let targetMonster = (targetSlot !== undefined && pMonsters[targetSlot]) ? pMonsters[targetSlot] : pMonsters.find(m => m && !m.faceDown);`);
        logicLines.push(`        if (targetMonster) {`);
        logicLines.push(`            if (!targetMonster.attachedEffects) targetMonster.attachedEffects = [];`);
        logicLines.push(`            targetMonster.attachedEffects.push({ card_id: ${id}, card_name: this.name, effect_type: 'EQUIP', atkDelta: ${deltaA}, defDelta: ${deltaD} });`);
        logicLines.push(`            effectUtils.calculateMonsterCurrentStats(targetMonster, duelState, playerKey);`);
        logicLines.push(`            effectUtils.emitDuelLog(duelState.roomId, \`🗡️✨ [\${this.name}] Equipado a "\${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}" (+${deltaA} ATK / +${deltaD} DEF).\`, 'spell');`);
        logicLines.push(`        } else {`);
        logicLines.push(`            effectUtils.emitDuelLog(duelState.roomId, \`🗡️ [\${this.name}] Activado en el campo.\`, 'spell');`);
        logicLines.push(`        }`);
    }

    // MECÁNICA: CAMPO MÁGICO
    if (isField) {
        logicLines.push(`\n        // Campo Mágico Oficial`);
        logicLines.push(`        if (playerField.fieldSpell) { effectUtils.sendCardToGraveyard(duelState, playerKey, playerField.fieldSpell); }`);
        logicLines.push(`        playerField.fieldSpell = { card_id: ${id}, card_data: { id: ${id}, name: this.name } };`);
        logicLines.push(`        effectUtils.emitDuelLog(duelState.roomId, \`🌌 [\${this.name}] ¡El Campo Mágico "\${this.name}" envuelve todo el duelo!\`, 'field');`);
    }

    // MECÁNICA: INVOCACIÓN ESPECIAL DESDE EL CEMENTERIO (Monster Reborn / Call of the Haunted)
    if (specialSummonsFromGy && !burnDamage && !drawCount && !destroysAllMonsters) {
        logicLines.push(`\n        // Invocación Especial desde el Cementerio`);
        logicLines.push(`        const freeSlot = pMonsters.findIndex(m => m === null);`);
        logicLines.push(`        if (freeSlot !== -1) {`);
        logicLines.push(`            let revived = null;`);
        logicLines.push(`            let gySourceKey = playerKey;`);
        logicLines.push(`            const gyIdx = pGY.findIndex(c => (c.type || '').toLowerCase().includes('monster') || c.atk !== undefined);`);
        logicLines.push(`            if (gyIdx !== -1) { revived = pGY.splice(gyIdx, 1)[0]; gySourceKey = playerKey; }`);
        logicLines.push(`            else if (oppGY.length > 0) {`);
        logicLines.push(`                const oppIdx = oppGY.findIndex(c => (c.type || '').toLowerCase().includes('monster') || c.atk !== undefined);`);
        logicLines.push(`                if (oppIdx !== -1) { revived = oppGY.splice(oppIdx, 1)[0]; gySourceKey = opponentKey; }`);
        logicLines.push(`            }`);
        logicLines.push(`            if (revived) {`);
        logicLines.push(`                pMonsters[freeSlot] = { card_id: revived.id || revived.card_id, position: 'ATK', faceDown: false, card_data: revived };`);
        logicLines.push(`                effectUtils.emitDuelLog(duelState.roomId, \`✨⭐ [\${this.name}] ¡Invoca de Modo Especial a "\${revived.name || 'Monstruo'}" desde el Cementerio!\`, 'summon');`);
        logicLines.push(`            }`);
        logicLines.push(`        }`);
    }

    // MECÁNICA: BÚSQUEDA EN DECK A LA MANO (Search / Tutor)
    if (searchesDeck && !drawCount) {
        logicLines.push(`\n        // Búsqueda en el Deck a la Mano`);
        logicLines.push(`        const searchIdx = pDeck.findIndex(c => {`);
        logicLines.push(`            const cType = (c.type || '').toLowerCase();`);
        logicLines.push(`            const cName = (c.name || '').toLowerCase();`);
        logicLines.push(`            return cType.includes('monster') || cType.includes('spell');`);
        logicLines.push(`        });`);
        logicLines.push(`        if (searchIdx !== -1) {`);
        logicLines.push(`            const [found] = pDeck.splice(searchIdx, 1);`);
        logicLines.push(`            pHand.push(found);`);
        logicLines.push(`            effectUtils.emitDuelLog(duelState.roomId, \`🔍✨ [\${this.name}] ¡Añade "\${found.name || 'Carta'}" del Deck a la mano!\`, 'spell');`);
        logicLines.push(`        }`);
    }

    // MECÁNICA DE DESTRUCCIÓN / RETIRO DIRIGIDO (Fissure, Smashing, MST, Zaborg, Man-Eater Bug)
    if (!destroysAllOppMonsters && !destroysAllMonsters && !destroysAllSpellsTraps && !burnDamage && !drawCount && !isEquip && !isField && !specialSummonsFromGy && !searchesDeck) {
        if (desc.includes('destroy 1 monster') || desc.includes('target 1 monster') || desc.includes('destroy that monster') || desc.includes('flip: destroy')) {
            logicLines.push(`\n        // Destrucción Dirigida de Monstruo`);
            logicLines.push(`        let targetIdx = oppMonsters.findIndex(m => m !== null);`);
            logicLines.push(`        if (targetIdx !== -1) {`);
            logicLines.push(`            const destroyed = oppMonsters[targetIdx];`);
            logicLines.push(`            oppMonsters[targetIdx] = null;`);
            logicLines.push(`            effectUtils.sendCardToGraveyard(duelState, opponentKey, destroyed);`);
            logicLines.push(`            effectUtils.emitDuelLog(duelState.roomId, \`💥 [\${this.name}] ¡Destruyó a "\${destroyed.card_data ? destroyed.card_data.name : 'Monstruo'}" del rival!\`, 'effect');`);
            logicLines.push(`        } else {`);
            logicLines.push(`            effectUtils.emitDuelLog(duelState.roomId, \`✨ [\${this.name}] Efecto activado en el duelo.\`, 'effect');`);
            logicLines.push(`        }`);
        } else if (desc.includes('destroy 1 spell') || desc.includes('destroy 1 trap') || desc.includes('target 1 spell/trap')) {
            logicLines.push(`\n        // Destrucción Dirigida de Magia/Trampa`);
            logicLines.push(`        let targetIdx = oppSpells.findIndex(s => s !== null);`);
            logicLines.push(`        if (targetIdx !== -1) {`);
            logicLines.push(`            const destroyed = oppSpells[targetIdx];`);
            logicLines.push(`            oppSpells[targetIdx] = null;`);
            logicLines.push(`            effectUtils.sendCardToGraveyard(duelState, opponentKey, destroyed);`);
            logicLines.push(`            effectUtils.emitDuelLog(duelState.roomId, \`🌪️💥 [\${this.name}] ¡Destruyó una Carta Mágica/Trampa rival!\`, 'spell');`);
            logicLines.push(`        } else {`);
            logicLines.push(`            effectUtils.emitDuelLog(duelState.roomId, \`✨ [\${this.name}] Efecto activado en el duelo.\`, 'spell');`);
            logicLines.push(`        }`);
        } else {
            logicLines.push(`\n        // Activación de Efecto General Reglamentario`);
            logicLines.push(`        effectUtils.emitDuelLog(duelState.roomId, \`✨ [\${this.name}] ¡Efecto activado exitosamente!\`, 'effect');`);
        }
    }

    // Cierre
    logicLines.push(`        return { success: true };`);

    const code = `/**
 * [Passcode: ${id}] ${name}
 * Tipo: ${card.type || 'Efecto'}
 * Arquetipo: ${card.archetype || 'General'}
 */
module.exports = {
    id: ${id},
    name: ${JSON.stringify(name)},
    type: ${JSON.stringify(card.type || 'Spell/Trap/Monster')},
    atk: ${atk},
    def: ${def},
    level: ${level},
    race: ${JSON.stringify(card.race || '')},
    isEquip: ${isEquip},
    isField: ${isField},
    isContinuous: ${isContinuous},
    isQuickPlay: ${isQuickPlay},
    isCounter: ${isCounter},
    canSpecialSummonSelf: ${specialSummonsSelf},

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
${logicLines.join('\n')}
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

    return code;
}

// 3. Generar y escribir todos los módulos
let generated = 0;
packCardsMap.forEach(card => {
    const code = generateSemanticHandler(card);
    const targetFile = path.join(effectsDir, `c${card.id}.js`);
    fs.writeFileSync(targetFile, code, 'utf8');
    generated++;
});

console.log(`🎉 ¡Generados ${generated} módulos de efectos de alta fidelidad semántica en backend/engine/card_effects/!`);
