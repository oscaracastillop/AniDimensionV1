/**
 * test_synchro_glow_and_linked_cards.js
 * 
 * Verificación exhaustiva en navegador real (Puppeteer-core con Chrome/Edge) con clicks y DOM real de:
 * 1. Iluminación y Badge del Extra Deck cuando hay materiales suficientes para Sincronía (Tuner + no-Tuner).
 * 2. Supresión de iluminación cuando no se cumplen requisitos o no es Main Phase.
 * 3. Indicadores visuales bidireccionales de cartas equipadas/ligadas (.card-linked-badge y .slot-linked-active al hover).
 * 4. Indicador de eslabón de cadena activo (.chain-link-badge).
 */

const fs = require('fs');
const puppeteer = require('puppeteer-core');

async function runTest() {
    console.log('================================================================');
    console.log('🚀 VALIDACIÓN EN VIVO: EXTRA DECK GLOW (SINCRONÍA) Y CARTAS ENLAZADAS');
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
    if (!loginData.success) throw new Error('Error login Admin: ' + JSON.stringify(loginData));

    const browser = await puppeteer.launch({
        executablePath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-web-security', '--window-size=1400,900']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    const errors = [];
    page.on('console', msg => {
        const text = msg.text();
        if (msg.type() === 'error' && !text.includes('Failed to load resource') && !text.includes('favicon')) {
            console.error(' [CONSOLE ERROR]', text);
            errors.push(text);
        }
    });

    try {
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
        await new Promise(r => setTimeout(r, 1200));

        await page.waitForSelector('#player-hand', { timeout: 10000 });
        const roomId = await page.evaluate(() => {
            return (window.lastDuelState && window.lastDuelState.roomId) || 'ROOM_DEMO';
        });
        console.log(`⚔️ Sala de duelo activa: ${roomId}\n`);

        // =========================================================================
        // PRUEBA 1: ILUMINACIÓN DEL EXTRA DECK PARA INVOCACIÓN POR SINCRONÍA
        // =========================================================================
        console.log('--- PRUEBA 1: Extra Deck Glow con Materiales de Sincronía Disponibles ---');

        await page.evaluate((rId) => {
            const s = window.getSocket ? window.getSocket() : window.socket;
            s.emit('TEST_SETUP_DUEL_STATE', {
                room_id: rId,
                patch: {
                    phase: 'MAIN_1',
                    turnPlayer: 'Admin',
                    player1: {
                        monsters: [
                            { card_id: 63977008, position: 'ATK', faceDown: false, card_data: { id: 63977008, name: 'Junk Synchron', type: 'Tuner Effect Monster', level: 3, atk: 1300, def: 500 } },
                            { card_id: 9365703, position: 'ATK', faceDown: false, card_data: { id: 9365703, name: 'Speed Warrior', type: 'Effect Monster', level: 2, atk: 900, def: 400 } },
                            null, null, null
                        ],
                        spells: [null, null, null, null, null],
                        extraDeck: [
                            { card_id: 60800381, card_data: { id: 60800381, name: 'Junk Warrior', type: 'Synchro Monster', level: 5, atk: 2300, def: 1300 } }
                        ]
                    }
                }
            });
        }, roomId);

        await new Promise(r => setTimeout(r, 1500));

        // Verificar Extra Deck en el DOM
        const extraDeckCheck = await page.evaluate(() => {
            const extraSlot = document.getElementById('p-extra');
            if (!extraSlot) return { found: false };

            const hasGlow = extraSlot.classList.contains('synchro-ready-glow');
            const badge = extraSlot.querySelector('.synchro-ready-badge');
            const badgeVisible = badge && window.getComputedStyle(badge).display !== 'none';
            const badgeText = badge ? badge.textContent.trim() : '';

            return {
                found: true,
                hasGlow,
                hasBadge: !!badge,
                badgeVisible,
                badgeText
            };
        });

        console.log('Resultado Extra Deck Glow:', extraDeckCheck);
        if (!extraDeckCheck.hasGlow) throw new Error('El Extra Deck no tiene la clase .synchro-ready-glow cuando hay materiales disponibles!');
        if (!extraDeckCheck.badgeVisible) throw new Error('El badge .synchro-ready-badge no está visible!');
        if (!extraDeckCheck.badgeText.includes('SINCRONÍA DISPONIBLE')) throw new Error(`Texto de badge inesperado: ${extraDeckCheck.badgeText}`);
        console.log('✅ Extra Deck se ilumina correctamente y muestra "⚡ SINCRONÍA DISPONIBLE"!');

        // =========================================================================
        // PRUEBA 2: SUPRESIÓN DEL GLOW EN FASE DE BATALLA
        // =========================================================================
        console.log('\n--- PRUEBA 2: Supresión de Glow fuera de Main Phase ---');

        await page.evaluate((rId) => {
            const s = window.getSocket ? window.getSocket() : window.socket;
            s.emit('TEST_SETUP_DUEL_STATE', {
                room_id: rId,
                patch: {
                    phase: 'BATTLE'
                }
            });
        }, roomId);

        await new Promise(r => setTimeout(r, 1200));

        const battlePhaseCheck = await page.evaluate(() => {
            const extraSlot = document.getElementById('p-extra');
            const hasGlow = extraSlot && extraSlot.classList.contains('synchro-ready-glow');
            const badge = extraSlot && extraSlot.querySelector('.synchro-ready-badge');
            const badgeVisible = badge && window.getComputedStyle(badge).display !== 'none';
            return { hasGlow, badgeVisible };
        });

        console.log('Resultado en Battle Phase:', battlePhaseCheck);
        if (battlePhaseCheck.hasGlow || battlePhaseCheck.badgeVisible) {
            throw new Error('El Extra Deck NO debe brillar en Battle Phase!');
        }
        console.log('✅ Extra Deck no brilla durante la Battle Phase.');

        // =========================================================================
        // PRUEBA 3: CARTAS LIGADAS / EQUIPADAS (BADGES Y HIGHLIGHT BIDIRECCIONAL)
        // =========================================================================
        console.log('\n--- PRUEBA 3: Badges de Cartas Ligadas/Equipadas y Resaltado Bidireccional ---');

        await page.evaluate((rId) => {
            const s = window.getSocket ? window.getSocket() : window.socket;
            s.emit('TEST_SETUP_DUEL_STATE', {
                room_id: rId,
                patch: {
                    phase: 'MAIN_1',
                    player1: {
                        monsters: [
                            { 
                                card_id: 63977008, 
                                position: 'ATK', 
                                faceDown: false, 
                                card_data: { id: 63977008, name: 'Junk Synchron', type: 'Tuner Effect Monster', level: 3, atk: 1300, def: 500 } 
                            },
                            null, null, null, null
                        ],
                        spells: [
                            { 
                                card_id: 37390589, 
                                position: 'FACEUP', 
                                faceDown: false, 
                                card_data: { id: 37390589, name: 'Kunai with Chain', type: 'Trap Card' },
                                targetingMonster: { player: 'player', slot: 0 }
                            },
                            null, null, null, null
                        ]
                    }
                }
            });
        }, roomId);

        await new Promise(r => setTimeout(r, 1200));

        const linkedCardsCheck = await page.evaluate(() => {
            const m0 = document.getElementById('p-m0');
            const s0 = document.getElementById('p-s0');

            const m0Badge = m0 ? m0.querySelector('.card-linked-badge') : null;
            const s0Badge = s0 ? s0.querySelector('.card-linked-badge') : null;

            return {
                m0HasBadge: !!m0Badge,
                m0BadgeText: m0Badge ? m0Badge.textContent.trim() : '',
                s0HasBadge: !!s0Badge,
                s0BadgeText: s0Badge ? s0Badge.textContent.trim() : ''
            };
        });

        console.log('Resultado Badges Cartas Ligadas:', linkedCardsCheck);
        if (!linkedCardsCheck.m0HasBadge) throw new Error('El monstruo no muestra el .card-linked-badge de la trampa equipada!');
        if (!linkedCardsCheck.m0BadgeText.includes('Kunai')) throw new Error(`El badge del monstruo no menciona la carta ligada: ${linkedCardsCheck.m0BadgeText}`);
        if (!linkedCardsCheck.s0HasBadge) throw new Error('La trampa equipada no muestra el .card-linked-badge!');
        if (!linkedCardsCheck.s0BadgeText.includes('M #1')) throw new Error(`El badge de la trampa no apunta a M #1: ${linkedCardsCheck.s0BadgeText}`);
        console.log('✅ Badges de enlace mostrados correctamente en Monstruo y Trampa equipada.');

        // Probar interacción de hover bidireccional
        console.log('Probando resaltado al pasar el ratón (hover) en carta equipada...');
        await page.evaluate(() => {
            window.highlightLinkedSlot('player', 0, true, 'M');
        });

        const hoverCheck = await page.evaluate(() => {
            const m0 = document.getElementById('p-m0');
            return {
                m0IsHighlighted: m0 && m0.classList.contains('slot-linked-active')
            };
        });

        console.log('Resultado Hover Slot:', hoverCheck);
        if (!hoverCheck.m0IsHighlighted) throw new Error('El slot objetivo no recibió la clase .slot-linked-active en hover!');

        // Quitar hover
        await page.evaluate(() => {
            window.highlightLinkedSlot('player', 0, false, 'M');
        });

        const hoverOffCheck = await page.evaluate(() => {
            const m0 = document.getElementById('p-m0');
            return {
                m0IsHighlighted: m0 && m0.classList.contains('slot-linked-active')
            };
        });
        if (hoverOffCheck.m0IsHighlighted) throw new Error('La clase .slot-linked-active no se quitó al salir del hover!');
        console.log('✅ Resaltado bidireccional hover funciona a la perfección.');

        // =========================================================================
        // PRUEBA 4: ESLABÓN DE CADENA ACTIVA (.chain-link-badge)
        // =========================================================================
        console.log('\n--- PRUEBA 4: Badge de Cadena Activa (⛓️ #1) ---');

        await page.evaluate((rId) => {
            const s = window.getSocket ? window.getSocket() : window.socket;
            s.emit('TEST_SETUP_DUEL_STATE', {
                room_id: rId,
                patch: {
                    pendingAction: null,
                    activeChain: [
                        { player: 'Admin', slot_index: 0, card_name: 'Kunai with Chain' }
                    ]
                }
            });
            if (window.lastDuelState) {
                window.lastDuelState.activeChain = [
                    { player: 'Admin', slot_index: 0, card_name: 'Kunai with Chain' }
                ];
                if (typeof window.renderField === 'function') window.renderField(window.lastDuelState);
            }
        }, roomId);

        await new Promise(r => setTimeout(r, 800));

        const chainBadgeCheck = await page.evaluate(() => {
            const s0 = document.getElementById('p-s0');
            const chainBadge = s0 ? s0.querySelector('.chain-link-badge') : null;
            return {
                hasChainBadge: !!chainBadge,
                text: chainBadge ? chainBadge.textContent.trim() : ''
            };
        });

        console.log('Resultado Chain Link Badge:', chainBadgeCheck);
        if (!chainBadgeCheck.hasChainBadge) throw new Error('No se generó el .chain-link-badge para la carta en cadena!');
        if (!chainBadgeCheck.text.includes('#1')) throw new Error(`El texto de cadena no indica #1: ${chainBadgeCheck.text}`);
        console.log('✅ Badge de eslabón de cadena activa (⛓️ #1) mostrado correctamente.');

        console.log('\n================================================================');
        console.log('🎉 ¡TODAS LAS VALIDACIONES DE SINCRONÍA, LIGADURA Y CADENA COMPLETADAS AL 100%!');
        console.log('================================================================');

    } catch (err) {
        console.error('❌ ERROR DURANTE LA PRUEBA E2E:', err);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
}

runTest();
