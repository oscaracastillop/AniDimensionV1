const { duelRooms, createInitialDuelState } = require('../backend/engine/duel-state');
const { executeCardEffect } = require('../backend/engine/ocg-engine');
const { ocgCardReader } = require('../backend/data/sql-card-reader');

async function testEngine() {
    const roomId = 'TEST_ROOM_EFFECTS';
    const state = createInitialDuelState(roomId, 'Player1', 'Player2');
    duelRooms.set(roomId, state);

    console.log('--- Test 1: Dian Keto (84257639) ---');
    state.player1.lp = 5000;
    const dianKeto = ocgCardReader(84257639);
    await executeCardEffect(roomId, dianKeto, 'player1', 'player2');
    console.log('Player1 LP after Dian Keto:', state.player1.lp);

    console.log('\n--- Test 2: Pot of Greed (55144522) ---');
    const p1HandBefore = state.player1.hand.length;
    const potOfGreed = ocgCardReader(55144522);
    await executeCardEffect(roomId, potOfGreed, 'player1', 'player2');
    console.log('Player1 Hand before/after:', p1HandBefore, '->', state.player1.hand.length);

    console.log('\n--- Test 3: Stop Defense (63102017) ---');
    state.player2.monsters[1] = {
        card_id: 89631139,
        position: 'DEF',
        faceDown: true,
        card_data: { name: 'Blue-Eyes White Dragon', atk: 3000, def: 2500 }
    };
    const stopDef = ocgCardReader(63102017);
    await executeCardEffect(roomId, stopDef, 'player1', 'player2', { slot_index: 1 });
    console.log('Target monster pos after Stop Defense:', state.player2.monsters[1].position, 'faceDown:', state.player2.monsters[1].faceDown);

    console.log('\n--- Test 4: Man-Eater Bug (54652250) ---');
    state.player2.monsters[0] = {
        card_id: 89631139,
        position: 'ATK',
        faceDown: false,
        card_data: { name: 'Blue-Eyes White Dragon', atk: 3000, def: 2500 }
    };
    const manEater = ocgCardReader(54652250);
    await executeCardEffect(roomId, manEater, 'player1', 'player2', { slot_index: 0 });
    console.log('Player2 monster at slot 0 after Man-Eater Bug:', state.player2.monsters[0]);

    console.log('\n--- Test 5: Hane-Hane (7089711) ---');
    state.player2.monsters[2] = {
        card_id: 46986414,
        position: 'ATK',
        faceDown: false,
        card_data: { name: 'Dark Magician', atk: 2500, def: 2100 }
    };
    const p2HandBefore = state.player2.hand.length;
    const haneHane = ocgCardReader(7089711);
    await executeCardEffect(roomId, haneHane, 'player1', 'player2', { slot_index: 2 });
    console.log('Player2 monster at slot 2 after Hane-Hane:', state.player2.monsters[2]);
    console.log('Player2 hand size before/after:', p2HandBefore, '->', state.player2.hand.length);

    console.log('\n--- Test 6: Spellbinding Circle (18807109) ---');
    state.player2.monsters[3] = {
        card_id: 89631139,
        position: 'ATK',
        faceDown: false,
        card_data: { name: 'Blue-Eyes White Dragon', atk: 3000, def: 2500 }
    };
    const circle = ocgCardReader(18807109);
    await executeCardEffect(roomId, circle, 'player1', 'player2', { slot_index: 3 });
    console.log('Target monster isTrapped:', state.player2.monsters[3].isTrapped);
    console.log('Attached effects:', state.player2.monsters[3].attachedEffects);

    console.log('\n--- Test 7: Sword of Dark Destruction (37120512) ---');
    state.player1.monsters[0] = {
        card_id: 46986414,
        position: 'ATK',
        faceDown: false,
        card_data: { name: 'Dark Magician', atk: 2500, def: 2100 }
    };
    const sword = ocgCardReader(37120512);
    await executeCardEffect(roomId, sword, 'player1', 'player2', { slot_index: 0 });
    console.log('Player1 Dark Magician currentAtk/currentDef:', state.player1.monsters[0].currentAtk, state.player1.monsters[0].currentDef);

    console.log('\n--- Test 8: Raigeki (12580477) ---');
    state.player2.monsters[4] = {
        card_id: 89631139,
        position: 'ATK',
        faceDown: false,
        card_data: { name: 'Blue-Eyes White Dragon', atk: 3000, def: 2500 }
    };
    const raigeki = ocgCardReader(12580477);
    await executeCardEffect(roomId, raigeki, 'player1', 'player2');
    console.log('Player2 monster count after Raigeki:', state.player2.monsters.filter(m => m !== null).length);

    console.log('\n--- Test 9: Sparks (76103675) & Final Flame (73134081) ---');
    const p2LpBefore = state.player2.lp;
    const sparks = ocgCardReader(76103675);
    await executeCardEffect(roomId, sparks, 'player1', 'player2');
    const finalFlame = ocgCardReader(73134081);
    await executeCardEffect(roomId, finalFlame, 'player1', 'player2');
    console.log('Player2 LP before/after burn spells:', p2LpBefore, '->', state.player2.lp);
}

testEngine();
