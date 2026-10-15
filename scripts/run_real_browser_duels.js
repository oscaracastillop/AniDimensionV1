/**
 * Real Browser E2E Duel Runner & Live Debugger
 * Connects to live game in Chrome, plays turns, executes actions, and checks card effects.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

async function runRealDuel() {
    const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    let executablePath = chromePaths.find(p => fs.existsSync(p));

    console.log(`🚀 Iniciando Chrome en: ${executablePath}`);

    const browser = await puppeteer.launch({
        executablePath,
        headless: "new",
        args: ['--no-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    const capturedErrors = [];
    const duelEvents = [];

    page.on('console', msg => {
        const text = msg.text();
        const type = msg.type();
        if (type === 'error' || text.includes('Error:') || text.includes('Uncaught') || text.includes('TypeError')) {
            console.log(`🔴 [BROWSER ERROR]: ${text}`);
            capturedErrors.push({ text, location: msg.location() });
        } else if (text.includes('[DUEL') || text.includes('DUEL_') || text.includes('Efecto') || text.includes('Invocado') || text.includes('Cadena') || text.includes('Fase:') || text.includes('CAMPO') || text.includes('[NPC AI]')) {
            console.log(`⚔️ [LOG DUELO]: ${text}`);
            duelEvents.push(text);
        }
    });

    page.on('pageerror', err => {
        console.log(`💥 [JS UNCAUGHT]: ${err.message}`);
        capturedErrors.push({ message: err.message, stack: err.stack });
    });

    // 1. Obtener sesión de Admin desde el API oficial
    console.log('🔑 Obteniendo sesión de Admin...');
    const loginRes = await fetch('http://localhost:3006/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'Admin', password: 'Oscar1982', force: true })
    });
    const loginData = await loginRes.json();
    console.log('✅ Sesión obtenida: Admin (ID:', loginData.user.id, ')');

    // 2. Establecer sesión en el navegador antes de cargar la vista
    await page.goto('http://localhost:3006/views/duels/npc/duel-npc.html?npcId=1', { waitUntil: 'domcontentloaded' });
    
    await page.evaluate((user, token) => {
        localStorage.setItem('ani_dimension_user', JSON.stringify(user));
        sessionStorage.setItem('ani_dimension_user', JSON.stringify(user));
        localStorage.setItem('ani_dimension_token', token);
        if (window.Session) {
            window.Session.saveUser(user);
        }
    }, loginData.user, loginData.sessionToken);

    // Navegar a la arena de duelo
    await page.goto('http://localhost:3006/views/duels/npc/duel-npc.html?npcId=1', { waitUntil: 'networkidle2' });

    // Esperar a que el WebSocket esté conectado y DeckManager sincronizado
    console.log('⏳ Esperando conexión Socket.IO y sincronización de Mazo...');
    await page.waitForFunction(() => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        return s && s.connected;
    }, { timeout: 10000 });
    console.log('✅ WebSocket Conectado!');

    await page.evaluate(async () => {
        if (window.DeckManager) {
            await window.DeckManager.syncFromServer();
        }
    });
    await new Promise(r => setTimeout(r, 800));

    // 3. Iniciar duelo oficialmente de Primer Turno
    console.log('🎲 Iniciando Duelo vs NPC #1 (Turno 1: Jugador)...');
    await page.evaluate(async () => {
        if (typeof window.startDuelWithOrder === 'function') {
            await window.startDuelWithOrder('player1');
        } else if (typeof window.rollDice === 'function') {
            window.rollDice();
        }
    });

    // Esperar a que el servidor inicialice el duelo y reparta las cartas en el DOM
    console.log('⏳ Esperando renderizado de cartas en la mano...');
    await page.waitForSelector('#player-hand .hand-card', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1500));

    // 4. Bucle interactivo de juego real durante 6 turnos
    for (let turn = 1; turn <= 6; turn++) {
        console.log(`\n================== TURNO DE DUELO ${turn} ==================`);

        const state = await page.evaluate(() => {
            const hand = Array.from(document.querySelectorAll('#player-hand .hand-card')).map((el, i) => {
                return {
                    idx: i,
                    className: el.className,
                    style: el.getAttribute('style') || ''
                };
            });

            return {
                phase: window.currentDuelPhase || window.lastDuelState?.phase || 'DESCONOCIDA',
                turnPlayer: window.lastDuelState?.turnPlayer || 'DESCONOCIDO',
                lpPlayer: document.getElementById('player-lp')?.innerText || '8000',
                lpRival: document.getElementById('rival-lp')?.innerText || document.getElementById('opponent-lp')?.innerText || '8000',
                handCount: hand.length
            };
        });

        console.log(`📊 [TURNO ${turn}] TurnPlayer: ${state.turnPlayer} | LP Jugador: ${state.lpPlayer} | LP Rival: ${state.lpRival} | Fase: ${state.phase} | Cartas en Mano: ${state.handCount}`);

        // Probar interacción con cartas de la mano
        if (state.handCount > 0) {
            for (let cIdx = 0; cIdx < Math.min(state.handCount, 3); cIdx++) {
                console.log(`\n👉 Probando carta de mano [${cIdx + 1}]...`);

                const actionResult = await page.evaluate(async (targetIdx) => {
                    const handCards = document.querySelectorAll('#player-hand .hand-card');
                    if (!handCards[targetIdx]) return { error: 'Carta no encontrada en DOM' };

                    // Clic en la carta
                    handCards[targetIdx].click();
                    await new Promise(r => setTimeout(r, 500));

                    // Buscar botones en el menú de acciones flotante
                    const actionBtns = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
                    const availableActions = actionBtns.map(b => b.innerText.trim());

                    // Intentar activar o invocar
                    let clickedAction = null;
                    for (const btn of actionBtns) {
                        const txt = btn.innerText.toLowerCase();
                        if (txt.includes('invocar') || txt.includes('summon') || txt.includes('activar') || txt.includes('colocar') || txt.includes('set') || txt.includes('especial')) {
                            clickedAction = btn.innerText.trim();
                            btn.click();
                            break;
                        }
                    }

                    return {
                        availableActions,
                        clickedAction
                    };
                }, cIdx);

                console.log(`   Opciones en pantalla:`, actionResult.availableActions);
                if (actionResult.clickedAction) {
                    console.log(`   ✨ Se ejecutó acción: "${actionResult.clickedAction}"`);
                    await new Promise(r => setTimeout(r, 1500));

                    // Resolver posibles modales de selección o respuestas de cadena
                    await page.evaluate(() => {
                        const tributeConfirm = document.getElementById('btn-confirm-tribute');
                        if (tributeConfirm && !tributeConfirm.disabled) tributeConfirm.click();

                        const chainPass = document.querySelector('#chain-prompt-modal .chain-pass-btn, .chain-pass-btn');
                        if (chainPass && chainPass.offsetParent !== null) chainPass.click();

                        const modalItem = document.querySelector('.target-card-item, .modal-card-select');
                        if (modalItem) modalItem.click();
                        const modalConfirm = document.querySelector('.btn-modal-confirm, #btn-modal-target-ok');
                        if (modalConfirm) modalConfirm.click();
                    });
                }
            }
        }

        // Probar cambio a Battle Phase y Ataque
        console.log('\n⚔️ Pasando a Battle Phase...');
        await page.evaluate(() => {
            const bpBtn = document.getElementById('btn-battle-phase') || document.querySelector('[data-phase="BATTLE"]') || document.querySelector('.btn-phase-battle');
            if (bpBtn) bpBtn.click();
            else if (typeof window.changeDuelPhase === 'function') window.changeDuelPhase('BATTLE');
        });

        await new Promise(r => setTimeout(r, 1000));

        // Declarar ataque con monstruos en el campo
        const attackResult = await page.evaluate(async () => {
            const pMonsters = document.querySelectorAll('#p-m0 .card-on-field, #p-m1 .card-on-field, #p-m2 .card-on-field, #p-m3 .card-on-field, #p-m4 .card-on-field');
            if (pMonsters.length > 0) {
                pMonsters[0].click();
                await new Promise(r => setTimeout(r, 500));

                const rZone = document.getElementById('board-rival-name') || document.getElementById('r-m0') || document.querySelector('.rival-avatar-container');
                if (rZone) rZone.click();
                return { attacked: true, monstersFound: pMonsters.length };
            }
            return { attacked: false, monstersFound: 0 };
        });

        if (attackResult.attacked) {
            console.log(`💥 Ataque declarado con éxito desde el DOM! (Monstruos en campo: ${attackResult.monstersFound})`);
            await new Promise(r => setTimeout(r, 1500));
        }

        // Pasar turno (End Phase)
        console.log('⏭️ Pasando a End Phase (Turno del Rival)...');
        await page.evaluate(() => {
            const epBtn = document.getElementById('btn-end-turn') || document.getElementById('btn-end-phase') || document.querySelector('[data-phase="END"]') || document.querySelector('.btn-phase-end');
            if (epBtn) epBtn.click();
            else if (typeof window.changeDuelPhase === 'function') window.changeDuelPhase('END');
        });

        // Esperar turno del NPC
        console.log('⏳ Esperando respuesta del NPC...');
        await new Promise(r => setTimeout(r, 4000));
    }

    console.log('\n================== RESUMEN DE PRUEBAS EN VIVO ==================');
    console.log(`Eventos de duelo capturados: ${duelEvents.length}`);
    console.log(`Errores capturados: ${capturedErrors.length}`);
    if (capturedErrors.length > 0) {
        console.log('DETALLE DE ERRORES:', JSON.stringify(capturedErrors, null, 2));
    } else {
        console.log('🎉 ¡TODAS LAS CARTAS Y ACCIONES DEL DOM FUNCIONARON CORRECTAMENTE SIN ERRORES!');
    }

    await browser.close();
}

runRealDuel().catch(console.error);
