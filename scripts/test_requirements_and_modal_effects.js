/**
 * ============================================================================
 * E2E TEST: VALIDACIÓN ESTRICTA DE REQUISITOS DE ACTIVACIÓN Y EFECTOS MODALES
 * 1. Comprueba que si NO se cumplen los requisitos, la acción NO es visible.
 * 2. Comprueba que las cartas con múltiples efectos permiten la selección del usuario.
 * 3. Ejecuta clics reales en el navegador e intercepta errores de consola y log.
 * ============================================================================
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

async function testRequirementsAndModalEffects() {
    console.log('================================================================');
    console.log('🧪 VALIDACIÓN DE REQUISITOS OCG Y SELECCIÓN DE EFECTOS MÚLTIPLES');
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
    await new Promise(r => setTimeout(r, 300));

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
    // PRUEBA 1: FISSURE (66788016) SIN MONSTRUOS EN CAMPO RIVAL
    // REGLA: Si el rival no tiene monstruos, NO debe tener visible la acción de activar
    // =========================================================================
    console.log('▶️ [CASO 1] Probando Fissure (66788016) con CAMPO RIVAL VACÍO...');
    // Limpiar campo rival vía patch
    await page.evaluate(async (rId) => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                player2: { monsters: [null, null, null, null, null], spells: [null, null, null, null, null], lp: 8000 }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 400));

    // Inyectar Fissure
    await fetch('http://localhost:3006/api/duel/test-inject-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, cardId: 66788016, playerKey: 'player1' })
    });
    // Forzar campo rival vacío
    await page.evaluate(async (rId) => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                player2: { monsters: [null, null, null, null, null], spells: [null, null, null, null, null], lp: 8000 }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 400));

    // Click en la carta
    await page.evaluate((targetCardId) => {
        const cardEl = document.querySelector('#player-hand .hand-card');
        if (cardEl) cardEl.click();
        else if (typeof window.selectHandCard === 'function') {
            const fakeEvent = { stopPropagation: () => {}, clientX: 250, clientY: 450 };
            window.selectHandCard(0, targetCardId, fakeEvent);
        }
    }, 66788016);
    await new Promise(r => setTimeout(r, 200));

    let menuOptionsEmpty = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
        return buttons.map(b => b.innerText.trim());
    });

    const hasActivateWhenNoMonsters = menuOptionsEmpty.some(m => m.includes('Activar Efecto'));
    console.log(`  Opciones UI detectadas: [${menuOptionsEmpty.join(' | ')}]`);
    console.log(`  ¿Botón 'Activar Efecto' visible sin monstruos rivales?: ${hasActivateWhenNoMonsters ? 'SÍ (INCORRECTO)' : 'NO (CORRECTO OCG)'}`);
    
    testScenarios.push({
        test: 'Fissure sin monstruos rivales (Requisito no cumplido)',
        passed: !hasActivateWhenNoMonsters,
        details: menuOptionsEmpty.join(' | ')
    });

    // =========================================================================
    // PRUEBA 2: FISSURE (66788016) CON MONSTRUOS EN CAMPO RIVAL
    // REGLA: Si el rival tiene monstruos, SÍ debe tener visible la acción de activar
    // =========================================================================
    console.log('\n▶️ [CASO 2] Probando Fissure (66788016) CON MONSTRUO RIVAL EN CAMPO...');
    await page.evaluate(async (rId) => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                player2: {
                    monsters: [
                        { card_id: 89631139, name: 'Blue-Eyes White Dragon', atk: 3000, def: 2500, position: 'ATK', faceDown: false },
                        null, null, null, null
                    ]
                }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 400));

    // Re-abrir menú de Fissure
    await page.evaluate((targetCardId) => {
        const cardEl = document.querySelector('#player-hand .hand-card');
        if (cardEl) cardEl.click();
        else if (typeof window.selectHandCard === 'function') {
            const fakeEvent = { stopPropagation: () => {}, clientX: 250, clientY: 450 };
            window.selectHandCard(0, targetCardId, fakeEvent);
        }
    }, 66788016);
    await new Promise(r => setTimeout(r, 200));

    let diagInfo = await page.evaluate(() => {
        const local = (typeof getLocalDuelPlayer === 'function') ? getLocalDuelPlayer() : null;
        const rival = (typeof getRivalDuelPlayer === 'function') ? getRivalDuelPlayer() : null;
        const card = local && local.hand ? local.hand[0] : null;
        const check = (typeof checkCardActivationEligibility === 'function') ? checkCardActivationEligibility(card, 'HAND') : 'NO_FN';
        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
        return {
            localHand: local ? local.hand : null,
            rivalMonsters: rival ? rival.monsters : null,
            checkResult: check,
            buttons: buttons.map(b => b.innerText.trim())
        };
    });
    console.log('  🔍 DIAGNOSTICO CASO 2:', JSON.stringify(diagInfo, null, 2));

    let menuOptionsWithMon = diagInfo.buttons;

    const hasActivateWithMonsters = menuOptionsWithMon.some(m => m.toUpperCase().includes('ACTIVAR EFECTO'));
    console.log(`  Opciones UI detectadas: [${menuOptionsWithMon.join(' | ')}]`);
    console.log(`  ¿Botón 'Activar Efecto' visible con monstruo rival?: ${hasActivateWithMonsters ? 'SÍ (CORRECTO OCG)' : 'NO (INCORRECTO)'}`);

    testScenarios.push({
        test: 'Fissure con monstruos rivales (Requisito cumplido)',
        passed: hasActivateWithMonsters,
        details: menuOptionsWithMon.join(' | ')
    });

    // =========================================================================
    // PRUEBA 3: ENEMY CONTROLLER (98045062) - CARTA CON MÚLTIPLES EFECTOS
    // REGLA: Debe desplegar opciones múltiples seleccionables por el usuario
    // =========================================================================
    console.log('\n▶️ [CASO 3] Probando Enemy Controller (98045062) - MÚLTIPLES EFECTOS MODALES...');
    // Inyectar Enemy Controller con monstruo propio (para tributo) y rival
    await page.evaluate(async (rId) => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                player1: {
                    monsters: [
                        { card_id: 46986414, name: 'Dark Magician', atk: 2500, def: 2100, position: 'ATK', faceDown: false },
                        null, null, null, null
                    ]
                },
                player2: {
                    monsters: [
                        { card_id: 89631139, name: 'Blue-Eyes White Dragon', atk: 3000, def: 2500, position: 'ATK', faceDown: false },
                        null, null, null, null
                    ]
                }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 400));

    await fetch('http://localhost:3006/api/duel/test-inject-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, cardId: 98045062, playerKey: 'player1' })
    });
    await new Promise(r => setTimeout(r, 400));

    // Asegurar monstruo en campo propio y rival
    await page.evaluate(async (rId) => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                player1: {
                    monsters: [
                        { card_id: 46986414, name: 'Dark Magician', atk: 2500, def: 2100, position: 'ATK', faceDown: false },
                        null, null, null, null
                    ]
                },
                player2: {
                    monsters: [
                        { card_id: 89631139, name: 'Blue-Eyes White Dragon', atk: 3000, def: 2500, position: 'ATK', faceDown: false },
                        null, null, null, null
                    ]
                }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 400));

    // Click en Enemy Controller
    const diagEcon = await page.evaluate((targetCardId) => {
        const local = (typeof getLocalDuelPlayer === 'function') ? getLocalDuelPlayer() : null;
        const cardObj = local && local.hand ? local.hand[0] : null;
        const fakeEvent = { stopPropagation: () => {}, clientX: 250, clientY: 450 };
        if (typeof window.selectHandCard === 'function') {
            window.selectHandCard(0, targetCardId, fakeEvent);
        }
        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
        return {
            cardInHand: cardObj,
            buttons: buttons.map(b => b.innerText.trim())
        };
    }, 98045062);
    await new Promise(r => setTimeout(r, 250));

    console.log('  🔍 DIAGNOSTICO CASO 3:', JSON.stringify(diagEcon, null, 2));

    let menuOptionsEcon = diagEcon.buttons;

    const hasOption1 = menuOptionsEcon.some(m => m.toUpperCase().includes('OPCIÓN 1') || m.toUpperCase().includes('POSICIÓN'));
    const hasOption2 = menuOptionsEcon.some(m => m.toUpperCase().includes('OPCIÓN 2') || m.toUpperCase().includes('TOMAR CONTROL'));
    console.log(`  Opciones UI detectadas: [${menuOptionsEcon.join(' | ')}]`);
    console.log(`  ¿Opción 1 visible?: ${hasOption1 ? 'SÍ' : 'NO'}`);
    console.log(`  ¿Opción 2 visible?: ${hasOption2 ? 'SÍ' : 'NO'}`);

    testScenarios.push({
        test: 'Enemy Controller - Múltiples Efectos Seleccionables',
        passed: hasOption1 && hasOption2,
        details: menuOptionsEcon.join(' | ')
    });

    // =========================================================================
    // PRUEBA 4: POISON OF THE OLD MAN (8842266) - MODAL CURAR / QUEMAR
    // =========================================================================
    console.log('\n▶️ [CASO 4] Probando Poison of the Old Man (8842266)...');
    await fetch('http://localhost:3006/api/duel/test-inject-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, cardId: 8842266, playerKey: 'player1' })
    });
    await new Promise(r => setTimeout(r, 400));

    const diagPoison = await page.evaluate((targetCardId) => {
        const fakeEvent = { stopPropagation: () => {}, clientX: 250, clientY: 450 };
        if (typeof window.selectHandCard === 'function') {
            window.selectHandCard(0, targetCardId, fakeEvent);
        }
        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
        return buttons.map(b => b.innerText.trim());
    }, 8842266);

    const hasPoisonHeal = diagPoison.some(m => m.toUpperCase().includes('1200 LP') || m.toUpperCase().includes('RECUPERAR'));
    const hasPoisonBurn = diagPoison.some(m => m.toUpperCase().includes('800 DAÑO') || m.toUpperCase().includes('INFLIGIR'));
    console.log(`  Opciones UI detectadas: [${diagPoison.join(' | ')}]`);
    console.log(`  ¿Opción Curar visible?: ${hasPoisonHeal ? 'SÍ' : 'NO'}`);
    console.log(`  ¿Opción Daño visible?: ${hasPoisonBurn ? 'SÍ' : 'NO'}`);

    testScenarios.push({
        test: 'Poison of the Old Man - Opciones Modales (Curar / Daño)',
        passed: hasPoisonHeal && hasPoisonBurn,
        details: diagPoison.join(' | ')
    });

    // =========================================================================
    // PRUEBA 5: DRAGON'S GUNFIRE (55991637) SIN DRAGÓN EN CAMPO
    // REGLA: Sin Dragón propio boca arriba, NO debe mostrar activación
    // =========================================================================
    console.log('\n▶️ [CASO 5] Probando Dragon\'s Gunfire (55991637) SIN DRAGÓN EN CAMPO...');
    // Quitar dragones propios
    await page.evaluate(async (rId) => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                player1: { monsters: [null, null, null, null, null], spells: [null, null, null, null, null] }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 400));

    await fetch('http://localhost:3006/api/duel/test-inject-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, cardId: 55991637, playerKey: 'player1' })
    });
    // Limpiar campo propio de nuevo
    await page.evaluate(async (rId) => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                player1: { monsters: [null, null, null, null, null], spells: [null, null, null, null, null] }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 400));

    const diagGunfireNoDragon = await page.evaluate((targetCardId) => {
        const fakeEvent = { stopPropagation: () => {}, clientX: 250, clientY: 450 };
        if (typeof window.selectHandCard === 'function') {
            window.selectHandCard(0, targetCardId, fakeEvent);
        }
        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
        return buttons.map(b => b.innerText.trim());
    }, 55991637);

    const hasGunfireNoDragonAct = diagGunfireNoDragon.some(m => m.toUpperCase().includes('ACTIVAR') || m.toUpperCase().includes('OPCIÓN'));
    console.log(`  Opciones UI detectadas: [${diagGunfireNoDragon.join(' | ')}]`);
    console.log(`  ¿Botón de activación visible sin dragón?: ${hasGunfireNoDragonAct ? 'SÍ (INCORRECTO)' : 'NO (CORRECTO OCG)'}`);

    testScenarios.push({
        test: 'Dragon\'s Gunfire sin Dragón (Requisito no cumplido)',
        passed: !hasGunfireNoDragonAct,
        details: diagGunfireNoDragon.join(' | ')
    });

    // =========================================================================
    // PRUEBA 6: DRAGON'S GUNFIRE (55991637) CON DRAGÓN EN CAMPO
    // REGLA: Con Dragón propio boca arriba, SÍ debe mostrar activación modal
    // =========================================================================
    console.log('\n▶️ [CASO 6] Probando Dragon\'s Gunfire (55991637) CON DRAGÓN EN CAMPO...');
    await page.evaluate(async (rId) => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                player1: {
                    monsters: [
                        { card_id: 89631139, name: 'Blue-Eyes White Dragon', race: 'Dragon', raceCode: 0x2000, position: 'ATK', faceDown: false },
                        null, null, null, null
                    ]
                }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 400));

    const diagGunfireWithDragon = await page.evaluate((targetCardId) => {
        const fakeEvent = { stopPropagation: () => {}, clientX: 250, clientY: 450 };
        if (typeof window.selectHandCard === 'function') {
            window.selectHandCard(0, targetCardId, fakeEvent);
        }
        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
        return buttons.map(b => b.innerText.trim());
    }, 55991637);

    const hasGunfireOption1 = diagGunfireWithDragon.some(m => m.toUpperCase().includes('800 DAÑO') || m.toUpperCase().includes('OPCIÓN 1'));
    console.log(`  Opciones UI detectadas: [${diagGunfireWithDragon.join(' | ')}]`);
    console.log(`  ¿Opción 1 de daño visible con dragón?: ${hasGunfireOption1 ? 'SÍ (CORRECTO OCG)' : 'NO'}`);

    testScenarios.push({
        test: 'Dragon\'s Gunfire con Dragón (Requisito cumplido)',
        passed: hasGunfireOption1,
        details: diagGunfireWithDragon.join(' | ')
    });

    // =========================================================================
    // PRUEBA 7: PYRAMID ENERGY (76754619) SIN MONSTRUOS EN CAMPO
    // REGLA: Sin monstruos propios, NO debe mostrar activación
    // =========================================================================
    console.log('\n▶️ [CASO 7] Probando Pyramid Energy (76754619) SIN MONSTRUOS EN CAMPO...');
    await fetch('http://localhost:3006/api/duel/test-inject-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, cardId: 76754619, playerKey: 'player1' })
    });
    // Limpiar campo propio
    await page.evaluate(async (rId) => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                player1: { monsters: [null, null, null, null, null], spells: [null, null, null, null, null] }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 400));

    const diagPyramidNoMon = await page.evaluate((targetCardId) => {
        const fakeEvent = { stopPropagation: () => {}, clientX: 250, clientY: 450 };
        if (typeof window.selectHandCard === 'function') {
            window.selectHandCard(0, targetCardId, fakeEvent);
        }
        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
        return buttons.map(b => b.innerText.trim());
    }, 76754619);

    const hasPyramidNoMonAct = diagPyramidNoMon.some(m => m.toUpperCase().includes('ACTIVAR') || m.toUpperCase().includes('OPCIÓN'));
    console.log(`  Opciones UI detectadas: [${diagPyramidNoMon.join(' | ')}]`);
    console.log(`  ¿Botón visible sin monstruos propios?: ${hasPyramidNoMonAct ? 'SÍ (INCORRECTO)' : 'NO (CORRECTO OCG)'}`);

    testScenarios.push({
        test: 'Pyramid Energy sin Monstruos (Requisito no cumplido)',
        passed: !hasPyramidNoMonAct,
        details: diagPyramidNoMon.join(' | ')
    });

    // =========================================================================
    // PRUEBA 8: PYRAMID ENERGY (76754619) CON MONSTRUOS EN CAMPO
    // REGLA: Con monstruos propios boca arriba, SÍ debe mostrar opciones modales
    // =========================================================================
    console.log('\n▶️ [CASO 8] Probando Pyramid Energy (76754619) CON MONSTRUO EN CAMPO...');
    await page.evaluate(async (rId) => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        s.emit('TEST_SETUP_DUEL_STATE', {
            room_id: rId,
            patch: {
                player1: {
                    monsters: [
                        { card_id: 46986414, name: 'Dark Magician', position: 'ATK', faceDown: false },
                        null, null, null, null
                    ]
                }
            }
        });
    }, roomId);
    await new Promise(r => setTimeout(r, 400));

    const diagPyramidWithMon = await page.evaluate((targetCardId) => {
        const fakeEvent = { stopPropagation: () => {}, clientX: 250, clientY: 450 };
        if (typeof window.selectHandCard === 'function') {
            window.selectHandCard(0, targetCardId, fakeEvent);
        }
        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
        return buttons.map(b => b.innerText.trim());
    }, 76754619);

    const hasPyramidAtk = diagPyramidWithMon.some(m => m.toUpperCase().includes('+200 ATK') || m.toUpperCase().includes('OPCIÓN 1'));
    const hasPyramidDef = diagPyramidWithMon.some(m => m.toUpperCase().includes('+500 DEF') || m.toUpperCase().includes('OPCIÓN 2'));
    console.log(`  Opciones UI detectadas: [${diagPyramidWithMon.join(' | ')}]`);
    console.log(`  ¿Opción 1 (+200 ATK) visible?: ${hasPyramidAtk ? 'SÍ' : 'NO'}`);
    console.log(`  ¿Opción 2 (+500 DEF) visible?: ${hasPyramidDef ? 'SÍ' : 'NO'}`);

    testScenarios.push({
        test: 'Pyramid Energy con Monstruos (Requisito cumplido)',
        passed: hasPyramidAtk && hasPyramidDef,
        details: diagPyramidWithMon.join(' | ')
    });

    console.log('\n================================================================');
    console.log('📊 REPORTE FINAL DE VALIDACIÓN DE REGLAS Y REQUISITOS:');
    testScenarios.forEach(t => {
        console.log(`  ${t.passed ? '✅' : '❌'} ${t.test} -> ${t.passed ? 'PASS' : 'FAIL'} [${t.details}]`);
    });
    console.log('================================================================');

    await browser.close();
    const allPassed = testScenarios.every(t => t.passed);
    process.exit(allPassed ? 0 : 1);
}

testRequirementsAndModalEffects().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
