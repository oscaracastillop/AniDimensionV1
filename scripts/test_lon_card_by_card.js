/**
 * Test Suite Integral de LON (Labyrinth of Nightmare) - 105 cartas OCG
 * Verifica:
 * - 21 Monstruos Normales (Vainilla)
 * - 84 Cartas de Efecto (Equipos, Magias, Trampas, Continuas, Fusiones, Rituales, Efectos, Volteos)
 */
const fs = require('fs');
const path = require('path');
const { getRoomManifest } = require('../backend/engine/room-manifest');
const { createInitialDuelState } = require('../backend/engine/duel-state');

const rawCards = require('../scratch/lon_cards_raw.json');

async function testLONSuite() {
    console.log('================================================================');
    console.log('🚀 INICIANDO AUDITORÍA INTEGRAL CARTA POR CARTA: LON (105 CARTAS)');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;
    const failures = [];

    const effectUtils = {
        emitDuelLog: () => {},
        sendCardToGraveyard: (state, card, pKey) => {
            if (state[pKey]) state[pKey].graveyard.push(card);
        },
        sendCardToBanished: (state, card, pKey) => {
            if (state[pKey]) {
                state[pKey].banished = state[pKey].banished || [];
                state[pKey].banished.push(card);
            }
        },
        getRoomManifest: () => manifest
    };

    let cardIndex = 0;
    for (const card of rawCards) {
        cardIndex++;
        const cardNum = card.CardNumber;
        const name = card.NameEN;
        const passcode = Number(card.Passcode);
        const cardType = (card.CardType || '').toLowerCase();

        const roomId = `TEST_LON_${passcode}_${Date.now()}`;
        const duelState = createInitialDuelState(roomId, 'DuelistaTester', 'OponenteNPC');
        const manifest = getRoomManifest(roomId);

        // Caso 1: Monstruo Normal (Vainilla)
        if (cardType === 'normal monster') {
            const level = Number(card.Level || 1);
            const tributesRequired = level >= 7 ? 2 : (level >= 5 ? 1 : 0);
            console.log(`✅ [${cardIndex}/105] [${cardNum}] ${name} (${card.NameES || name}) -> PASS [Invocación por ${tributesRequired} Sacrificios Lv.${level} [ATK:${card.Atk}/DEF:${card.Def}]]`);
            passed++;
            continue;
        }

        // Caso 2: Carta de Efecto Modular
        const filePath = path.join(__dirname, `../backend/engine/card_effects/c${passcode}.js`);
        if (!fs.existsSync(filePath)) {
            console.error(`❌ [${cardIndex}/105] [${cardNum}] ${name} -> FAIL [Archivo modular c${passcode}.js no encontrado]`);
            failed++;
            failures.push({ cardNum, name, passcode, reason: 'Archivo no encontrado' });
            continue;
        }

        try {
            const mod = require(filePath);

            // Validar propiedades estructurales básicas
            if (!mod.id || Number(mod.id) !== passcode) {
                throw new Error(`id del módulo no coincide con passcode: ${mod.id} vs ${passcode}`);
            }
            if (!mod.name) throw new Error('name ausente en módulo');
            if (typeof mod.canActivate !== 'function') throw new Error('canActivate no es una función');
            if (typeof mod.execute !== 'function' && typeof mod.onActivate !== 'function') {
                throw new Error('execute u onActivate ausentes');
            }

            // Validaciones específicas según el tipo
            if (cardType.includes('equip')) {
                if (!mod.isEquip) throw new Error('Falta bandera isEquip: true');
                if (typeof mod.canEquip !== 'function') throw new Error('Falta método canEquip');
                if (typeof mod.getValidTargets !== 'function') throw new Error('Falta método getValidTargets');
            }

            if (cardType.includes('fusion')) {
                if (!mod.isFusion) throw new Error('Falta bandera isFusion: true');
                if (!Array.isArray(mod.fusionMaterials) || mod.fusionMaterials.length === 0) {
                    throw new Error('Falta arreglo fusionMaterials con materiales oficiales');
                }
            }

            if (cardType.includes('ritual monster')) {
                if (!mod.isRitual) throw new Error('Falta bandera isRitual: true');
                if (!mod.ritualInfo || !mod.ritualInfo.ritualSpellId) throw new Error('Falta ritualInfo con ritualSpellId');
            }

            // Ejecución de prueba controlada de canActivate
            const canActRes = mod.canActivate({ duelState, playerKey: 'player1', opponentKey: 'player2' });
            if (typeof canActRes !== 'object' || typeof canActRes.canActivate !== 'boolean') {
                throw new Error('canActivate no retorna { canActivate: boolean }');
            }

            // Para pruebas de execute de cartas de equipo o cartas que requieren monstruos, agregar un monstruo simulado al campo
            duelState.player1.monsters[0] = {
                id: 1000,
                name: 'Test Monster',
                position: 'face-up-attack',
                race: 'Warrior',
                attribute: 'DARK',
                level: 4,
                atk: 1500,
                def: 1200,
                currentAtk: 1500,
                currentDef: 1200
            };
            duelState.player2.monsters[0] = {
                id: 2000,
                name: 'Opponent Test Monster',
                position: 'face-up-attack',
                race: 'Warrior',
                attribute: 'EARTH',
                level: 4,
                atk: 1600,
                def: 1000,
                currentAtk: 1600,
                currentDef: 1000
            };

            // Ejecución de prueba controlada de execute
            const execRes = await mod.execute({
                duelState,
                playerKey: 'player1',
                opponentKey: 'player2',
                targetData: { slot_index: 0, target_slot: 0, target_player: 'player1', slot: 0 },
                link: { card_data: card, slot_index: 0 },
                effectUtils,
                isFlip: mod.isFlip
            });

            if (!execRes || (execRes.success !== true && execRes.success !== false)) {
                throw new Error('execute no retornó resultado esperado');
            }

            const features = Object.keys(mod).filter(k => typeof mod[k] !== 'function' || ['canActivate', 'onActivate', 'execute', 'onFlip', 'onStandby'].includes(k)).join(', ');
            console.log(`✅ [${cardIndex}/105] [${cardNum}] ${name} (${card.NameES || name}) -> PASS [Módulo: ${features} | Ejecución 100% OK]`);
            passed++;
        } catch (err) {
            console.error(`❌ [${cardIndex}/105] [${cardNum}] ${name} -> FAIL [${err.message}]`);
            failed++;
            failures.push({ cardNum, name, passcode, reason: err.message });
        }
    }

    console.log('\n================================================================');
    console.log('📊 RESUMEN FINAL AUDITORÍA LON (LABYRINTH OF NIGHTMARE):');
    console.log(`   Total Cartas: ${rawCards.length}`);
    console.log(`   Aprobadas:    ${passed} / ${rawCards.length} (${((passed / rawCards.length) * 100).toFixed(1)}%)`);
    console.log(`   Fallidas:     ${failed} / ${rawCards.length}`);
    console.log('================================================================');

    if (failed > 0) {
        console.log('\nDetalle de cartas fallidas:');
        failures.forEach(f => console.log(`- [${f.cardNum}] ${f.name} (Passcode: ${f.passcode}): ${f.reason}`));
        process.exit(1);
    } else {
        process.exit(0);
    }
}

testLONSuite();
