/**
 * ============================================================================
 * E2E TEST: VALIDACIÓN EN VIVO DE REQUISITOS Y EFECTOS MODALES (GX & 5D's)
 * Comprueba con clics reales en el navegador:
 * 1. Six Strike - Triple Impact (81426505) - Requisito 3 Six Samurai & 3 opciones
 * 2. Gladiator Taming (9780364) - Requisito Bestia Gladiador & 2 opciones
 * 3. Rainbow Neos (86346643) - 3 opciones modales en campo
 * 4. Shutendoji (65422840) - 2 opciones modales en campo
 * 5. Contact with the Aquamirror (10925955) - Requisito Monstruo AGUA en GY & 2 opciones
 * 6. Six Strike - Thunder Blast (23212990) - Requisito cartas rivales & 2 opciones
 * 7. Cyber Valley (3657444) - 2 opciones modales en campo
 * ============================================================================
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

async function testGxAnd5dModalEffects() {
    console.log('================================================================');
    console.log('🧪 E2E LIVE: VALIDACIÓN OCG DE REQUISITOS Y MODALES EN GX & 5D\'s');
    console.log('================================================================\n');

    const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    const executablePath = chromePaths.find(p => fs.existsSync(p));
    if (!executablePath) throw new Error('No se encontró Chrome/Edge');

    // Login Admin
    const loginRes = await fetch('http://localhost:3006/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'Admin', password: 'Oscar1982', force: true })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) throw new Error('Error login Admin');

    const browser = await puppeteer.launch({
        executablePath,
        headless: "new",
        args: ['--no-sandbox', '--disable-web-security', '--window-size=1400,900']
    });

    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.setViewport({ width: 1400, height: 900 });

    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('404')) {
            consoleErrors.push(`[Console Error] ${msg.text()}`);
        }
    });
    page.on('pageerror', err => {
        consoleErrors.push(`[Page Error] ${err.message}`);
    });

    await page.goto('http://localhost:3006/views/duels/npc/duel-npc.html?npcId=1', { waitUntil: 'domcontentloaded' });
    await page.evaluate((user, token) => {
        localStorage.setItem('ani_dimension_user', JSON.stringify(user));
        sessionStorage.setItem('ani_dimension_user', JSON.stringify(user));
        localStorage.setItem('ani_dimension_token', token);
        if (window.Session) window.Session.saveUser(user);
    }, loginData.user, loginData.sessionToken);

    await page.goto('http://localhost:3006/views/duels/npc/duel-npc.html?npcId=1', { waitUntil: 'networkidle2' });

    await page.waitForFunction(() => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        return s && s.connected;
    }, { timeout: 10000 });

    await page.evaluate(() => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        if (s) s.emit('USER_IDENTIFY', { username: 'Admin' });
    });
    await new Promise(r => setTimeout(r, 400));

    await page.evaluate(async () => {
        if (typeof window.startDuelWithOrder === 'function') {
            await window.startDuelWithOrder('player1');
        } else if (typeof window.rollDice === 'function') {
            window.rollDice();
        }
    });

    await page.waitForSelector('#player-hand', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1200));

    const roomId = await page.evaluate(() => {
        return (window.lastDuelState && window.lastDuelState.roomId) || 'ROOM_DEMO';
    });
    console.log(`⚔️ Sala de duelo activa: ${roomId}\n`);

    const testScenarios = [];

    // =========================================================================
    // CASO 1: SIX STRIKE - TRIPLE IMPACT (81426505) SIN 3 SIX SAMURAI
    // REGLA: Si no hay 3 Six Samurai boca arriba, NO debe mostrar activación
    // =========================================================================
    console.log('▶️ [CASO 1] Probando Six Strike - Triple Impact (81426505) SIN 3 SIX SAMURAI...');
    await page.evaluate(async (rId) => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                phase: 'MAIN_1',
                turnPlayer: 'Admin',
                player1: {
                    monsters: [null, null, null, null, null],
                    spells: [null, null, null, null, null],
                    hand: [
                        { card_id: 81426505, name: 'Six Strike - Triple Impact', type: 'Normal Spell', card_data: { id: 81426505, name: 'Six Strike - Triple Impact', type: 'Normal Spell' } }
                    ]
                }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 500));

    const diagSixSamNoMon = await page.evaluate((targetCardId) => {
        const fakeEvent = { stopPropagation: () => {}, clientX: 250, clientY: 450 };
        if (typeof window.selectHandCard === 'function') {
            window.selectHandCard(0, targetCardId, fakeEvent);
        }
        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
        return buttons.map(b => b.innerText.trim());
    }, 81426505);

    const hasSixSamNoMonAct = diagSixSamNoMon.some(m => m.toUpperCase().includes('ACTIVAR') || m.toUpperCase().includes('OPCIÓN'));
    console.log(`  Opciones UI detectadas: [${diagSixSamNoMon.join(' | ')}]`);
    console.log(`  ¿Botón de activación visible sin 3 Six Samurai?: ${hasSixSamNoMonAct ? 'SÍ (INCORRECTO)' : 'NO (CORRECTO OCG)'}`);

    testScenarios.push({
        test: 'Six Strike sin 3 Six Samurai (Requisito no cumplido)',
        passed: !hasSixSamNoMonAct,
        details: diagSixSamNoMon.join(' | ')
    });

    // =========================================================================
    // CASO 2: SIX STRIKE - TRIPLE IMPACT (81426505) CON 3 SIX SAMURAI
    // REGLA: Con 3 Six Samurai boca arriba, SÍ debe mostrar las 3 OPCIONES
    // =========================================================================
    console.log('\n▶️ [CASO 2] Probando Six Strike - Triple Impact (81426505) CON 3 SIX SAMURAI...');
    await page.evaluate(async (rId) => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                phase: 'MAIN_1',
                turnPlayer: 'Admin',
                player1: {
                    monsters: [
                        { card_id: 27782803, name: 'Grandmaster of the Six Samurai', position: 'ATK', faceDown: false, card_data: { id: 27782803, name: 'Grandmaster of the Six Samurai', type: 'Effect Monster' } },
                        { card_id: 49721904, name: 'The Six Samurai - Zanji', position: 'ATK', faceDown: false, card_data: { id: 49721904, name: 'The Six Samurai - Zanji', type: 'Effect Monster' } },
                        { card_id: 65685470, name: 'The Six Samurai - Irou', position: 'ATK', faceDown: false, card_data: { id: 65685470, name: 'The Six Samurai - Irou', type: 'Effect Monster' } },
                        null, null
                    ],
                    hand: [
                        { card_id: 81426505, name: 'Six Strike - Triple Impact', type: 'Normal Spell', card_data: { id: 81426505, name: 'Six Strike - Triple Impact', type: 'Normal Spell' } }
                    ]
                }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 500));

    const diagSixSamWithMon = await page.evaluate((targetCardId) => {
        const fakeEvent = { stopPropagation: () => {}, clientX: 250, clientY: 450 };
        if (typeof window.selectHandCard === 'function') {
            window.selectHandCard(0, targetCardId, fakeEvent);
        }
        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
        return buttons.map(b => b.innerText.trim());
    }, 81426505);

    const hasSixSamOpt1 = diagSixSamWithMon.some(m => m.toUpperCase().includes('OPCIÓN 1') || m.toUpperCase().includes('MONSTRUOS'));
    const hasSixSamOpt2 = diagSixSamWithMon.some(m => m.toUpperCase().includes('OPCIÓN 2') || m.toUpperCase().includes('MAGIAS/TRAMPAS'));
    const hasSixSamOpt3 = diagSixSamWithMon.some(m => m.toUpperCase().includes('OPCIÓN 3') || m.toUpperCase().includes('BOCA ABAJO'));
    console.log(`  Opciones UI detectadas: [${diagSixSamWithMon.join(' | ')}]`);
    console.log(`  ¿Opción 1 (Monstruos) visible?: ${hasSixSamOpt1 ? 'SÍ' : 'NO'}`);
    console.log(`  ¿Opción 2 (Magias/Trampas) visible?: ${hasSixSamOpt2 ? 'SÍ' : 'NO'}`);
    console.log(`  ¿Opción 3 (Boca abajo) visible?: ${hasSixSamOpt3 ? 'SÍ' : 'NO'}`);

    testScenarios.push({
        test: 'Six Strike con 3 Six Samurai (3 Opciones Modales)',
        passed: hasSixSamOpt1 && hasSixSamOpt2 && hasSixSamOpt3,
        details: diagSixSamWithMon.join(' | ')
    });

    // =========================================================================
    // CASO 3: GLADIATOR TAMING (9780364) SIN BESTIA GLADIADOR
    // REGLA: Sin Bestia Gladiador en el campo, NO debe mostrar activación
    // =========================================================================
    console.log('\n▶️ [CASO 3] Probando Gladiator Taming (9780364) SIN BESTIA GLADIADOR...');
    await page.evaluate(async (rId) => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                phase: 'MAIN_1',
                turnPlayer: 'Admin',
                player1: {
                    monsters: [null, null, null, null, null],
                    spells: [null, null, null, null, null],
                    hand: [
                        { card_id: 9780364, name: 'Gladiator Taming', type: 'Quick-Play Spell', card_data: { id: 9780364, name: 'Gladiator Taming', type: 'Quick-Play Spell' } }
                    ]
                },
                player2: { monsters: [null, null, null, null, null], spells: [null, null, null, null, null] }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 500));

    const diagGladNoMon = await page.evaluate((targetCardId) => {
        const fakeEvent = { stopPropagation: () => {}, clientX: 250, clientY: 450 };
        if (typeof window.selectHandCard === 'function') {
            window.selectHandCard(0, targetCardId, fakeEvent);
        }
        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
        return buttons.map(b => b.innerText.trim());
    }, 9780364);

    const hasGladNoMonAct = diagGladNoMon.some(m => m.toUpperCase().includes('ACTIVAR') || m.toUpperCase().includes('OPCIÓN'));
    console.log(`  Opciones UI detectadas: [${diagGladNoMon.join(' | ')}]`);
    console.log(`  ¿Botón visible sin Bestia Gladiador?: ${hasGladNoMonAct ? 'SÍ (INCORRECTO)' : 'NO (CORRECTO OCG)'}`);

    testScenarios.push({
        test: 'Gladiator Taming sin Bestia Gladiador (Requisito no cumplido)',
        passed: !hasGladNoMonAct,
        details: diagGladNoMon.join(' | ')
    });

    // =========================================================================
    // CASO 4: GLADIATOR TAMING (9780364) CON BESTIA GLADIADOR
    // REGLA: Con Bestia Gladiador en campo, SÍ debe mostrar opciones modales
    // =========================================================================
    console.log('\n▶️ [CASO 4] Probando Gladiator Taming (9780364) CON BESTIA GLADIADOR...');
    await page.evaluate(async (rId) => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                phase: 'MAIN_1',
                turnPlayer: 'Admin',
                player1: {
                    monsters: [
                        { card_id: 70781052, name: 'Gladiator Beast Laquari', position: 'ATK', faceDown: false, card_data: { id: 70781052, name: 'Gladiator Beast Laquari', type: 'Effect Monster' } },
                        null, null, null, null
                    ],
                    hand: [
                        { card_id: 9780364, name: 'Gladiator Taming', type: 'Quick-Play Spell', card_data: { id: 9780364, name: 'Gladiator Taming', type: 'Quick-Play Spell' } }
                    ]
                },
                player2: {
                    monsters: [
                        { card_id: 78868119, name: 'Gladiator Beast Bestiari', position: 'ATK', faceDown: false, card_data: { id: 78868119, name: 'Gladiator Beast Bestiari', type: 'Effect Monster' } },
                        null, null, null, null
                    ]
                }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 500));

    const diagGladWithMon = await page.evaluate((targetCardId) => {
        const fakeEvent = { stopPropagation: () => {}, clientX: 250, clientY: 450 };
        if (typeof window.selectHandCard === 'function') {
            window.selectHandCard(0, targetCardId, fakeEvent);
        }
        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
        return buttons.map(b => b.innerText.trim());
    }, 9780364);

    const hasGladOpt1 = diagGladWithMon.some(m => m.toUpperCase().includes('OPCIÓN 1') || m.toUpperCase().includes('POSICIÓN'));
    const hasGladOpt2 = diagGladWithMon.some(m => m.toUpperCase().includes('OPCIÓN 2') || m.toUpperCase().includes('CONTROL'));
    console.log(`  Opciones UI detectadas: [${diagGladWithMon.join(' | ')}]`);
    console.log(`  ¿Opción 1 (Posición) visible?: ${hasGladOpt1 ? 'SÍ' : 'NO'}`);
    console.log(`  ¿Opción 2 (Tomar Control) visible?: ${hasGladOpt2 ? 'SÍ' : 'NO'}`);

    testScenarios.push({
        test: 'Gladiator Taming con Bestia Gladiador (2 Opciones Modales)',
        passed: hasGladOpt1 && hasGladOpt2,
        details: diagGladWithMon.join(' | ')
    });

    // =========================================================================
    // CASO 5: RAINBOW NEOS (86346643) EN CAMPO - 3 OPCIONES MODALES
    // =========================================================================
    console.log('\n▶️ [CASO 5] Probando Rainbow Neos (86346643) en Campo...');
    await page.evaluate(async (rId) => {
        if (typeof window.hideContextMenu === 'function') window.hideContextMenu();
        const btns = document.getElementById('context-menu-buttons');
        if (btns) btns.innerHTML = '';
        document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));

        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                phase: 'MAIN_1',
                turnPlayer: 'Admin',
                player1: {
                    monsters: [
                        { card_id: 86346643, name: 'Rainbow Neos', atk: 4500, def: 3000, position: 'ATK', faceDown: false, card_data: { id: 86346643, name: 'Rainbow Neos', type: 'Fusion Effect Monster' } },
                        null, null, null, null
                    ]
                }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 500));

    const diagRN = await page.evaluate(() => {
        const fakeEvent = { stopPropagation: () => {}, clientX: 300, clientY: 500 };
        if (typeof window.onSlotClick === 'function') {
            window.onSlotClick('P_M', 0, fakeEvent);
        }
        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
        return buttons.map(b => b.innerText.trim());
    });

    const hasRNOpt1 = diagRN.some(m => m.toUpperCase().includes('OPCIÓN 1') || m.toUpperCase().includes('MONSTRUOS'));
    const hasRNOpt2 = diagRN.some(m => m.toUpperCase().includes('OPCIÓN 2') || m.toUpperCase().includes('MAGIAS/TRAMPAS'));
    const hasRNOpt3 = diagRN.some(m => m.toUpperCase().includes('OPCIÓN 3') || m.toUpperCase().includes('CEMENTERIO'));
    console.log(`  Opciones UI detectadas: [${diagRN.join(' | ')}]`);
    console.log(`  ¿Opción 1 (Monstruos al Deck) visible?: ${hasRNOpt1 ? 'SÍ' : 'NO'}`);
    console.log(`  ¿Opción 2 (Magias/Trampas al Deck) visible?: ${hasRNOpt2 ? 'SÍ' : 'NO'}`);
    console.log(`  ¿Opción 3 (GY al Deck) visible?: ${hasRNOpt3 ? 'SÍ' : 'NO'}`);

    testScenarios.push({
        test: 'Rainbow Neos en Campo (3 Opciones Modales)',
        passed: hasRNOpt1 && hasRNOpt2 && hasRNOpt3,
        details: diagRN.join(' | ')
    });

    // =========================================================================
    // CASO 6: SHUTENDOJI (65422840) EN CAMPO - 2 OPCIONES MODALES
    // =========================================================================
    console.log('\n▶️ [CASO 6] Probando Shutendoji (65422840) en Campo...');
    await page.evaluate(async (rId) => {
        if (typeof window.hideContextMenu === 'function') window.hideContextMenu();
        const btns = document.getElementById('context-menu-buttons');
        if (btns) btns.innerHTML = '';

        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                phase: 'MAIN_1',
                turnPlayer: 'Admin',
                player1: {
                    monsters: [
                        { card_id: 65422840, name: 'Shutendoji', atk: 1500, def: 800, position: 'ATK', faceDown: false, card_data: { id: 65422840, name: 'Shutendoji', type: 'Effect Monster' } },
                        null, null, null, null
                    ]
                }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 500));

    const diagShut = await page.evaluate(() => {
        const fakeEvent = { stopPropagation: () => {}, clientX: 300, clientY: 500 };
        if (typeof window.onSlotClick === 'function') {
            window.onSlotClick('P_M', 0, fakeEvent);
        }
        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
        return buttons.map(b => b.innerText.trim());
    });

    const hasShutOpt1 = diagShut.some(m => m.toUpperCase().includes('OPCIÓN 1') || m.toUpperCase().includes('ROBAR'));
    const hasShutOpt2 = diagShut.some(m => m.toUpperCase().includes('OPCIÓN 2') || m.toUpperCase().includes('CIMA DEL DECK'));
    console.log(`  Opciones UI detectadas: [${diagShut.join(' | ')}]`);
    console.log(`  ¿Opción 1 (Desterrar Zombis y Robar) visible?: ${hasShutOpt1 ? 'SÍ' : 'NO'}`);
    console.log(`  ¿Opción 2 (Recuperar Zombi al Deck) visible?: ${hasShutOpt2 ? 'SÍ' : 'NO'}`);

    testScenarios.push({
        test: 'Shutendoji en Campo (2 Opciones Modales)',
        passed: hasShutOpt1 && hasShutOpt2,
        details: diagShut.join(' | ')
    });

    // =========================================================================
    // CASO 7: CONTACT WITH THE AQUAMIRROR (10925955) SIN AGUA EN GY
    // =========================================================================
    console.log('\n▶️ [CASO 7] Probando Contact with the Aquamirror (10925955) SIN AGUA EN GY...');
    await page.evaluate(async (rId) => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                phase: 'MAIN_1',
                turnPlayer: 'Admin',
                player1: {
                    monsters: [null, null, null, null, null],
                    graveyard: [],
                    hand: [
                        { card_id: 10925955, name: 'Contact with the Aquamirror', type: 'Normal Spell', card_data: { id: 10925955, name: 'Contact with the Aquamirror', type: 'Normal Spell' } }
                    ]
                }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 500));

    const diagAquaNoWater = await page.evaluate((targetCardId) => {
        const fakeEvent = { stopPropagation: () => {}, clientX: 250, clientY: 450 };
        if (typeof window.selectHandCard === 'function') {
            window.selectHandCard(0, targetCardId, fakeEvent);
        }
        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
        return buttons.map(b => b.innerText.trim());
    }, 10925955);

    const hasAquaNoWaterAct = diagAquaNoWater.some(m => m.toUpperCase().includes('ACTIVAR') || m.toUpperCase().includes('OPCIÓN'));
    console.log(`  Opciones UI detectadas: [${diagAquaNoWater.join(' | ')}]`);
    console.log(`  ¿Botón visible sin AGUA en GY?: ${hasAquaNoWaterAct ? 'SÍ (INCORRECTO)' : 'NO (CORRECTO OCG)'}`);

    testScenarios.push({
        test: 'Contact with the Aquamirror sin AGUA en GY (Requisito no cumplido)',
        passed: !hasAquaNoWaterAct,
        details: diagAquaNoWater.join(' | ')
    });

    // =========================================================================
    // CASO 8: CONTACT WITH THE AQUAMIRROR (10925955) CON AGUA EN GY
    // =========================================================================
    console.log('\n▶️ [CASO 8] Probando Contact with the Aquamirror (10925955) CON AGUA EN GY...');
    await page.evaluate(async (rId) => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                phase: 'MAIN_1',
                turnPlayer: 'Admin',
                player1: {
                    monsters: [null, null, null, null, null],
                    graveyard: [
                        { card_id: 7459013, name: 'Treeborn Frog', attribute: 'WATER', card_data: { id: 7459013, name: 'Treeborn Frog', attribute: 'WATER', type: 'Effect Monster' } }
                    ],
                    hand: [
                        { card_id: 10925955, name: 'Contact with the Aquamirror', type: 'Normal Spell', card_data: { id: 10925955, name: 'Contact with the Aquamirror', type: 'Normal Spell' } }
                    ]
                }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 500));

    const diagAquaWithWater = await page.evaluate((targetCardId) => {
        const fakeEvent = { stopPropagation: () => {}, clientX: 250, clientY: 450 };
        if (typeof window.selectHandCard === 'function') {
            window.selectHandCard(0, targetCardId, fakeEvent);
        }
        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
        return buttons.map(b => b.innerText.trim());
    }, 10925955);

    const hasAquaOpt1 = diagAquaWithWater.some(m => m.toUpperCase().includes('OPCIÓN 1') || m.toUpperCase().includes('MANO'));
    const hasAquaOpt2 = diagAquaWithWater.some(m => m.toUpperCase().includes('OPCIÓN 2') || m.toUpperCase().includes('DECK'));
    console.log(`  Opciones UI detectadas: [${diagAquaWithWater.join(' | ')}]`);
    console.log(`  ¿Opción 1 (Mano) visible?: ${hasAquaOpt1 ? 'SÍ' : 'NO'}`);
    console.log(`  ¿Opción 2 (Deck) visible?: ${hasAquaOpt2 ? 'SÍ' : 'NO'}`);

    testScenarios.push({
        test: 'Contact with the Aquamirror con AGUA en GY (2 Opciones Modales)',
        passed: hasAquaOpt1 && hasAquaOpt2,
        details: diagAquaWithWater.join(' | ')
    });

    // =========================================================================
    // CASO 9: SIX STRIKE - THUNDER BLAST (23212990) SIN CARTAS RIVALES
    // =========================================================================
    console.log('\n▶️ [CASO 9] Probando Six Strike - Thunder Blast (23212990) SIN CARTAS RIVALES...');
    await page.evaluate(async (rId) => {
        if (typeof window.hideContextMenu === 'function') window.hideContextMenu();
        const btns = document.getElementById('context-menu-buttons');
        if (btns) btns.innerHTML = '';

        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                phase: 'MAIN_1',
                turnPlayer: 'Admin',
                player1: {
                    monsters: [null, null, null, null, null],
                    spells: [
                        { card_id: 23212990, name: 'Six Strike - Thunder Blast', position: 'SET', faceDown: true, card_data: { id: 23212990, name: 'Six Strike - Thunder Blast', type: 'Normal Trap' } },
                        null, null, null, null
                    ]
                },
                player2: { monsters: [null, null, null, null, null], spells: [null, null, null, null, null] }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 500));

    const diagThunderNoOpp = await page.evaluate(() => {
        const fakeEvent = { stopPropagation: () => {}, clientX: 300, clientY: 550 };
        if (typeof window.onSlotClick === 'function') {
            window.onSlotClick('P_S', 0, fakeEvent);
        }
        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
        return buttons.map(b => b.innerText.trim());
    });

    const hasThunderNoOppAct = diagThunderNoOpp.some(m => m.toUpperCase().includes('ACTIVAR') || m.toUpperCase().includes('OPCIÓN'));
    console.log(`  Opciones UI detectadas: [${diagThunderNoOpp.join(' | ')}]`);
    console.log(`  ¿Botón visible sin cartas rivales?: ${hasThunderNoOppAct ? 'SÍ (INCORRECTO)' : 'NO (CORRECTO OCG)'}`);

    testScenarios.push({
        test: 'Six Strike - Thunder Blast sin cartas rivales (Requisito no cumplido)',
        passed: !hasThunderNoOppAct,
        details: diagThunderNoOpp.join(' | ')
    });

    // =========================================================================
    // CASO 10: SIX STRIKE - THUNDER BLAST (23212990) CON MONSTRUO RIVAL Y CONTADORES
    // =========================================================================
    console.log('\n▶️ [CASO 10] Probando Six Strike - Thunder Blast (23212990) CON MONSTRUO RIVAL...');
    await page.evaluate(async (rId) => {
        if (typeof window.hideContextMenu === 'function') window.hideContextMenu();
        const btns = document.getElementById('context-menu-buttons');
        if (btns) btns.innerHTML = '';

        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                phase: 'MAIN_1',
                turnPlayer: 'Admin',
                player1: {
                    monsters: [
                        { card_id: 2511717, bushidoCounters: 2, position: 'ATK', faceDown: false, card_data: { id: 2511717, name: 'Six Samurai', type: 'Effect Monster', bushidoCounters: 2 } },
                        null, null, null, null
                    ],
                    spells: [
                        { card_id: 23212990, name: 'Six Strike - Thunder Blast', position: 'SET', faceDown: true, card_data: { id: 23212990, name: 'Six Strike - Thunder Blast', type: 'Normal Trap' } },
                        null, null, null, null
                    ]
                },
                player2: {
                    monsters: [
                        { card_id: 90357090, name: 'Silver Fang', position: 'ATK', faceDown: false, card_data: { id: 90357090, name: 'Silver Fang', type: 'Normal Monster' } },
                        null, null, null, null
                    ],
                    spells: [null, null, null, null, null]
                }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 500));

    const diagThunderWithOpp = await page.evaluate(() => {
        const fakeEvent = { stopPropagation: () => {}, clientX: 300, clientY: 550 };
        if (typeof window.onSlotClick === 'function') {
            window.onSlotClick('P_S', 0, fakeEvent);
        }
        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
        return buttons.map(b => b.innerText.trim());
    });

    const hasThunderOpt1 = diagThunderWithOpp.some(m => m.toUpperCase().includes('OPCIÓN 1') || m.toUpperCase().includes('DESTRUIR'));
    const hasThunderOpt2 = diagThunderWithOpp.some(m => m.toUpperCase().includes('OPCIÓN 2') || m.toUpperCase().includes('MANO'));
    console.log(`  Opciones UI detectadas: [${diagThunderWithOpp.join(' | ')}]`);
    console.log(`  ¿Opción 1 (Destruir) visible?: ${hasThunderOpt1 ? 'SÍ' : 'NO'}`);
    console.log(`  ¿Opción 2 (Mano) visible?: ${hasThunderOpt2 ? 'SÍ' : 'NO'}`);

    testScenarios.push({
        test: 'Six Strike - Thunder Blast con monstruo rival (2 Opciones Modales)',
        passed: hasThunderOpt1 && hasThunderOpt2,
        details: diagThunderWithOpp.join(' | ')
    });

    // =========================================================================
    // CASO 11: CYBER VALLEY (3657444) EN CAMPO - 2 OPCIONES MODALES
    // =========================================================================
    console.log('\n▶️ [CASO 11] Probando Cyber Valley (3657444) en Campo...');
    await page.evaluate(async (rId) => {
        if (typeof window.hideContextMenu === 'function') window.hideContextMenu();
        const btns = document.getElementById('context-menu-buttons');
        if (btns) btns.innerHTML = '';

        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                phase: 'MAIN_1',
                turnPlayer: 'Admin',
                player1: {
                    monsters: [
                        { card_id: 3657444, name: 'Cyber Valley', atk: 0, def: 0, position: 'ATK', faceDown: false, card_data: { id: 3657444, name: 'Cyber Valley', type: 'Effect Monster' } },
                        null, null, null, null
                    ]
                }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 500));

    const diagCV = await page.evaluate(() => {
        const fakeEvent = { stopPropagation: () => {}, clientX: 300, clientY: 500 };
        if (typeof window.onSlotClick === 'function') {
            window.onSlotClick('P_M', 0, fakeEvent);
        }
        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
        return buttons.map(b => b.innerText.trim());
    });

    const hasCVOpt1 = diagCV.some(m => m.toUpperCase().includes('OPCIÓN 1') || m.toUpperCase().includes('ROBAR 2'));
    const hasCVOpt2 = diagCV.some(m => m.toUpperCase().includes('OPCIÓN 2') || m.toUpperCase().includes('CIMA'));
    console.log(`  Opciones UI detectadas: [${diagCV.join(' | ')}]`);
    console.log(`  ¿Opción 1 (Robar 2) visible?: ${hasCVOpt1 ? 'SÍ' : 'NO'}`);
    console.log(`  ¿Opción 2 (Cima Deck) visible?: ${hasCVOpt2 ? 'SÍ' : 'NO'}`);

    testScenarios.push({
        test: 'Cyber Valley en Campo (2 Opciones Modales)',
        passed: hasCVOpt1 && hasCVOpt2,
        details: diagCV.join(' | ')
    });

    // =========================================================================
    // RESUMEN FINAL
    // =========================================================================
    console.log('\n================================================================');
    console.log('📊 REPORTE FINAL DE VALIDACIÓN GX & 5D\'s (11 CASOS COMPLETOS):');
    let allPassed = true;
    testScenarios.forEach(sc => {
        const icon = sc.passed ? '✅' : '❌';
        console.log(`  ${icon} ${sc.test} -> ${sc.passed ? 'PASS' : 'FAIL'} [${sc.details}]`);
        if (!sc.passed) allPassed = false;
    });
    console.log('================================================================\n');

    if (consoleErrors.length > 0) {
        console.warn('⚠️ Se detectaron errores de consola durante la ejecución:');
        consoleErrors.forEach(e => console.warn('  ' + e));
    } else {
        console.log('✅ CERO ERRORES DE CONSOLA DURANTE TODO EL TEST.');
    }

    await browser.close();

    if (!allPassed) {
        throw new Error('Al menos una prueba modal o de requisitos OCG no pasó.');
    }
    console.log('🎉 ¡TODAS LAS 11 PRUEBAS PASARON AL 100% CON ÉXITO!');
}

testGxAnd5dModalEffects().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
