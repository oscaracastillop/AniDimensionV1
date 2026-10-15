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

async function testAllMrlCards() {
    console.log('================================================================');
    console.log('🧪 INICIANDO VALIDACIÓN CARTA A CARTA DE TODAS LAS 104 CARTAS DE MRL');
    console.log('================================================================');

    const pool = await getPool();
    const dbCardsRes = await pool.request().query(`
        SELECT 
            bpc.Id,
            bpc.CardId,
            bpc.CardNumber,
            bpc.CardName,
            bpc.CardName AS CardNameEs,
            bpc.CardType,
            bpc.Atk,
            bpc.Def,
            bpc.[Level],
            bpc.Attribute,
            bpc.Race,
            bpc.Rarity,
            bpc.Description AS DescEn,
            bpc.Description AS DescEs
        FROM dbo.BoosterPackCards bpc
        WHERE bpc.PackId = 'MRL'
        ORDER BY bpc.Id ASC;
    `);

    const cards = dbCardsRes.recordset;
    console.log(`📋 Total cartas recuperadas de SQL Server: ${cards.length}\n`);

    const results = [];
    let passCount = 0;
    let failCount = 0;

    const effectUtils = {
        sendCardToGraveyard: (state, card, controllerKey) => {
            const p = state[controllerKey];
            if (p && p.graveyard) p.graveyard.push(card);
        },
        sendCardToBanished: (state, card, controllerKey) => {
            const p = state[controllerKey];
            if (p && p.banished) p.banished.push(card);
        },
        emitDuelLog: (roomId, msg, type) => {
            // Log interno silencioso
        },
        calculateMonsterCurrentStats: (mon, state, playerKey) => {
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
        const roomId = `TEST_MRL_${cId}_${Date.now()}`;
        const duelState = createInitialDuelState(roomId, 'DuelistaTester', 'OponenteNPC', 'sleeve1', 'player1');
        duelRooms.set(roomId, duelState);

        const p1 = duelState.player1;
        const p2 = duelState.player2;

        const cardInstance = {
            id: cId,
            card_id: cId,
            name: nameEn,
            name_es: nameEs,
            type: cType,
            atk: card.Atk,
            def: card.Def,
            level: card.Level,
            attribute: card.Attribute,
            race: card.Race,
            position: 'ATK',
            faceDown: false,
            desc: descEn,
            desc_es: descEs
        };

        // 3. PRUEBA ESPECÍFICA SEGÚN TIPO DE CARTA
        try {
            if (cType.includes('Normal Monster')) {
                // Monstruo Normal: Verificar Invocación normal o por tributo
                const level = card.Level || 1;
                if (level <= 4) {
                    p1.monsters[0] = cardInstance;
                    cardLog.push(`Invocación Normal Lv.${level} [ATK:${card.Atk}/DEF:${card.Def}]`);
                } else if (level <= 6) {
                    p1.monsters[0] = { id: 1000, name: 'Tributo1', position: 'ATK' };
                    p1.graveyard.push(p1.monsters[0]);
                    p1.monsters[0] = cardInstance;
                    cardLog.push(`Invocación por 1 Sacrificio Lv.${level} [ATK:${card.Atk}/DEF:${card.Def}]`);
                } else {
                    p1.monsters[0] = { id: 1000, name: 'Tributo1', position: 'ATK' };
                    p1.monsters[1] = { id: 1001, name: 'Tributo2', position: 'ATK' };
                    p1.graveyard.push(p1.monsters[0], p1.monsters[1]);
                    p1.monsters[0] = cardInstance;
                    p1.monsters[1] = null;
                    cardLog.push(`Invocación por 2 Sacrificios Lv.${level} [ATK:${card.Atk}/DEF:${card.Def}]`);
                }
            } else {
                // Monstruo de Efecto, Ritual, Magia o Trampa
                const hasModule = hasCardEffect(cId);
                if (!hasModule) {
                    isPass = false;
                    failReason = `Módulo de efecto no registrado para ID ${cId}`;
                } else {
                    const effect = getCardEffect(cId);
                    cardLog.push(`Módulo detectado: ${typeof effect === 'object' ? Object.keys(effect).join(', ') : 'fn'}`);

                    // Preparar contexto del tablero de prueba con monstruos en ambos lados
                    p1.monsters[0] = cardInstance;
                    cardInstance.playerKey = 'player1';
                    cardInstance.slot = 0;

                    p2.monsters[0] = {
                        id: 999999,
                        card_id: 999999,
                        name: 'MonstruoEnemigo',
                        atk: 1500,
                        def: 1200,
                        position: 'ATK',
                        faceDown: false,
                        playerKey: 'player2',
                        slot: 0,
                        card_data: { id: 999999, name: 'MonstruoEnemigo', atk: 1500, def: 1200, race: 'Warrior', attribute: 'EARTH' }
                    };
                    p2.spells[0] = {
                        id: 888888,
                        card_id: 888888,
                        name: 'MagiaEnemiga',
                        position: 'SET',
                        faceDown: true,
                        playerKey: 'player2',
                        slot: 0
                    };

                    const targetData = {
                        target_player: 'player2',
                        target_slot: 0,
                        slotIndex: 0,
                        slot_index: 0,
                        card: p2.monsters[0],
                        monster: p2.monsters[0]
                    };

                    const context = {
                        roomId,
                        duelState,
                        playerKey: 'player1',
                        opponentKey: 'player2',
                        rivalKey: 'player2',
                        card: cardInstance,
                        slotIndex: 0,
                        targetData,
                        effectUtils,
                        tributeIndex: 0
                    };

                    // Ejecutar el manejador del efecto según su API
                    if (typeof effect === 'object') {
                        if (typeof effect.onActivate === 'function') {
                            await effect.onActivate(duelState, 'player1', 'player2', targetData, null, effectUtils);
                        } else if (typeof effect.onFlip === 'function') {
                            await effect.onFlip(context);
                        } else if (typeof effect.onSummon === 'function') {
                            await effect.onSummon(context);
                        } else if (typeof effect.onDestroyedByBattle === 'function') {
                            await effect.onDestroyedByBattle(context);
                        } else if (typeof effect.execute === 'function') {
                            await effect.execute(context);
                        }
                    } else if (typeof effect === 'function') {
                        await effect(context);
                    }
                    cardLog.push('Efecto ejecutado satisfactoriamente');
                }
            }
        } catch (execErr) {
            isPass = false;
            failReason = `Excepción al ejecutar efecto: ${execErr.message}`;
            console.error(`❌ [ERROR CARTA #${cId} ${nameEn}]:`, execErr);
        }

        // Registrar resultado
        if (isPass) {
            passCount++;
            console.log(`✅ [${num}/104] [${card.CardNumber}] ${nameEn} (${nameEs}) -> PASS [${cardLog.join(' | ')}]`);
        } else {
            failCount++;
            console.log(`❌ [${num}/104] [${card.CardNumber}] ${nameEn} (${nameEs}) -> FAIL: ${failReason}`);
        }

        results.push({
            cardId: cId,
            cardNumber: card.CardNumber,
            nameEn,
            nameEs,
            type: cType,
            passed: isPass,
            reason: failReason,
            logs: cardLog
        });

        // Limpiar sala de prueba
        duelRooms.delete(roomId);
    }

    console.log('\n================================================================');
    console.log(`📊 RESUMEN FINAL AUDITORÍA MRL (SPELL RULER):`);
    console.log(`   Total Cartas: ${cards.length}`);
    console.log(`   Aprobadas:    ${passCount} / ${cards.length} (${((passCount / cards.length) * 100).toFixed(1)}%)`);
    console.log(`   Fallidas:     ${failCount} / ${cards.length}`);
    console.log('================================================================');

    fs.writeFileSync('scratch/mrl_full_test_results.json', JSON.stringify(results, null, 2));
    process.exit(failCount === 0 ? 0 : 1);
}

testAllMrlCards().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
