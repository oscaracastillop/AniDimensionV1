const { duelRooms, createInitialDuelState } = require('../backend/engine/duel-state');
const { executeNpcTurn } = require('../backend/engine/npc-ai');
const { ocgCardReader } = require('../backend/data/sql-card-reader');

async function testNpcTurn() {
    console.log('🧪 Iniciando Test de Turno Automatizado OCG de NPC...');
    const roomId = 'TEST_NPC_ROOM';
    
    // Crear estado de duelo de prueba
    const duelState = createInitialDuelState(roomId, 'TestPlayer', 'Yami Yugi (Nv. 10)');
    duelRooms.set(roomId, duelState);
    
    duelState.turnNumber = 2; // Turno 2 para permitir fase de batalla
    duelState.turnPlayer = duelState.player2.username;
    
    // Equipar mano del NPC con hechizos y monstruos
    const torike = ocgCardReader(80813021) || { id: 80813021, name: 'Torike', atk: 1200, def: 900, type: 'Normal Monster', race: 'Beast' };
    const legSword = ocgCardReader(61854111) || { id: 61854111, name: 'Legendary Sword', type: 'Equip Spell', race: 'Equip' };
    const finalFlame = ocgCardReader(73134081) || { id: 73134081, name: 'Final Flame', type: 'Normal Spell', race: 'Normal' };
    const manEater = ocgCardReader(54652250) || { id: 54652250, name: 'Man-Eater Bug', atk: 450, def: 600, type: 'Flip Effect Monster', race: 'Insect' };
    
    duelState.player2.hand = [finalFlame, legSword, torike];
    
    // Poner un Man-Eater Bug en defensa boca abajo del NPC (invocado en turno 1)
    duelState.player2.monsters[0] = {
        card_id: 54652250,
        position: 'DEF',
        faceDown: true,
        turnSummoned: 1,
        hasChangedPosition: false,
        hasAttacked: false,
        card_data: manEater
    };
    
    // Monstruo del jugador para ser objetivo
    duelState.player1.monsters[0] = {
        card_id: 32274490,
        position: 'ATK',
        faceDown: false,
        turnSummoned: 1,
        hasChangedPosition: false,
        hasAttacked: false,
        card_data: { id: 32274490, name: 'Skull Servant', atk: 300, def: 200 }
    };
    
    console.log('Player LP inicial:', duelState.player1.lp);
    console.log('Rival LP inicial:', duelState.player2.lp);
    
    // Ejecutar turno del NPC
    await executeNpcTurn(roomId);
    
    console.log('--- RESULTADOS TRAS TURNO DEL NPC ---');
    console.log('Player LP final:', duelState.player1.lp, '(Esperado: < 8000 por daño de Final Flame y/o combate)');
    console.log('Monstruos NPC en campo:', duelState.player2.monsters.map((m, i) => m ? `#${i}: ${m.card_data.name} (${m.position}, faceDown: ${m.faceDown}, ATK: ${m.currentAtk || m.card_data.atk})` : null).filter(Boolean));
    console.log('Magias NPC en campo:', duelState.player2.spells.map((s, i) => s ? `#${i}: ${s.card_data.name} (${s.position})` : null).filter(Boolean));
    console.log('Monstruos Player en campo:', duelState.player1.monsters.map((m, i) => m ? `#${i}: ${m.card_data.name} (${m.position})` : null).filter(Boolean));
    
    if (duelState.player1.lp < 8000) {
        console.log('✅ ÉXITO: El NPC activó magias OCG e infligió daño!');
    } else {
        console.error('❌ FALLO: El NPC no infligió daño.');
    }
    
    duelRooms.delete(roomId);
    process.exit(0);
}

testNpcTurn().catch(err => {
    console.error('Error en test:', err);
    process.exit(1);
});
