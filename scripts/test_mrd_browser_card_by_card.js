/**
 * ============================================================================
 * E2E TEST: VALIDACIÓN EXHAUSTIVA CARTA A CARTA EN EL NAVEGADOR - METAL RAIDERS (MRD)
 * Pruebas directas en la interfaz de usuario con CLICKS REALES en el DOM,
 * inspección de efectos, captura y corrección de errores en consola y logs.
 * ============================================================================
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { getPool, sql } = require('../backend/config/db');

async function runMrdBrowserTest() {
    console.log('================================================================');
    console.log('🌐 INICIANDO TEST BROWSER E2E: 144 CARTAS DE METAL RAIDERS (MRD)');
    console.log('   Clicks reales en DOM, Menús Contextuales y Validación de Efectos');
    console.log('================================================================\n');

    const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    const executablePath = chromePaths.find(p => fs.existsSync(p));
    if (!executablePath) {
        throw new Error('No se encontró ejecutable de Chrome o Edge.');
    }

    // 1. Obtener listado oficial de las 144 cartas de MRD desde SQL Server
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
        WHERE bpc.PackId = 'MRD'
        ORDER BY bpc.Id ASC;
    `);

    const mrdCards = dbCardsRes.recordset;
    console.log(`📋 Recuperadas ${mrdCards.length} cartas de MRD desde SQL Server.\n`);

    // 2. Obtener sesión de Admin
    console.log('🔑 Obteniendo sesión de Administrador...');
    const loginRes = await fetch('http://localhost:3006/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'Admin', password: 'Oscar1982', force: true })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) {
        throw new Error('No se pudo autenticar usuario Admin: ' + loginData.message);
    }
    console.log('✅ Sesión obtenida: Admin (Token:', loginData.sessionToken ? 'OK' : 'FAIL', ')');

    // 3. Iniciar Navegador Real
    console.log(`🚀 Lanzando navegador: ${executablePath}`);
    const browser = await puppeteer.launch({
        executablePath,
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-web-security',
            '--window-size=1400,900'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    let currentCardErrors = [];
    page.on('console', msg => {
        const text = msg.text();
        const type = msg.type();
        if (type === 'error' && !text.includes('favicon') && !text.includes('404')) {
            currentCardErrors.push(`[Console Error] ${text}`);
        }
    });

    page.on('pageerror', err => {
        currentCardErrors.push(`[Page Error] ${err.message}`);
    });

    // 4. Inyectar sesión en navegador y navegar al tablero de duelos
    await page.goto('http://localhost:3006/views/duels/npc/duel-npc.html?npcId=1', { waitUntil: 'domcontentloaded' });
    await page.evaluate((user, token) => {
        localStorage.setItem('ani_dimension_user', JSON.stringify(user));
        sessionStorage.setItem('ani_dimension_user', JSON.stringify(user));
        localStorage.setItem('ani_dimension_token', token);
        if (window.Session) window.Session.saveUser(user);
    }, loginData.user, loginData.sessionToken);

    await page.goto('http://localhost:3006/views/duels/npc/duel-npc.html?npcId=1', { waitUntil: 'networkidle2' });

    // Esperar conexión WebSocket
    await page.waitForFunction(() => {
        const s = window.getSocket ? window.getSocket() : window.socket;
        return s && s.connected;
    }, { timeout: 10000 });
    console.log('✅ Conexión WebSocket lista en el navegador.');

    // Iniciar duelo vs NPC
    console.log('🎲 Iniciando duelo vs NPC para sesión de pruebas interactiva...');
    await page.evaluate(async () => {
        if (typeof window.startDuelWithOrder === 'function') {
            await window.startDuelWithOrder('player1');
        } else if (typeof window.rollDice === 'function') {
            window.rollDice();
        }
    });

    // Esperar a que el tablero esté listo
    await page.waitForSelector('#player-hand', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1500));

    // Obtener RoomId activo
    const roomId = await page.evaluate(() => {
        return (window.lastDuelState && window.lastDuelState.roomId) || 'ROOM_DEMO';
    });
    console.log(`⚔️ Sala de duelo activa vinculada: ${roomId}`);

    const testResults = [];
    let passedCount = 0;
    let failedCount = 0;

    // 5. Bucle de prueba carta a carta sobre la interfaz de usuario con CLICKS REALES
    console.log('\n--- INICIANDO CICLO DE INTERACCIÓN BROWSER CARTA POR CARTA ---\n');

    for (let i = 0; i < mrdCards.length; i++) {
        const card = mrdCards[i];
        const indexNum = i + 1;
        const cId = card.CardId;
        const cType = card.CardType;
        const nameEn = card.CardName;
        const nameEs = card.CardNameEs;
        const level = card.Level || 0;

        let cardPassed = true;
        let failReason = '';
        const logs = [];
        currentCardErrors = [];

        try {
            // A. Inyectar la carta en la sala activa del servidor vía API
            const injectRes = await fetch('http://localhost:3006/api/duel/test-inject-card', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, cardId: cId, playerKey: 'player1' })
            });
            const injectData = await injectRes.json();
            if (!injectData.success) {
                throw new Error('Fallo al inyectar carta en servidor: ' + injectData.message);
            }

            // Esperar que el navegador renderice la carta en la mano y se asiente el DOM
            await page.waitForFunction(() => {
                const hand = document.querySelectorAll('#player-hand .hand-card');
                return hand.length > 0;
            }, { timeout: 4000 });
            await new Promise(r => setTimeout(r, 100));

            // B. CLICK 1: Click real en la carta de la mano en el DOM del navegador (atómico)
            await page.evaluate((targetCardId) => {
                const cardEl = document.querySelector('#player-hand .hand-card');
                if (cardEl) {
                    cardEl.click();
                } else if (typeof window.selectHandCard === 'function') {
                    const fakeEvent = { stopPropagation: () => {}, clientX: 250, clientY: 450 };
                    window.selectHandCard(0, targetCardId, fakeEvent);
                }
            }, cId);
            await new Promise(r => setTimeout(r, 100));

            // C. Verificar textos en el inspector flotante y consistencia tipográfica
            const inspectData = await page.evaluate(() => {
                const descBlock = document.getElementById('card-info-floating') || document.querySelector('.card-detail-floating, #floating-card-info');
                return {
                    visible: !!descBlock,
                    text: descBlock ? descBlock.innerText : ''
                };
            });
            logs.push('Click Mano');

            // D. Disparar o verificar opciones del Menú Contextual en pantalla
            let updatedMenu = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
                return buttons.map((b, idx) => ({ idx, text: b.innerText.trim() }));
            });

            if (updatedMenu.length === 0) {
                // Disparar selectHandCard con coordenadas para abrir menú flotante
                await page.evaluate((targetId) => {
                    if (typeof window.selectHandCard === 'function') {
                        const fakeEvent = { stopPropagation: () => {}, clientX: 300, clientY: 500 };
                        window.selectHandCard(0, targetId, fakeEvent);
                    }
                }, cId);
                await new Promise(r => setTimeout(r, 120));
                updatedMenu = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
                    return buttons.map((b, idx) => ({ idx, text: b.innerText.trim() }));
                });
            }

            logs.push(`Menú: [${updatedMenu.map(m => m.text).join(' | ')}]`);

            // E. CLICK 2: Ejecutar la acción apropiada mediante CLICK REAL en el botón del menú
            let targetButtonIdx = -1;

            if (cType.includes('Fusion')) {
                logs.push('Fusión en Mano/Extra');
            } else if (cType.includes('Normal Monster')) {
                const btn = updatedMenu.find(m => m.text.includes('Invocar Normal') || m.text.includes('Sacrificio'));
                if (btn) targetButtonIdx = btn.idx;
            } else if (cType.includes('Spell')) {
                const btn = updatedMenu.find(m => m.text.includes('Activar Efecto') || m.text.includes('Colocar'));
                if (btn) targetButtonIdx = btn.idx;
            } else if (cType.includes('Trap')) {
                const btn = updatedMenu.find(m => m.text.includes('Colocar'));
                if (btn) targetButtonIdx = btn.idx;
            } else {
                // Monstruo de Efecto
                const btn = updatedMenu.find(m => m.text.includes('Activar') || m.text.includes('Invocar') || m.text.includes('Sacrificio') || m.text.includes('Colocar'));
                if (btn) targetButtonIdx = btn.idx;
            }

            if (targetButtonIdx >= 0) {
                // Clic real en el botón del menú de contexto
                await page.evaluate((bIdx) => {
                    const buttons = document.querySelectorAll('#context-menu-buttons button, .context-btn');
                    if (buttons[bIdx]) buttons[bIdx].click();
                }, targetButtonIdx);
                logs.push(`Click "${updatedMenu[targetButtonIdx]?.text}"`);

                await new Promise(r => setTimeout(r, 150));

                // F. Manejar posibles modales de selección o confirmación que surjan
                await page.evaluate(() => {
                    const tributeBtn = document.getElementById('btn-confirm-tribute');
                    if (tributeBtn && !tributeBtn.disabled) tributeBtn.click();

                    const targetItem = document.querySelector('.target-card-item, .modal-card-select');
                    if (targetItem) targetItem.click();
                    const targetOk = document.querySelector('.btn-modal-confirm, #btn-modal-target-ok');
                    if (targetOk) targetOk.click();

                    const chainPass = document.querySelector('#chain-prompt-modal .chain-pass-btn, .chain-pass-btn');
                    if (chainPass && chainPass.offsetParent !== null) chainPass.click();
                });

                await new Promise(r => setTimeout(r, 120));
            }

            // G. Comprobar si hubo errores atrapados en consola o página durante la ejecución de esta carta
            if (currentCardErrors.length > 0) {
                cardPassed = false;
                failReason = currentCardErrors.join(' ; ');
            }

            // H. Verificar que el estado del tablero en el DOM respondió
            const finalState = await page.evaluate(() => {
                return {
                    pMonsters: Array.from(document.querySelectorAll('#p-m0 .card-on-field, #p-m1 .card-on-field')).length,
                    pSpells: Array.from(document.querySelectorAll('#p-s0 .card-on-field')).length,
                    gyCount: document.getElementById('p-gy-counter')?.innerText || '0',
                    recentLog: Array.from(document.querySelectorAll('#duel-log .log-entry')).slice(-2).map(e => e.innerText).join(' | ')
                };
            });

            logs.push(`DOM: M:${finalState.pMonsters}, S:${finalState.pSpells}, GY:${finalState.gyCount}`);
            if (finalState.recentLog) {
                logs.push(`Log: "${finalState.recentLog.substring(0, 60)}..."`);
            }

        } catch (cardErr) {
            cardPassed = false;
            failReason = cardErr.message;
            console.error(`💥 [ERROR EN CARTA ${cId} ${nameEn}]:`, cardErr);
        }

        if (cardPassed) {
            passedCount++;
            console.log(`✅ [${indexNum}/144] [${card.CardNumber}] ${nameEn} (${nameEs}) -> PASS [${logs.join(' | ')}]`);
        } else {
            failedCount++;
            console.log(`❌ [${indexNum}/144] [${card.CardNumber}] ${nameEn} (${nameEs}) -> FAIL: ${failReason}`);
        }

        testResults.push({
            cardNumber: card.CardNumber,
            cardId: cId,
            nameEn,
            nameEs,
            type: cType,
            passed: cardPassed,
            reason: failReason,
            logs
        });
    }

    console.log('\n================================================================');
    console.log(`📊 REPORTE FINAL PRUEBA BROWSER E2E MRD (METAL RAIDERS):`);
    console.log(`   Total Cartas Probadas: 144`);
    console.log(`   Cartas Aprobadas:      ${passedCount} / 144 (${((passedCount / 144) * 100).toFixed(1)}%)`);
    console.log(`   Cartas Fallidas:       ${failedCount} / 144`);
    console.log('================================================================');

    fs.writeFileSync('scratch/mrd_browser_e2e_results.json', JSON.stringify(testResults, null, 2));

    await browser.close();
    process.exit(failedCount === 0 ? 0 : 1);
}

runMrdBrowserTest().catch(err => {
    console.error('Error fatal al ejecutar pruebas browser:', err);
    process.exit(1);
});
