const { ocgLuaRunner } = require('../backend/ocgcore/lua-runner');
const fs = require('fs');
const path = require('path');

// Test popular LOB effect cards:
// 53129443 - Dark Hole (Spell)
// 66788016 - Fissure (Spell)
// 12580477 - Raigeki (Spell)
// 55144522 - Pot of Greed (Spell)
// 84257639 - Dian Keto the Cure Maiden (Spell)
// 38199696 - Red Medicine (Spell)
// 63102017 - Stop Defense (Spell)
// 04206964 - Trap Hole (Trap)
// 54652250 - Man-Eater Bug (Monster Flip)
// 07089711 - Hane-Hane (Monster Flip)
// 18807109 - Spellbinding Circle (Trap)
// 46130346 - Trap Master (Monster Flip)
// 37120512 - Sword of Dark Destruction (Equip Spell)
// 40640057 - Kuriboh (Monster Hand Trap)

const testCards = [
    { id: 53129443, name: 'Dark Hole' },
    { id: 66788016, name: 'Fissure' },
    { id: 12580477, name: 'Raigeki' },
    { id: 55144522, name: 'Pot of Greed' },
    { id: 84257639, name: 'Dian Keto the Cure Maiden' },
    { id: 38199696, name: 'Red Medicine' },
    { id: 63102017, name: 'Stop Defense' },
    { id: 4206964, name: 'Trap Hole' },
    { id: 54652250, name: 'Man-Eater Bug' },
    { id: 7089711, name: 'Hane-Hane' },
    { id: 18807109, name: 'Spellbinding Circle' },
    { id: 46130346, name: 'Trap Master' },
    { id: 37120512, name: 'Sword of Dark Destruction' }
];

async function run() {
    await ocgLuaRunner.init();

    for (const card of testCards) {
        console.log(`\n--- Testing ${card.name} (${card.id}) ---`);
        const context = {
            turnPlayerIndex: 0,
            onDraw: (p, c) => console.log(`  -> DRAW p=${p}, c=${c}`),
            onDestroy: (t) => console.log(`  -> DESTROY targets=${t}`),
            onDamage: (p, a) => console.log(`  -> DAMAGE p=${p}, a=${a}`),
            onRecover: (p, a) => console.log(`  -> RECOVER p=${p}, a=${a}`),
            onCoin: (p) => console.log(`  -> COIN p=${p}`)
        };

        try {
            const ok = await ocgLuaRunner.executeActivatedEffect(card.id, context);
            console.log(`  Result: ${ok ? 'SUCCESS' : 'FAILED'}`);
        } catch (e) {
            console.log(`  EXCEPTION: ${e.message}`);
        }
    }
}

run();
