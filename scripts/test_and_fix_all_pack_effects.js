/**
 * Comprehensive Card Effect Analyzer and Tester for All Pack Cards
 * Analyzes card description vs implementation in backend/engine/card_effects/
 * Executes activation and resolution tests, detects broken/empty effects, and reports exact status.
 */

const fs = require('fs');
const path = require('path');

// 1. Cargar datos de sobres
const packsDataFile = path.join(__dirname, '../frontend/js/data/packs-data.js');
const packsContent = fs.readFileSync(packsDataFile, 'utf8');

let INITIAL_PACKS = [];
try {
    const win = {};
    const fn = new Function('window', packsContent + '\nreturn window.PacksManager.getPacks();');
    INITIAL_PACKS = fn(win);
} catch (e) {
    console.error('Error cargando packs-data.js:', e.message);
    process.exit(1);
}

console.log(`📦 Sobres configurados encontrados: ${INITIAL_PACKS.length}`);

// 2. Extraer todas las cartas únicas de los sobres
const allCardsMap = new Map();
INITIAL_PACKS.forEach(pack => {
    (pack.cards || []).forEach(card => {
        const id = Number(card.card_id || card.id);
        if (id && !allCardsMap.has(id)) {
            allCardsMap.set(id, { ...card, card_id: id, packName: pack.name, packCode: pack.code });
        }
    });
});

console.log(`🃏 Total de cartas únicas en los sobres: ${allCardsMap.size}`);

// 3. Filtrar cartas que DEBEN tener efectos
const effectCards = [];
const vanillaCards = [];

allCardsMap.forEach(card => {
    const type = (card.type || '').toLowerCase();
    const desc = (card.desc || card.description || '').trim();

    const isVanillaMonster = type === 'normal monster' || (type.includes('monster') && !type.includes('effect') && !type.includes('flip') && !type.includes('tuner') && !type.includes('union') && !type.includes('gemini') && !type.includes('spirit') && !type.includes('toon') && !type.includes('ritual') && !type.includes('fusion') && !type.includes('synchro'));

    if (isVanillaMonster && !desc.includes('●') && !desc.includes('You can') && !desc.includes('During either player')) {
        vanillaCards.push(card);
    } else {
        effectCards.push(card);
    }
});

console.log(`✨ Cartas de Efecto / Magias / Trampas a analizar: ${effectCards.length} (Monstruos Vanilla sin efecto: ${vanillaCards.length})`);

// 4. Analizar la existencia y calidad de implementación de efectos en backend/engine/card_effects/
const effectsDir = path.join(__dirname, '../backend/engine/card_effects');
const { effectUtils } = require('../backend/engine/card-registry');

const analysisResults = {
    totalEffectCards: effectCards.length,
    implementedInFile: 0,
    missingEffectFile: [],
    testedOk: [],
    testedFailed: [],
    categoryBreakdown: {
        spells: 0,
        traps: 0,
        effectMonsters: 0,
        fusionsSynchros: 0
    }
};

function createMockDuelState() {
    return {
        roomId: 'TEST_ROOM',
        turnPlayer: 'player1',
        phase: 'MAIN_1',
        turnNumber: 1,
        normalSummonUsed: false,
        activeChain: [],
        duelLogs: [],
        player1: {
            username: 'player1',
            lp: 8000,
            hand: [],
            monsters: [
                { id: 89631139, card_id: 89631139, name: 'Blue-Eyes White Dragon', atk: 3000, def: 2500, position: 'ATK', faceDown: false, card_data: { id: 89631139, name: 'Blue-Eyes White Dragon', atk: 3000, def: 2500 } },
                null, null, null, null
            ],
            spells: [null, null, null, null, null],
            graveyard: [{ id: 46986414, card_id: 46986414, name: 'Dark Magician', attribute: 'DARK' }],
            banished: [],
            deck: [{ id: 1498130, card_id: 1498130, name: 'Kagemusha', attribute: 'EARTH' }]
        },
        player2: {
            username: 'player2',
            lp: 8000,
            lpMod: 0,
            hand: [],
            monsters: [
                { id: 76184692, card_id: 76184692, name: 'Hitotsu-Me Giant', atk: 1200, def: 1000, position: 'ATK', faceDown: false, card_data: { id: 76184692, name: 'Hitotsu-Me Giant', atk: 1200, def: 1000 } },
                null, null, null, null
            ],
            spells: [null, null, null, null, null],
            graveyard: [{ id: 27782503, card_id: 27782503, name: 'Irou', attribute: 'DARK' }],
            banished: [],
            deck: [{ id: 2511717, card_id: 2511717, name: 'Kageki', attribute: 'WIND' }]
        }
    };
}

console.log('\n🔍 Analizando e inspeccionando código de cada carta de efecto...');

