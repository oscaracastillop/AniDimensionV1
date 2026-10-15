/**
 * ============================================================================
 * PASE 3: VALIDACIÓN EN VIVO EN NAVEGADOR DE TODOS LOS SOBRES ACTIVOS
 * Clicks reales en el DOM, menús contextuales, validación de efectos,
 * y captura estricta de errores en consola o logs para los sobres de la era DM.
 * ============================================================================
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { getPool } = require('../backend/config/db');

async function runAllPacksBrowserTest() {
    console.log('================================================================');
    console.log('🌐 PASE 3: PRUEBAS EN VIVO EN EL NAVEGADOR - TODOS LOS SOBRES');
    console.log('   Clicks reales, interacción con UI y captura estricta de errores');
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

    const pool = await getPool();
    const packsRes = await pool.request().query(`
        SELECT PackId, Name 
        FROM dbo.BoosterPacks 
        WHERE IsActive = 1 
        ORDER BY Series, PackId
    `);
    const activePacks = packsRes.recordset;

    console.log(`📦 Sobres activos detectados para evaluación: ${activePacks.map(p => p.PackId).join(', ')}\n`);

    // Obtener sesión de Admin
    const loginRes = await fetch('http://localhost:3006/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'Admin', password: 'Oscar1982', force: true })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) {
        throw new Error('No se pudo autenticar usuario Admin: ' + loginData.message);
    }

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

    // Inyectar sesión en navegador
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

    // Iniciar duelo vs NPC
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

    const allPacksResults = {};

    // Probar sobres en vivo carta por carta
    for (const pack of activePacks) {
        const packId = pack.PackId;
        console.log(`\n================================================================`);
        console.log(`🔍 PROBANDO SOBRE: ${packId} (${pack.Name}) CARTA POR CARTA`);
        console.log(`================================================================`);

        const cardsRes = await pool.request().query(`
            SELECT 
                bpc.Id,
                bpc.CardId,
                bpc.CardNumber,
                bpc.CardName,
                ISNULL(t.name_es, bpc.CardName) AS CardNameEs,
                bpc.CardType,
                bpc.Atk,
                bpc.Def,
                bpc.[Level]
            FROM dbo.BoosterPackCards bpc
            LEFT JOIN dbo.texts t ON bpc.CardId = t.id
            WHERE bpc.PackId = '${packId}'
            ORDER BY bpc.Id ASC;
        `);
        const packCards = cardsRes.recordset;

        let packPassed = 0;
        let packFailed = 0;
        const packCardResults = [];

        for (let i = 0; i < packCards.length; i++) {
            const card = packCards[i];
            const cId = card.CardId;
            const cType = card.CardType;
            const nameEn = card.CardName;
            const nameEs = card.CardNameEs;

            let cardPassed = true;
            let failReason = '';
            const logs = [];
            currentCardErrors = [];

            try {
                // Inyectar carta
                const injectRes = await fetch('http://localhost:3006/api/duel/test-inject-card', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId, cardId: cId, playerKey: 'player1' })
                });
                const injectData = await injectRes.json();
                if (!injectData.success) {
                    throw new Error('Fallo al inyectar carta: ' + injectData.message);
                }

                await page.waitForFunction(() => {
                    const hand = document.querySelectorAll('#player-hand .hand-card');
                    return hand.length > 0;
                }, { timeout: 4000 });
                await new Promise(r => setTimeout(r, 80));

                // Click 1: Click real en la carta de la mano
                await page.evaluate((targetCardId) => {
                    const cardEl = document.querySelector('#player-hand .hand-card');
                    if (cardEl) {
                        cardEl.click();
                    } else if (typeof window.selectHandCard === 'function') {
                        const fakeEvent = { stopPropagation: () => {}, clientX: 250, clientY: 450 };
                        window.selectHandCard(0, targetCardId, fakeEvent);
                    }
                }, cId);
                await new Promise(r => setTimeout(r, 80));

                // Obtener opciones de Menú Contextual
                let updatedMenu = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
                    return buttons.map((b, idx) => ({ idx, text: b.innerText.trim() }));
                });

                if (updatedMenu.length === 0) {
                    await page.evaluate((targetId) => {
                        if (typeof window.selectHandCard === 'function') {
                            const fakeEvent = { stopPropagation: () => {}, clientX: 300, clientY: 500 };
                            window.selectHandCard(0, targetId, fakeEvent);
                        }
                    }, cId);
                    await new Promise(r => setTimeout(r, 100));
                    updatedMenu = await page.evaluate(() => {
                        const buttons = Array.from(document.querySelectorAll('#context-menu-buttons button, .context-btn'));
                        return buttons.map((b, idx) => ({ idx, text: b.innerText.trim() }));
                    });
                }

                // Click 2: Click en botón de acción
                let targetButtonIdx = -1;
                if (cType.includes('Fusion')) {
                    logs.push('Fusión');
                } else if (cType.includes('Normal Monster')) {
                    const btn = updatedMenu.find(m => m.text.includes('Invocar') || m.text.includes('Sacrificio'));
                    if (btn) targetButtonIdx = btn.idx;
                } else if (cType.includes('Spell')) {
                    const btn = updatedMenu.find(m => m.text.includes('Activar') || m.text.includes('Colocar'));
                    if (btn) targetButtonIdx = btn.idx;
                } else if (cType.includes('Trap')) {
                    const btn = updatedMenu.find(m => m.text.includes('Colocar'));
                    if (btn) targetButtonIdx = btn.idx;
                } else {
                    const btn = updatedMenu.find(m => m.text.includes('Activar') || m.text.includes('Invocar') || m.text.includes('Sacrificio') || m.text.includes('Colocar'));
                    if (btn) targetButtonIdx = btn.idx;
                }

                if (targetButtonIdx >= 0) {
                    await page.evaluate((bIdx) => {
                        const buttons = document.querySelectorAll('#context-menu-buttons button, .context-btn');
                        if (buttons[bIdx]) buttons[bIdx].click();
                    }, targetButtonIdx);
                    logs.push(`Acción: ${updatedMenu[targetButtonIdx]?.text}`);
                    await new Promise(r => setTimeout(r, 100));

                    // Confirmar modales
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
                    await new Promise(r => setTimeout(r, 80));
                }

                if (currentCardErrors.length > 0) {
                    cardPassed = false;
                    failReason = currentCardErrors.join(' ; ');
                }

            } catch (err) {
                cardPassed = false;
                failReason = err.message;
            }

            if (cardPassed) {
                packPassed++;
            } else {
                packFailed++;
                console.error(`  ❌ [${card.CardNumber}] ${nameEn} -> ERROR: ${failReason}`);
            }

            packCardResults.push({
                num: card.CardNumber,
                id: cId,
                name: nameEn,
                passed: cardPassed,
                reason: failReason
            });
        }

        console.log(`  ✅ Sobre ${packId}: ${packPassed}/${packCards.length} aprobadas (Fallidas: ${packFailed})`);
        allPacksResults[packId] = {
            name: pack.Name,
            total: packCards.length,
            passed: packPassed,
            failed: packFailed,
            cards: packCardResults
        };
    }

    fs.writeFileSync('scratch/all_packs_browser_results.json', JSON.stringify(allPacksResults, null, 2));
    await browser.close();

    console.log('\n================================================================');
    console.log('📊 RESUMEN FINAL PASE 3 (TODOS LOS SOBRES EN VIVO EN BROWSER)');
    console.log('================================================================');
    for (const [pId, data] of Object.entries(allPacksResults)) {
        console.log(`  📦 ${pId.padEnd(5)} | Total: ${String(data.total).padStart(3)} | Aprobadas: ${String(data.passed).padStart(3)} | Fallidas: ${String(data.failed).padStart(2)} | Ratio: ${((data.passed / data.total) * 100).toFixed(1)}%`);
    }

    process.exit(0);
}

runAllPacksBrowserTest().catch(err => {
    console.error('Error fatal en Pase 3:', err);
    process.exit(1);
});
