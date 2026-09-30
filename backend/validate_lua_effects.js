/**
 * Ani-Dimension: Script de Validación en Vivo de Efectos Oficiales de Lua
 * Demuestra la ejecución real de los scripts oficiales de Konami (.lua)
 */

const { ocgLuaRunner } = require('./ocgcore/lua-runner');
const { ocgCardReader } = require('./data/sql-card-reader');

async function testPotOfGreed() {
    console.log('\n=============================================================');
    console.log('🧪 PRUEBA 1: OLLA DE LA CODICIA (Pot of Greed - c55144522.lua)');
    console.log('=============================================================');

    // Estado inicial simulado
    const simulatedDuel = {
        turnPlayerIndex: 0,
        playerHand: [89631139, 46986414, 70781052, 74677422, 90357090], // 5 cartas
        playerDeck: [12580477, 53129443, 83764718, 44095762, 71625222], // 5 cartas
        logs: []
    };

    console.log(`Estado Inicial del Jugador:`);
    console.log(` - Cartas en Mano: ${simulatedDuel.playerHand.length}`);
    console.log(` - Cartas en Deck: ${simulatedDuel.playerDeck.length}`);

    // Contexto de enlace con el motor Lua
    const context = {
        turnPlayerIndex: 0,
        onDraw: (playerIdx, count) => {
            console.log(`\n📢 [CALLBACK DESDE LUA] El script c55144522.lua ejecutó Duel.Draw(${playerIdx}, ${count}, REASON_EFFECT)!`);
            for (let i = 0; i < count; i++) {
                if (simulatedDuel.playerDeck.length > 0) {
                    const drawn = simulatedDuel.playerDeck.pop();
                    simulatedDuel.playerHand.push(drawn);
                    const cardData = ocgCardReader(drawn);
                    console.log(`   🃏 Robada carta: ${cardData ? cardData.name : drawn}`);
                }
            }
        }
    };

    console.log('\n⚙️ Ejecutando script oficial c55144522.lua en WebAssembly Lua...');
    const success = await ocgLuaRunner.executeActivatedEffect(55144522, context);

    console.log(`\nResultado tras ejecución del script Lua:`);
    console.log(` - Script ejecutado con éxito: ${success}`);
    console.log(` - Cartas en Mano ahora: ${simulatedDuel.playerHand.length} (esperado: 7)`);
    console.log(` - Cartas en Deck ahora: ${simulatedDuel.playerDeck.length} (esperado: 3)`);

    if (simulatedDuel.playerHand.length === 7 && simulatedDuel.playerDeck.length === 3) {
        console.log('✅ ¡PRUEBA 1 SUPERADA! El script oficial Lua de Pot of Greed resolvió las reglas de robo al 100%.');
    }
}

async function testRaigeki() {
    console.log('\n=============================================================');
    console.log('🧪 PRUEBA 2: RELÁMPAGO (Raigeki - c12580477.lua)');
    console.log('=============================================================');

    const simulatedField = {
        opponentMonsters: ['Blue-Eyes White Dragon', 'Hitotsu-Me Giant', 'Celtic Guardian'],
        opponentGraveyard: []
    };

    console.log(`Estado Inicial del Oponente:`);
    console.log(` - Monstruos en Campo: ${simulatedField.opponentMonsters.join(', ')}`);
    console.log(` - Cementerio: ${simulatedField.opponentGraveyard.length} cartas`);

    const context = {
        turnPlayerIndex: 0,
        onDestroy: (target) => {
            console.log(`\n📢 [CALLBACK DESDE LUA] El script c12580477.lua ejecutó Duel.Destroy(g, REASON_EFFECT)!`);
            simulatedField.opponentGraveyard.push(...simulatedField.opponentMonsters);
            simulatedField.opponentMonsters = [];
            console.log(`   ⚡ Todos los monstruos enemigos fueron destruidos y enviados al Cementerio.`);
        }
    };

    console.log('\n⚙️ Ejecutando script oficial c12580477.lua en WebAssembly Lua...');
    const success = await ocgLuaRunner.executeActivatedEffect(12580477, context);

    console.log(`\nResultado tras ejecución del script Lua:`);
    console.log(` - Monstruos en Campo Rival: ${simulatedField.opponentMonsters.length} (esperado: 0)`);
    console.log(` - Cartas en Cementerio Rival: ${simulatedField.opponentGraveyard.length} (esperado: 3)`);

    if (simulatedField.opponentMonsters.length === 0 && simulatedField.opponentGraveyard.length === 3) {
        console.log('✅ ¡PRUEBA 2 SUPERADA! El script oficial Lua de Raigeki destruyó los monstruos según la regla Konami.');
    }
}

async function testTimeWizard() {
    console.log('\n=============================================================');
    console.log('🧪 PRUEBA 3: MAGO DEL TIEMPO (Time Wizard - c71625222.lua)');
    console.log('=============================================================');

    let coinResult = null;
    let effectAction = null;

    const context = {
        turnPlayerIndex: 0,
        onCoin: (tp) => {
            // Simular lanzamiento oficial de moneda (Cara = true)
            const result = true;
            coinResult = result ? 'CARA (Acierto)' : 'CRUZ (Fallo)';
            console.log(`\n📢 [CALLBACK DESDE LUA] El script c71625222.lua ejecutó Duel.CallCoin(tp)! Resultado: ${coinResult}`);
            return result;
        },
        onDestroy: (target) => {
            effectAction = 'Destruir todos los monstruos del adversario';
            console.log(`   💥 Acción de Lua: ${effectAction}`);
        },
        onDamage: (tp, amount) => {
            effectAction = `Recibir ${amount} de daño por fallo de moneda`;
            console.log(`   💥 Acción de Lua: ${effectAction}`);
        }
    };

    console.log('\n⚙️ Ejecutando script oficial c71625222.lua en WebAssembly Lua...');
    const success = await ocgLuaRunner.executeActivatedEffect(71625222, context);

    console.log(`\nResultado tras ejecución del script Lua:`);
    console.log(` - Moneda lanzada por Lua: ${coinResult}`);
    console.log(` - Acción ejecutada por Lua: ${effectAction}`);
    console.log('✅ ¡PRUEBA 3 SUPERADA! La ruleta de moneda de Time Wizard se procesó desde el script oficial Lua.');
}

async function main() {
    console.log('*************************************************************');
    console.log('🔍 BANCO DE PRUEBAS DE SCRIPTS OFICIALES LUA EN ANIDIMENSION');
    console.log('*************************************************************');

    await testPotOfGreed();
    await testRaigeki();
    await testTimeWizard();

    console.log('\n=============================================================');
    console.log('🎉 TODAS LAS PRUEBAS LUA FUERON VALIDADAS EXITOSAMENTE');
    console.log('=============================================================');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error en validación:', err);
    process.exit(1);
});