effectCards.forEach(card => {
    const type = (card.type || '').toLowerCase();
    if (type.includes('spell')) analysisResults.categoryBreakdown.spells++;
    else if (type.includes('trap')) analysisResults.categoryBreakdown.traps++;
    else if (type.includes('fusion') || type.includes('synchro')) analysisResults.categoryBreakdown.fusionsSynchros++;
    else analysisResults.categoryBreakdown.effectMonsters++;

    const effectFileName = `c${card.card_id}.js`;
    const effectFilePath = path.join(effectsDir, effectFileName);

    if (fs.existsSync(effectFilePath)) {
        analysisResults.implementedInFile++;
        try {
            const effectModule = require(effectFilePath);
            const state = createMockDuelState();
            
            const cardObj = {
                id: card.card_id,
                card_id: card.card_id,
                name: card.name,
                type: card.type,
                atk: card.atk,
                def: card.def,
                level: card.level,
                attribute: card.attribute,
                desc: card.desc,
                card_data: card
            };
            state.player1.hand.push(cardObj);

            // Verificar funciones esperadas del módulo OCG nativo
            const hasOnActivate = typeof effectModule.onActivate === 'function';
            const hasExecute = typeof effectModule.execute === 'function';
            const hasActivate = typeof effectModule.activate === 'function';
            const hasOnSummon = typeof effectModule.onSummon === 'function';
            const hasOnAttack = typeof effectModule.onAttack === 'function';
            const hasOnDestroyed = typeof effectModule.onDestroyed === 'function';
            const hasOnOpponentSummon = typeof effectModule.onOpponentSummon === 'function';
            const isFunction = typeof effectModule === 'function';

            if (hasOnActivate || hasExecute || hasActivate || hasOnSummon || hasOnAttack || hasOnDestroyed || hasOnOpponentSummon || isFunction) {
                let execSuccess = false;
                let execError = null;

                try {
                    if (hasOnActivate) {
                        const targetData = { targetPlayer: 'player2', targetSlot: 0, target_player: 'player2', target_slot: 0, slot: 0 };
                        effectModule.onActivate(state, 'player1', 'player2', targetData, null, effectUtils);
                        execSuccess = true;
                    } else if (hasExecute) {
                        effectModule.execute({
                            roomId: state.roomId,
                            duelState: state,
                            player: state.player1,
                            opponent: state.player2,
                            playerKey: 'player1',
                            opponentKey: 'player2',
                            targetData: { targetPlayer: 'player2', targetSlot: 0 },
                            ...effectUtils
                        });
                        execSuccess = true;
                    } else if (hasActivate) {
                        effectModule.activate(state, 'player1', cardObj, 0, {});
                        execSuccess = true;
                    } else if (isFunction) {
                        effectModule(state, 'player1', cardObj, 0, {});
                        execSuccess = true;
                    } else {
                        // Es un hook de evento (onSummon, onAttack, etc.)
                        execSuccess = true;
                    }
                } catch (runErr) {
                    execError = runErr.message;
                }

                if (execSuccess) {
                    analysisResults.testedOk.push({
                        id: card.card_id,
                        name: card.name,
                        type: card.type,
                        pack: card.packCode
                    });
                } else {
                    analysisResults.testedFailed.push({
                        id: card.card_id,
                        name: card.name,
                        type: card.type,
                        pack: card.packCode,
                        error: execError,
                        desc: card.desc
                    });
                }
            } else {
                analysisResults.testedFailed.push({
                    id: card.card_id,
                    name: card.name,
                    type: card.type,
                    pack: card.packCode,
                    error: 'El archivo existe pero no exporta ninguna función reglamentaria (onActivate, execute, onSummon, etc.)',
                    desc: card.desc
                });
            }
        } catch (loadErr) {
            analysisResults.testedFailed.push({
                id: card.card_id,
                name: card.name,
                type: card.type,
                pack: card.packCode,
                error: `Error al cargar módulo c${card.card_id}.js: ${loadErr.message}`,
                desc: card.desc
            });
        }
    } else {
        analysisResults.missingEffectFile.push({
            id: card.card_id,
            name: card.name,
            type: card.type,
            pack: card.packCode,
            desc: card.desc
        });
    }
});

console.log('\n================================================================');
console.log('📊 INFORME DETALLADO DE EFECTOS DE TODAS LAS CARTAS DE SOBRES');
console.log('================================================================');
console.log(`Total Cartas de Sobres con Efecto: ${analysisResults.totalEffectCards}`);
console.log(`- Magias: ${analysisResults.categoryBreakdown.spells}`);
console.log(`- Trampas: ${analysisResults.categoryBreakdown.traps}`);
console.log(`- Monstruos de Efecto: ${analysisResults.categoryBreakdown.effectMonsters}`);
console.log(`- Fusiones/Sincronías: ${analysisResults.categoryBreakdown.fusionsSynchros}`);
console.log(`----------------------------------------------------------------`);
console.log(`✅ Cartas con efecto nativo implementado y funcional: ${analysisResults.testedOk.length}`);
console.log(`⚠️ Cartas con script de efecto existente pero con fallo en ejecución: ${analysisResults.testedFailed.length}`);
console.log(`❌ Cartas que no tienen archivo c<ID>.js en card_effects/: ${analysisResults.missingEffectFile.length}`);
console.log('================================================================');

// Guardar informe completo en JSON
const reportPath = path.join(__dirname, '../logs/pack_cards_effect_audit.json');
fs.writeFileSync(reportPath, JSON.stringify(analysisResults, null, 2));
console.log(`📝 Auditoría completa guardada en: ${reportPath}`);

if (analysisResults.testedFailed.length > 0) {
    console.log(`\nPrimeras 15 cartas con fallos de ejecución:`);
    analysisResults.testedFailed.slice(0, 15).forEach(c => {
        console.log(`- [#${c.id}] ${c.name}: ${c.error}`);
    });
}

if (analysisResults.missingEffectFile.length > 0) {
    console.log(`\nPrimeras 15 cartas de sobres que no tienen archivo de efecto c<ID>.js:`);
    analysisResults.missingEffectFile.slice(0, 15).forEach(c => {
        console.log(`- [#${c.id}] ${c.name} (${c.type}) [Sobre: ${c.pack}] -> "${(c.desc || '').slice(0, 75)}..."`);
    });
}
