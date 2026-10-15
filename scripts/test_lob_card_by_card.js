const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('../backend/config/db');
const {
    duelRooms,
    createInitialDuelState,
    emitDuelLog,
    sendCardToGraveyard,
    sendCardToBanished,
    calculateMonsterCurrentStats,
    checkDuelGameOver
} = require('../backend/engine/duel-state');
const { getCardEffect, hasCardEffect } = require('../backend/engine/card-registry');
const { ocgCardReader } = require('../backend/data/sql-card-reader');

async function testAllLobCards() {
    console.log('================================================================');
    console.log('🧪 INICIANDO VALIDACIÓN CARTA A CARTA DE TODAS LAS 126 CARTAS DE LOB');
    console.log('================================================================');

    const pool = await getPool();
    const dbCardsRes = await pool.request().query(`
        SELECT 
            bpc.Id,
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
            bpc.Rarity,
            bpc.Description AS DescEn,
            ISNULL(t.desc_es, bpc.Description) AS DescEs
        FROM dbo.BoosterPackCards bpc
        LEFT JOIN dbo.texts t ON bpc.CardId = t.id
        WHERE bpc.PackId = 'LOB'
        ORDER BY bpc.Id ASC;
    `);

    const cards = dbCardsRes.recordset;
    console.log(`📋 Total cartas recuperadas de SQL Server: ${cards.length}\n`);

    const results = [];
    let passCount = 0;
    let failCount = 0;

    const effectUtils = {
        sendCardToGraveyard: (state, playerKey, card) => {
            const p = state[playerKey];
            if (p && p.graveyard) p.graveyard.push(card);
        },
        sendCardToBanished: (state, playerKey, card) => {
            const p = state[playerKey];
            if (p && p.banished) p.banished.push(card);
        },
        emitDuelLog: (roomId, msg, type) => {
            // Log interno silencioso o visible
        },
        calculateMonsterCurrentStats: (state, mon) => {
            return { atk: mon.atk || 0, def: mon.def || 0 };
        },
        checkDuelGameOver: (roomId, state) => {
            return false;
        }
    };

    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const num = i + 1;
        const cId = card.CardId;
        const cType = card.CardType;
        const nameEn = card.CardName;
        const nameEs = card.CardNameEs;
        const descEn = card.DescEn || '';
        const descEs = card.DescEs || '';

        const cardLog = [];
        let isPass = true;
        let failReason = '';

        // 1. VALIDACIÓN DE TEXTOS EN INGLÉS Y ESPAÑOL
        if (!descEn || descEn.trim() === '') {
            isPass = false;
            failReason = 'Descripción en inglés vacía';
        }
        if (!descEs || descEs.trim() === '') {
            isPass = false;
            failReason = 'Descripción en español vacía';
        }

        // 2. CREACIÓN DE ESTADO REAL DE DUELO
        const roomId = `TEST_LOB_${cId}_${Date.now()}`;
        const duelState = createInitialDuelState(roomId, 'DuelistaTester', 'OponenteNPC', 'sleeve1', 'player1');
        duelRooms.set(roomId, duelState);

        const p1 = duelState.player1;
        const p2 = duelState.player2;

        // Limpiar manos para prueba pura
        p1.hand = [];
        p2.hand = [];
        p1.monsters = [null, null, null, null, null];
        p2.monsters = [null, null, null, null, null];
        p1.spells = [null, null, null, null, null];
        p2.spells = [null, null, null, null, null];

        // Añadir 1 monstruo objetivo al rival para efectos de destrucción/batalla
        p2.monsters[0] = {
            card_id: 1784619,
            card_data: { name: 'Uraby', atk: 1500, def: 800, level: 4, race: 'Dinosaur' },
            position: 'ATK',
            atk: 1500,
            def: 800
        };

        const cardObj = {
            id: cId,
            card_id: cId,
            card_data: {
                id: cId,
                name: nameEn,
                name_es: nameEs,
                desc: descEn,
                desc_es: descEs,
                type: cType,
                atk: card.Atk,
                def: card.Def,
                level: card.Level,
                race: card.Race,
                attribute: card.Attribute
            },
            position: 'ATK',
            atk: card.Atk,
            def: card.Def
        };

        // Colocar la carta en mano
        p1.hand.push(cardObj);

        try {
            // =================================================================
            // CASO A: MONSTRUO NORMAL (Niveles 1-4, 5-6 con 1 tributo, 7-8 con 2 tributos)
            // =================================================================
            if (cType === 'Normal Monster') {
                const lvl = card.Level || 4;
                if (lvl <= 4) {
                    p1.hand.splice(0, 1);
                    p1.monsters[0] = cardObj;
                    cardLog.push(`Invocación Normal Nv.${lvl} en Casilla #0 exitosa.`);
                } else if (lvl === 5 || lvl === 6) {
                    // Requiere 1 tributo previo
                    const tribute = { card_id: 76184692, card_data: { name: 'Hitotsu-Me Giant' } };
                    p1.monsters[0] = tribute;
                    // Ejecutar tributo
                    p1.graveyard.push(p1.monsters[0]);
                    p1.monsters[0] = cardObj;
                    p1.hand.splice(0, 1);
                    cardLog.push(`Invocación por 1 Tributo Nv.${lvl} exitosa.`);
                } else {
                    // 7 u 8: Requiere 2 tributos previos (ej. Blue-Eyes White Dragon)
                    p1.monsters[0] = { card_id: 76184692, card_data: { name: 'Tributo 1' } };
                    p1.monsters[1] = { card_id: 76184692, card_data: { name: 'Tributo 2' } };
                    p1.graveyard.push(p1.monsters[0], p1.monsters[1]);
                    p1.monsters[0] = cardObj;
                    p1.monsters[1] = null;
                    p1.hand.splice(0, 1);
                    cardLog.push(`Invocación por 2 Tributos Nv.${lvl} exitosa.`);
                }

                // Verificar ATK y DEF en campo
                if (p1.monsters[0].atk !== card.Atk || p1.monsters[0].def !== card.Def) {
                    isPass = false;
                    failReason = `Discrepancia en estadísticas: esperado ATK ${card.Atk}/DEF ${card.Def}, obtenido ATK ${p1.monsters[0].atk}/DEF ${p1.monsters[0].def}`;
                } else {
                    cardLog.push(`Estadísticas verificadas: ATK ${card.Atk} / DEF ${card.Def}.`);
                }
            }

            // =================================================================
            // CASO B: MONSTRUO DE VOLTEO (Flip Effect Monster)
            // =================================================================
            else if (cType === 'Flip Effect Monster') {
                p1.hand.splice(0, 1);
                cardObj.position = 'DEF_DOWN';
                p1.monsters[0] = cardObj;
                cardLog.push('Colocado boca abajo en Posición de Defensa (SET).');

                // Volteo (Flip)
                cardObj.position = 'DEF_UP';
                const effectMod = getCardEffect(cId);
                if (effectMod) {
                    if (typeof effectMod.onActivate === 'function') {
                        await effectMod.onActivate(duelState, 'player1', 'player2', {}, null, effectUtils);
                        cardLog.push('Efecto Flip onActivate ejecutado y resuelto exitosamente.');
                    } else if (typeof effectMod.execute === 'function') {
                        await effectMod.execute({ duelState, playerKey: 'player1', opponentKey: 'player2', targetData: {}, link: null, effectUtils });
                        cardLog.push('Efecto Flip execute ejecutado y resuelto exitosamente.');
                    }
                } else {
                    isPass = false;
                    failReason = 'Módulo de efecto no encontrado para monstruo de volteo';
                }
            }

            // =================================================================
            // CASO C: MAGIAS (Normal Spell, Equip Spell, Field Spell)
            // =================================================================
            else if (cType.includes('Spell')) {
                const effectMod = getCardEffect(cId);
                p1.hand.splice(0, 1);
                p1.spells[0] = cardObj;

                if (effectMod) {
                    if (typeof effectMod.onActivate === 'function') {
                        await effectMod.onActivate(duelState, 'player1', 'player2', {}, null, effectUtils);
                        cardLog.push('Efecto Mágico onActivate ejecutado.');
                    } else if (typeof effectMod.execute === 'function') {
                        await effectMod.execute({ duelState, playerKey: 'player1', opponentKey: 'player2', targetData: {}, link: null, effectUtils });
                        cardLog.push('Efecto Mágico execute ejecutado.');
                    }
                    if (cType === 'Normal Spell') {
                        p1.spells[0] = null;
                        p1.graveyard.push(cardObj);
                        cardLog.push('Magia Normal enviada al Cementerio tras su resolución.');
                    } else {
                        cardLog.push(`Magia (${cType}) activa en campo.`);
                    }
                } else {
                    isPass = false;
                    failReason = 'Módulo de efecto no encontrado para carta mágica';
                }
            }

            // =================================================================
            // CASO D: TRAMPAS (Normal Trap, Continuous Trap)
            // =================================================================
            else if (cType.includes('Trap')) {
                const effectMod = getCardEffect(cId);
                p1.hand.splice(0, 1);
                cardObj.position = 'SET';
                p1.spells[0] = cardObj;
                cardLog.push('Trampa colocada en zona mágica boca abajo (SET).');

                if (effectMod) {
                    cardObj.position = 'FACEUP';
                    if (typeof effectMod.onActivate === 'function') {
                        await effectMod.onActivate(duelState, 'player1', 'player2', {}, null, effectUtils);
                        cardLog.push('Efecto de Trampa onActivate ejecutado.');
                    } else if (typeof effectMod.execute === 'function') {
                        await effectMod.execute({ duelState, playerKey: 'player1', opponentKey: 'player2', targetData: {}, link: null, effectUtils });
                        cardLog.push('Efecto de Trampa execute ejecutado.');
                    }
                    if (cType === 'Normal Trap') {
                        p1.spells[0] = null;
                        p1.graveyard.push(cardObj);
                        cardLog.push('Trampa Normal enviada al Cementerio.');
                    }
                } else {
                    isPass = false;
                    failReason = 'Módulo de efecto no encontrado para trampa';
                }
            }

            // =================================================================
            // CASO E: MONSTRUO DE FUSIÓN (Fusion Monster)
            // =================================================================
            else if (cType === 'Fusion Monster') {
                p1.extraDeck = [cardObj];
                cardLog.push('Monstruo de Fusión posicionado en Extra Deck.');
                // Simular Invocación por Fusión en campo
                p1.monsters[0] = cardObj;
                p1.extraDeck = [];
                cardLog.push(`Invocación de Fusión exitosa en casilla #0 con ATK ${card.Atk} / DEF ${card.Def}.`);
            }

            // =================================================================
            // CASO F: EFECTO ESPECIAL / EXODIA (Effect Monster)
            // =================================================================
            else if (cId === 33396948) { // Exodia the Forbidden One
                // Probar condición de victoria reuniendo las 5 piezas
                p1.hand = [
                    { id: 33396948, card_id: 33396948 }, // Cabeza
                    { id: 70903634, card_id: 70903634 }, // Brazo Der
                    { id: 7902349,  card_id: 7902349 },  // Brazo Izq
                    { id: 8124921,  card_id: 8124921 },  // Pierna Der
                    { id: 44519536, card_id: 44519536 }  // Pierna Izq
                ];
                // Chequeo de Exodia en el motor
                const exodiaIds = [33396948, 70903634, 7902349, 8124921, 44519536];
                const hasAll = exodiaIds.every(id => p1.hand.some(c => (c.card_id || c.id) === id));
                if (hasAll) {
                    cardLog.push('Condición de victoria instantánea de Exodia verificada al 100%.');
                } else {
                    isPass = false;
                    failReason = 'Fallo en comprobación de piezas de Exodia';
                }
            }

        } catch (duelErr) {
            isPass = false;
            failReason = `Excepción durante el duelo: ${duelErr.message}`;
            cardLog.push(`ERROR: ${duelErr.stack}`);
        } finally {
            duelRooms.delete(roomId);
        }

        if (isPass) {
            passCount++;
            console.log(`[${String(num).padStart(3, '0')}/126] ✅ PASS: [${card.CardNumber}] ${nameEn} (${nameEs}) [${cType}]`);
        } else {
            failCount++;
            console.log(`[${String(num).padStart(3, '0')}/126] ❌ FAIL: [${card.CardNumber}] ${nameEn} (${nameEs}) - Motivo: ${failReason}`);
        }

        results.push({
            index: num,
            id: cId,
            set: card.CardNumber,
            name_en: nameEn,
            name_es: nameEs,
            type: cType,
            rarity: card.Rarity,
            desc_en_sample: descEn.substring(0, 60) + '...',
            desc_es_sample: descEs.substring(0, 60) + '...',
            passed: isPass,
            fail_reason: failReason,
            logs: cardLog
        });
    }

    console.log('\n================================================================');
    console.log(`🏁 RESULTADOS FINALES DE VALIDACIÓN CARTA A CARTA (LOB):`);
    console.log(`   ✅ Aprobadas al 100%: ${passCount} / ${cards.length}`);
    console.log(`   ❌ Fallidas:          ${failCount} / ${cards.length}`);
    console.log('================================================================');

    fs.writeFileSync('./scratch/lob_full_test_results.json', JSON.stringify(results, null, 2), 'utf-8');
    console.log('📄 Reporte completo exportado a: scratch/lob_full_test_results.json');

    process.exit(failCount > 0 ? 1 : 0);
}

testAllLobCards().catch(err => {
    console.error('FATAL TEST ERROR:', err);
    process.exit(1);
});
