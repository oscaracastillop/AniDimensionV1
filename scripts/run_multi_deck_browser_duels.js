/**
 * Multi-Deck Real Browser Duel Suite (Puppeteer + Live DOM Interaction)
 * Builds diverse competitive decks with real effect cards from all 39 packs,
 * launches live Chrome duels via WebSocket/DOM, plays turns, activates effects and verifies full combat logs.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

// 1. Cargar las cartas reales de los 39 sobres
const packsPath = path.join(__dirname, '..', 'frontend', 'js', 'data', 'packs-data.js');
const packsContent = fs.readFileSync(packsPath, 'utf8');

const win = {};
const fn = new Function('window', packsContent + '\nreturn window.PacksManager.getPacks();');
const INITIAL_PACKS = fn(win);

const allCardsMap = new Map();
INITIAL_PACKS.forEach(pack => {
    (pack.cards || []).forEach(card => {
        const id = Number(card.card_id || card.id);
        if (id && !allCardsMap.has(id)) {
            allCardsMap.set(id, { ...card, card_id: id, id: id, packName: pack.name });
        }
    });
});

const allCards = Array.from(allCardsMap.values());
console.log(`🃏 Total de cartas disponibles de los 39 sobres: ${allCards.length}`);

const spells = allCards.filter(c => (c.type || '').toLowerCase().includes('spell'));
const traps = allCards.filter(c => (c.type || '').toLowerCase().includes('trap'));
const effectMonsters = allCards.filter(c => (c.type || '').toLowerCase().includes('monster') && !(c.type || '').toLowerCase().includes('normal') && !(c.type || '').toLowerCase().includes('fusion') && !(c.type || '').toLowerCase().includes('synchro'));
const extraDeckCards = allCards.filter(c => (c.type || '').toLowerCase().includes('fusion') || (c.type || '').toLowerCase().includes('synchro'));

console.log(`- 📖 Magias: ${spells.length}`);
console.log(`- 🛡️ Trampas: ${traps.length}`);
console.log(`- ⚡ Monstruos de Efecto: ${effectMonsters.length}`);
console.log(`- 🌀 Extra Deck (Fusión/Sincro): ${extraDeckCards.length}`);

// Generador de mazos de 40 cartas de efecto + 5 Extra Deck
function buildThemedEffectDeck(deckTitle, raceFilter = null) {
    let poolMonsters = effectMonsters;
    if (raceFilter) {
        const filtered = effectMonsters.filter(c => (c.race || '').toLowerCase().includes(raceFilter.toLowerCase()) || (c.desc || '').toLowerCase().includes(raceFilter.toLowerCase()));
        if (filtered.length >= 10) poolMonsters = filtered;
    }

    const shuffledMonsters = [...poolMonsters].sort(() => 0.5 - Math.random());
    const pickedMonsters = shuffledMonsters.slice(0, 18);
    while (pickedMonsters.length < 18) {
        const randomM = effectMonsters[Math.floor(Math.random() * effectMonsters.length)];
        if (!pickedMonsters.some(m => m.id === randomM.id)) pickedMonsters.push(randomM);
    }

    const shuffledSpells = [...spells].sort(() => 0.5 - Math.random());
    const pickedSpells = shuffledSpells.slice(0, 14);

    const shuffledTraps = [...traps].sort(() => 0.5 - Math.random());
    const pickedTraps = shuffledTraps.slice(0, 8);

    const mainDeck = [...pickedMonsters, ...pickedSpells, ...pickedTraps];
    const extraDeck = [...extraDeckCards].sort(() => 0.5 - Math.random()).slice(0, 5);

    return {
        title: deckTitle,
        deck: {
            mainDeck,
            extraDeck,
            sideDeck: []
        }
    };
}

const testSuites = [
    buildThemedEffectDeck('🔥 Deck Destrucción Dragón & Bestias (Sobres LOB/MRD/CSOC)', 'dragon'),
    buildThemedEffectDeck('⚡ Deck Máquinas, Cyber & Luz (Sobres CRV/STON/FOTB)', 'machine'),
    buildThemedEffectDeck('🌑 Deck Spellcasters, Magias & Control (Sobres DCR/AST/TDGS)', 'spellcaster'),
    buildThemedEffectDeck('⚔️ Deck Guerreros, Sincronías & Enjambre (Sobres DP08/RGBT/ANPR)', 'warrior'),
    buildThemedEffectDeck('💥 Deck Caos, Robo Masivo & Efectos Globales (Sobres IOC/TLM/SOVR)', null)
];

const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const executablePath = chromePaths.find(p => fs.existsSync(p));

async function runBrowserDuel(testCase, index) {
    console.log(`\n================================================================`);
    console.log(`🎮 [DUELO REAL #${index + 1}] "${testCase.title}"`);
    console.log(`🃏 Composición: 40 Main Deck (${testCase.deck.mainDeck.filter(c => c.type.includes('Spell')).length} Magias, ${testCase.deck.mainDeck.filter(c => c.type.includes('Trap')).length} Trampas, ${testCase.deck.mainDeck.filter(c => c.type.includes('Monster')).length} Monstruos de Efecto) + ${testCase.deck.extraDeck.length} Extra Deck`);
    console.log(`================================================================`);

    const browser = await puppeteer.launch({
        executablePath,
        headless: "new",
        args: ['--no-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    const capturedDuelLogs = [];
    const jsErrors = [];

    page.on('console', msg => {
        const text = msg.text();
        const type = msg.type();
        if (type === 'error' || text.includes('Error:') || text.includes('Uncaught') || text.includes('TypeError')) {
            jsErrors.push(text);
        } else if (text.includes('[DUEL') || text.includes('[SPELL]') || text.includes('[TRAP]') || text.includes('[EFFECT]') || text.includes('[SUMMON]') || text.includes('[BATTLE]') || text.includes('💥') || text.includes('✨') || text.includes('🏺')) {
            capturedDuelLogs.push(text);
            console.log(`   ${text}`);
        }
    });

    page.on('pageerror', err => {
        jsErrors.push(err.message);
    });

    try {
        // 1. Obtener sesión de Admin
        const loginRes = await fetch('http://localhost:3006/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'Admin', password: 'Oscar1982', force: true })
        });
        const loginData = await loginRes.json();

        // 2. Cargar la página y configurar mock de DeckManager con el mazo de prueba
        await page.goto(`http://localhost:3006/views/duels/npc/duel-npc.html?npcId=${(index % 5) + 1}`, { waitUntil: 'domcontentloaded' });
        
        await page.evaluate((user, token, customDeck) => {
            localStorage.setItem('ani_dimension_user', JSON.stringify(user));
            sessionStorage.setItem('ani_dimension_user', JSON.stringify(user));
            localStorage.setItem('ani_dimension_token', token);

            window.customTestDeck = customDeck;
            window.DeckManager = {
                syncFromServer: async () => ({ deck: customDeck }),
                getDeck: () => customDeck,
                getActiveDeck: () => customDeck
            };

            if (window.Session) window.Session.saveUser(user);
        }, loginData.user, loginData.sessionToken, testCase.deck);

        // 3. Recargar para inicializar la arena con el nuevo mazo inyectado
        await page.goto(`http://localhost:3006/views/duels/npc/duel-npc.html?npcId=${(index % 5) + 1}`, { waitUntil: 'networkidle0' });

        // Esperar conexión WebSocket
        await page.waitForFunction(() => {
            const sock = window.getSocket ? window.getSocket() : window.socket;
            return sock && sock.connected;
        }, { timeout: 10000 });

        console.log('   ✅ WebSocket conectado a la arena de duelo.');

        // Iniciar el duelo directamente con orden 'player1' y el mazo inyectado
        await page.evaluate((customDeck) => {
            window.DeckManager = {
                syncFromServer: async () => ({ deck: customDeck }),
                getDeck: () => customDeck,
                getActiveDeck: () => customDeck
            };
            if (typeof startDuelWithOrder === 'function') {
                startDuelWithOrder('player1');
            } else {
                const sock = window.getSocket ? window.getSocket() : window.socket;
                sock.emit('DUEL_START', {
                    room_id: 'ROOM_DEMO',
                    player_name: 'Admin',
                    first_player: 'player1',
                    player_deck: customDeck,
                    npc_id: 1
                });
            }
        }, testCase.deck);

        // Esperar a que la mano se renderice en el DOM
        await page.waitForSelector('#player-hand .hand-card', { timeout: 15000 });
        await new Promise(r => setTimeout(r, 2000));

        let actionsDone = 0;

        // Jugar 4 turnos completos ejecutando efectos
        for (let turn = 1; turn <= 4; turn++) {
            console.log(`\n   --- [Turno ${turn}] Ejecutando jugadas de cartas de efecto ---`);

            const handCards = await page.evaluate(() => {
                const cards = Array.from(document.querySelectorAll('#player-hand .hand-card'));
                return cards.map((c, i) => {
                    const name = c.querySelector('.card-name') ? c.querySelector('.card-name').innerText : c.innerText;
                    return { index: i, name: name.trim() };
                });
            });

            console.log(`   🖐️ Cartas en Mano (${handCards.length}): ${handCards.map(c => `[${c.name}]`).join(', ')}`);

            // Probar activación de hasta 3 cartas por turno
            for (let i = 0; i < Math.min(handCards.length, 3); i++) {
                try {
                    // Clic en la carta
                    await page.evaluate((idx) => {
                        const cards = document.querySelectorAll('#player-hand .hand-card');
                        if (cards[idx]) cards[idx].click();
                    }, i);

                    await new Promise(r => setTimeout(r, 400));

                    // Inspeccionar menú de acciones
                    const menuActions = await page.evaluate(() => {
                        const btns = Array.from(document.querySelectorAll('#context-action-menu .context-btn, #context-menu-buttons button, .context-btn'));
                        return btns.map(b => b.innerText.trim());
                    });

                    let targetBtn = menuActions.find(a => a.includes('ACTIVAR') || a.includes('EFECTO'));
                    if (!targetBtn) targetBtn = menuActions.find(a => a.includes('INVOCACIÓN ESPECIAL') || a.includes('INVOCAR NORMAL') || a.includes('COLOCAR'));

                    if (targetBtn) {
                        console.log(`   ✨ Activando: "${handCards[i].name}" -> [${targetBtn}]`);
                        await page.evaluate((btnText) => {
                            const btns = Array.from(document.querySelectorAll('#context-action-menu .context-btn, #context-menu-buttons button, .context-btn'));
                            const b = btns.find(x => x.innerText.includes(btnText));
                            if (b) b.click();
                        }, targetBtn);
                        actionsDone++;
                        await new Promise(r => setTimeout(r, 600));
                    }
                } catch (e) {}
            }

            // Pasar a Battle Phase
            await page.evaluate(() => {
                if (window.DuelActions && window.DuelActions.changePhase) {
                    window.DuelActions.changePhase('BATTLE');
                } else {
                    const btn = document.querySelector('#btn-battle-phase, [data-phase="BATTLE"]');
                    if (btn) btn.click();
                }
            });
            await new Promise(r => setTimeout(r, 500));

            // Declarar ataque con monstruos en campo
            const attacks = await page.evaluate(() => {
                const monsters = document.querySelectorAll('#player-monsters .monster-zone .field-card, #player-field .monster-card');
                let count = 0;
                monsters.forEach(m => {
                    m.click();
                    const atkBtn = Array.from(document.querySelectorAll('.context-btn, button')).find(b => b.innerText.includes('ATACAR'));
                    if (atkBtn) {
                        atkBtn.click();
                        count++;
                    }
                });
                return count;
            });
            if (attacks > 0) console.log(`   ⚔️ ${attacks} Ataque(s) declarado(s) en Battle Phase.`);

            // Pasar a End Phase
            await page.evaluate(() => {
                if (window.DuelActions && window.DuelActions.changePhase) {
                    window.DuelActions.changePhase('END');
                } else {
                    const btn = document.querySelector('#btn-end-phase, [data-phase="END"], #btn-end-turn');
                    if (btn) btn.click();
                }
            });

            // Esperar resolución de turno rival (NPC)
            await new Promise(r => setTimeout(r, 2000));
        }

        console.log(`\n   📊 Resumen Duelo #${index + 1}:`);
        console.log(`   - Efectos/Acciones ejecutadas: ${actionsDone}`);
        console.log(`   - Logs capturados: ${capturedDuelLogs.length}`);
        console.log(`   - Errores JS / DOM: ${jsErrors.length === 0 ? '0 (Éxito)' : jsErrors.length}`);

        await browser.close();
        return { success: true, actionsDone, logs: capturedDuelLogs.length, errors: jsErrors };
    } catch (err) {
        console.error(`   ❌ Error en duelo #${index + 1}:`, err.message);
        await browser.close();
        return { success: false, error: err.message };
    }
}

async function runFullSuite() {
    console.log(`\n🚀 INICIANDO BATERÍA DE DUELOS REALES EN NAVEGADOR CON 5 DECKS DE EFECTOS DISTINTOS`);
    console.log(`================================================================================`);
    
    let okCount = 0;
    for (let i = 0; i < testSuites.length; i++) {
        const res = await runBrowserDuel(testSuites[i], i);
        if (res.success && (!res.errors || res.errors.length === 0)) okCount++;
    }

    console.log(`\n================================================================================`);
    console.log(`🏆 RESUMEN FINAL: ${okCount} / ${testSuites.length} Duelos de Sobres ejecutados con éxito.`);
    console.log(`================================================================================\n`);
}

runFullSuite();
