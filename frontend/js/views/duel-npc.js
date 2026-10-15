/**
 * Ani-Dimension: Orquestador de Duelos vs NPC
 * Incluye lógica de tirada de dados 3D y selección de primer turno
 */
var currentNpcOpponent = 'NPC Principiante (Nv. 1)';
var currentNpcId = 1;
var currentNpcObj = null;
var diceRollInterval = null;
var lastDiceWinner = null;

function openDiceRollModal(opponentName = 'NPC Yugi Muto') {
    currentNpcOpponent = opponentName;
    if (typeof closeDuelMenu === 'function') closeDuelMenu();

    const duelApp = document.getElementById('duel-app');
    if (duelApp) duelApp.style.display = 'none';

    const modal = document.getElementById('dice-roll-modal');
    const pCube = document.getElementById('die-player-cube');
    const nCube = document.getElementById('die-npc-cube');
    const msg = document.getElementById('dice-status-message');
    const actions = document.getElementById('dice-actions-container');
    const choices = document.getElementById('dice-choice-container');
    const btnRoll = document.getElementById('btn-roll-dice');
    const nLabel = document.getElementById('dice-npc-label');

    if (nLabel) nLabel.textContent = opponentName.toUpperCase();
    if (btnRoll) btnRoll.disabled = false;
    if (pCube) { pCube.textContent = '?'; pCube.classList.remove('die-rolling'); }
    if (nCube) { nCube.textContent = '?'; nCube.classList.remove('die-rolling'); }
    if (msg) msg.textContent = '';
    if (actions) actions.style.display = 'block';
    if (choices) choices.style.display = 'none';

    if (modal) modal.style.display = 'flex';
}

function closeDiceRollModal(cancelToMenu = false) {
    if (typeof diceRollInterval !== 'undefined' && diceRollInterval) clearInterval(diceRollInterval);
    const modal = document.getElementById('dice-roll-modal');
    if (modal) modal.style.display = 'none';

    // Si el usuario cancela o cierra la ventana de dados antes del duelo, regresar al menú de NPCs
    if (cancelToMenu) {
        returnToDuelMenu();
    }
}

function rollDice() {
    const pCube = document.getElementById('die-player-cube');
    const nCube = document.getElementById('die-npc-cube');
    const msg = document.getElementById('dice-status-message');
    const btnRoll = document.getElementById('btn-roll-dice');
    const actions = document.getElementById('dice-actions-container');
    const choices = document.getElementById('dice-choice-container');

    if (btnRoll) btnRoll.disabled = true;
    if (pCube) pCube.classList.add('die-rolling');
    if (nCube) nCube.classList.add('die-rolling');
    if (msg) msg.innerHTML = '<b style="color:#00f0ff;">Lanzando dados...</b>';

    let counter = 0;

    diceRollInterval = setInterval(() => {
        counter++;
        const rnd1 = Math.floor(Math.random() * 6) + 1;
        const rnd2 = Math.floor(Math.random() * 6) + 1;
        if (pCube) pCube.textContent = rnd1;
        if (nCube) nCube.textContent = rnd2;

        if (counter > 15) {
            clearInterval(diceRollInterval);
            if (pCube) pCube.classList.remove('die-rolling');
            if (nCube) nCube.classList.remove('die-rolling');

            let pFinal = Math.floor(Math.random() * 6) + 1;
            let nFinal = Math.floor(Math.random() * 6) + 1;

            // En caso de empate, desempatar automáticamente
            while (pFinal === nFinal) {
                nFinal = Math.floor(Math.random() * 6) + 1;
            }

            if (pCube) pCube.textContent = pFinal;
            if (nCube) nCube.textContent = nFinal;

            if (pFinal > nFinal) {
                lastDiceWinner = 'player1';
                if (msg) msg.innerHTML = `<b style="color:#00f0ff;">¡Ganaste la tirada! (${pFinal} vs ${nFinal})</b>`;
                if (actions) actions.style.display = 'none';
                if (choices) choices.style.display = 'flex';
            } else {
                lastDiceWinner = 'player2';
                if (msg) msg.innerHTML = `<b style="color:#ff4757;">${currentNpcOpponent} ganó (${nFinal} vs ${pFinal})</b><br><span style="font-size:11px; color:#cbd5e1;">Inicia de Primeras. Entrando al duelo...</span>`;
                if (actions) actions.style.display = 'none';

                setTimeout(() => {
                    startDuelWithOrder('player2');
                }, 2000);
            }
        }
    }, 80);
}

function confirmOrderChoice(chosenFirstPlayer) {
    startDuelWithOrder(chosenFirstPlayer);
}

async function startDuelWithOrder(firstPlayer) {
    closeDiceRollModal();

    // Sincronizar deck oficial directamente desde SQL Server
    let userDeck = null;
    if (window.DeckManager) {
        try {
            const syncRes = await window.DeckManager.syncFromServer();
            userDeck = syncRes ? syncRes.deck : window.DeckManager.getDeck();
        } catch (e) {
            userDeck = window.DeckManager.getDeck();
        }
    }

    const mainCount = userDeck && Array.isArray(userDeck.mainDeck) ? userDeck.mainDeck.length : 0;
    if (mainCount < 40) {
        if (typeof closeDuelMenu === 'function') closeDuelMenu();
        const alertMsg = `⚠️ Tu Main Deck actual tiene ${mainCount} cartas.\n\nPara iniciar un duelo reglamentario Konami OCG, tu baraja debe tener entre 40 y 60 cartas.\n\nPor favor, dirígete al Constructor de Mazos para armar y guardar tu Mazo.`;
        if (window.showAniModal) {
            window.showAniModal({
                title: 'Mazo Incompleto',
                message: alertMsg,
                type: 'warning',
                confirmText: 'Ir al Constructor de Mazos',
                cancelText: 'Cancelar',
                onConfirm: () => {
                    window.location.href = '/views/duels/deck-builder.html';
                },
                onCancel: () => {
                    returnToDuelMenu();
                }
            });
        } else {
            alert(alertMsg);
            window.location.href = '/views/duels/deck-builder.html';
        }
        return;
    }

    if (typeof closeDuelMenu === 'function') closeDuelMenu();
    if (typeof closeWelcomeLobby === 'function') closeWelcomeLobby();

    cleanDuelFieldUI();

    const duelApp = document.getElementById('duel-app');
    if (duelApp) duelApp.style.display = 'flex';

    const activeSocket = window.getSocket ? window.getSocket() : (window.socket || (typeof socket !== 'undefined' ? socket : null));
    const myNick = window.Session && window.Session.getUser() ? window.Session.getUser().username : 'Admin';

    if (activeSocket) {
        activeSocket.emit('DUEL_START', {
            room_id: 'ROOM_DEMO',
            opponent_name: currentNpcOpponent || 'NPC Principiante (Nv. 1)',
            player_name: myNick,
            first_player: firstPlayer,
            player_deck: userDeck,
            opponent_deck: currentNpcObj ? currentNpcObj.deck : null,
            npc_id: currentNpcId
        });
    }

    if (window.SoundManager) {
        window.SoundManager.playSFX('duel_start');
        const bgmKey = window.SoundManager.getBgmForNpc(currentNpcId, currentNpcOpponent);
        window.SoundManager.playBGM(bgmKey, true);
    }

    try {
        history.pushState({ inDuel: true }, document.title, window.location.href);
    } catch (e) {}
}

function cleanDuelFieldUI() {
    const pHand = document.getElementById('player-hand');
    if (pHand) pHand.innerHTML = '';
    const rHand = document.getElementById('rival-hand');
    if (rHand) rHand.innerHTML = '';

    for (let i = 0; i < 5; i++) {
        const pm = document.getElementById(`p-m${i}`);
        if (pm) pm.innerHTML = '';
        const ps = document.getElementById(`p-s${i}`);
        if (ps) ps.innerHTML = '';
        const rm = document.getElementById(`r-m${i}`);
        if (rm) rm.innerHTML = '';
        const rs = document.getElementById(`r-s${i}`);
        if (rs) rs.innerHTML = '';
    }
}

function showGameOverModal(data) {
    const modal = document.getElementById('game-over-modal');
    if (!modal) return;

    const sessionUser = (window.Session && typeof window.Session.getUser === 'function') ? window.Session.getUser() : null;
    const myUsername = (sessionUser && sessionUser.username)
        || (window.currentUser && window.currentUser.username)
        || (window.lastDuelState && window.lastDuelState.player1 && window.lastDuelState.player1.username)
        || 'Admin';

    const rivalName = (typeof currentNpcOpponent !== 'undefined' ? currentNpcOpponent : '') 
        || (window.lastDuelState && window.lastDuelState.player2 && window.lastDuelState.player2.username)
        || 'NPC';

    // Determinar con certeza matemática y heurística si el jugador local es el ganador
    let isWinner = false;
    if (data.winner === 'EMPATE') {
        isWinner = false;
    } else if (data.rewards && (data.rewards.isWinner || data.rewards.expBreakdown || data.rewards.starshipsBreakdown || data.rewards.cardDrop || (data.rewards.expAwarded && data.rewards.expAwarded > 0))) {
        isWinner = true;
    } else if (data.winner && myUsername && data.winner.trim().toLowerCase() === myUsername.trim().toLowerCase()) {
        isWinner = true;
    } else if (data.loser && myUsername && data.loser.trim().toLowerCase() !== myUsername.trim().toLowerCase() && (data.loser.trim().toLowerCase() === rivalName.trim().toLowerCase() || data.loser.toLowerCase().includes('npc') || data.loser.toLowerCase().includes('nv.'))) {
        isWinner = true;
    } else if (window.lastDuelState && window.lastDuelState.player2 && Number(window.lastDuelState.player2.lp) <= 0 && window.lastDuelState.player1 && Number(window.lastDuelState.player1.lp) > 0) {
        isWinner = true;
    }

    const rewards = data.rewards;

    if (window.SoundManager) {
        window.SoundManager.playBGM(isWinner ? 'victory' : 'defeat', false);
    }

    let contentHtml = '';

    if (!isWinner || data.winner === 'EMPATE') {
        const isTie = data.winner === 'EMPATE';
        const titleText = isTie ? '¡EMPATE!' : (data.reason === 'SURRENDER' ? 'RENDICIÓN' : 'DERROTA');
        const titleColor = isTie ? '#00f0ff' : '#ff4757';
        const descText = isTie 
            ? 'Los Life Points de ambos duelistas llegaron a 0 simultáneamente.' 
            : (data.reason === 'SURRENDER' ? `${data.loser} se ha rendido. Victoria concedida a ${data.winner}.` : `Victoria concedida a ${data.winner}.`);

        contentHtml = `
            <div style="border:2px solid ${titleColor} !important; box-shadow:0 0 35px ${titleColor}50 !important; width:540px; max-width:94vw; background:linear-gradient(180deg, #0b1426 0%, #060b17 100%); border-radius:12px; padding:24px 26px; text-align:center; margin:0 auto; box-sizing:border-box;">
                <div style="font-family:'Orbitron', sans-serif; font-size:22px; font-weight:900; margin-bottom:6px; color:${titleColor}; text-shadow:0 0 15px ${titleColor}80; letter-spacing:1px;">
                    ${titleText}
                </div>
                <div style="font-size:12px; color:#94a3b8; margin-bottom:16px; line-height:1.4;">
                    ${descText}
                </div>
                <div style="background:rgba(15,23,42,0.85); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:12px 16px; margin-bottom:18px; font-size:11px; display:flex; justify-content:space-around; align-items:center;">
                    <div>
                        <div style="color:#64748b; font-size:9px; font-weight:700; font-family:'Orbitron', sans-serif;">ESTADO</div>
                        <div style="font-weight:900; color:${titleColor}; font-size:12px; margin-top:2px;">${isTie ? 'Empate' : 'Derrota'}</div>
                    </div>
                    <div style="height:25px; width:1px; background:rgba(255,255,255,0.1);"></div>
                    <div>
                        <div style="color:#64748b; font-size:9px; font-weight:700; font-family:'Orbitron', sans-serif;">RECOMPENSA</div>
                        <div style="font-weight:800; color:#ef4444; font-size:11.5px; margin-top:2px;">0 ★ Starships / 0 ⚡ EXP</div>
                    </div>
                </div>
                <div style="display:flex; gap:12px;">
                    <button onclick="returnToDuelMenu()" style="flex:1; padding:10px 14px; font-size:11px; font-family:'Orbitron', sans-serif; font-weight:900; letter-spacing:0.8px; background:linear-gradient(135deg, rgba(0,229,255,0.35), rgba(9,132,227,0.55)); border:1px solid #00f0ff; color:#fff; cursor:pointer; border-radius:6px; transition:all 0.2s ease;">
                        REINTENTAR
                    </button>
                    <button onclick="returnToLobby()" style="flex:1; padding:10px 14px; font-size:11px; font-family:'Orbitron', sans-serif; font-weight:800; letter-spacing:0.8px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.18); color:#cbd5e1; cursor:pointer; border-radius:6px; transition:all 0.2s ease;">
                        LOBBY PRINCIPAL
                    </button>
                </div>
            </div>
        `;
    } else {
        // VICTORIA CON DESGLOSE COMPLETO
        const expData = (rewards && rewards.expBreakdown) || { base: 200, avatarBonusAmount: 0, vipBonusAmount: 0, medalsBonusAmount: 0, total: 200 };
        const stData = (rewards && rewards.starshipsBreakdown) || { base: 50, avatarBonusAmount: 0, vipBonusAmount: 0, medalsBonusAmount: 0, total: 50 };
        const luckData = (rewards && rewards.luck) || { totalLuckPct: 0, dropProbabilityPct: 10 };
        const lvlData = (rewards && rewards.levelProgress) || { newLevel: 1, newExp: 0, expRequiredForNextLevel: 250, progressPercent: 0, isLeveledUp: false };
        const cardDrop = rewards && rewards.cardDrop;
        const puzzlePiece = rewards && rewards.puzzlePiece;

        // Si cayó carta, añadirla al inventario local
        if (cardDrop && window.PacksManager && typeof window.PacksManager.addCardToInventory === 'function') {
            window.PacksManager.addCardToInventory(cardDrop);
        }

        const isExodia = data.reason === 'EXODIA';
        const reasonBadge = isExodia ? '¡CONVOCACIÓN DE EXODIA!' : (data.reason === 'DECK_OUT' ? 'Victoria por Deck Out' : (data.reason === 'SURRENDER' ? 'Victoria por Rendición' : 'Victoria Oficial'));

        contentHtml = `
            <div style="border:2px solid #ffd700 !important; box-shadow:0 0 45px rgba(255,215,0,0.45) !important; width:840px; max-width:96vw; max-height:92vh; overflow-y:auto; padding:20px 24px; background:linear-gradient(180deg, #0b1426 0%, #060b17 100%); border-radius:12px; margin:0 auto; box-sizing:border-box; text-align:left;">
                
                ${isExodia ? `
                    <div style="background:linear-gradient(135deg, rgba(234,179,8,0.3), rgba(168,85,247,0.35)); border:1.5px solid #ffd700; border-radius:8px; padding:8px 14px; margin-bottom:12px; text-align:center;">
                        <div style="font-family:'Orbitron', sans-serif; font-size:13px; font-weight:900; color:#ffd700; letter-spacing:1px; text-shadow:0 0 10px rgba(255,215,0,0.8);">
                            ✨ ¡¡¡EXODIA, EL PROHIBIDO HA SIDO CONVOCADO!!! ✨
                        </div>
                    </div>
                ` : ''}

                <!-- HEADER VICTORIA -->
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,215,0,0.25); padding-bottom:10px; margin-bottom:14px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:22px;">🏆</span>
                        <span style="font-family:'Orbitron', sans-serif; font-size:20px; font-weight:900; color:#ffd700; text-shadow:0 0 14px rgba(255,215,0,0.6); letter-spacing:1px;">
                            ${isExodia ? '¡VICTORIA POR EXODIA!' : '¡VICTORIA OFICIAL!'}
                        </span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:11px; color:#cbd5e1;">Rival: <b style="color:#00f0ff;">${data.loser}</b></span>
                        <span style="background:rgba(0,240,255,0.15); border:1px solid #00f0ff; color:#00f0ff; padding:2px 8px; font-size:9.5px; font-weight:800; border-radius:4px; font-family:'Orbitron', sans-serif;">${reasonBadge}</span>
                        ${lvlData.isLeveledUp ? `<span style="background:linear-gradient(90deg, #ffd700, #f59e0b); color:#000; padding:2px 8px; font-size:9.5px; font-weight:900; border-radius:4px; font-family:'Orbitron', sans-serif;">¡SUBIDA DE NIVEL!</span>` : ''}
                    </div>
                </div>

                <!-- BANNER DE MEDALLA / AVANCE AVENTURA DESBLOQUEADO -->
                ${rewards && rewards.unlockedMedal ? `
                    <div style="background:linear-gradient(135deg, rgba(234,179,8,0.35), rgba(245,158,11,0.55)); border:2px solid #ffd700; border-radius:8px; padding:8px 12px; margin-bottom:12px; box-shadow:0 0 20px rgba(255,215,0,0.5); text-align:center;">
                        <div style="font-family:'Orbitron', sans-serif; font-size:11.5px; font-weight:900; color:#ffd700;">
                            🎖️ ¡NUEVA MEDALLA DESBLOQUEADA: ${rewards.unlockedMedal.name}! 🎖️
                        </div>
                        ${(rewards.unlockedMedal.desc && rewards.unlockedMedal.desc !== 'undefined') ? `
                        <div style="font-size:9.5px; color:#fff; margin-top:2px;">
                            ${rewards.unlockedMedal.desc}
                        </div>` : ''}
                    </div>
                ` : ''}
                ${rewards && rewards.isNewNpcUnlocked ? `
                    <div style="background:linear-gradient(135deg, rgba(0,240,255,0.2), rgba(2,132,199,0.35)); border:1.5px solid #00f0ff; border-radius:6px; padding:6px 10px; margin-bottom:10px; text-align:center;">
                        <span style="font-family:'Orbitron', sans-serif; font-size:10px; font-weight:800; color:#00f0ff;">
                            ⚔️ ¡NUEVO DUELISTA DESBLOQUEADO EN MODO AVENTURA: NPC #${rewards.nextNpcId}!
                        </span>
                    </div>
                ` : ''}
                <div id="adv-medal-unlocked-banner" style="display:none;"></div>
                <div id="adv-next-npc-banner" style="display:none;"></div>

                <!-- CUERPO HORIZONTAL EN 2 COLUMNAS (RECOMPENSAS IZQ, PROGRESO/DROPS DER) -->
                <div style="display:grid; grid-template-columns: 1.25fr 1fr; gap:16px; margin-bottom:16px;">
                    
                    <!-- COLUMNA 1: DESGLOSE DE RECOMPENSAS -->
                    <div style="background:rgba(15,23,42,0.85); border:1px solid rgba(0,240,255,0.2); border-radius:8px; padding:12px 14px; display:flex; flex-direction:column; justify-content:space-between;">
                        <div>
                            <div style="font-family:'Orbitron', sans-serif; font-size:10px; font-weight:800; color:#00f0ff; letter-spacing:0.8px; margin-bottom:8px; text-transform:uppercase; display:flex; justify-content:space-between; border-bottom:1px solid rgba(0,240,255,0.2); padding-bottom:6px;">
                                <span>Desglose de Recompensas</span>
                                <span>EXP ⚡ / STARSHIPS ★</span>
                            </div>
                            <table style="width:100%; border-collapse:collapse; font-size:11px; color:#e2e8f0;">
                                <tbody>
                                    <tr style="height:23px;">
                                        <td style="color:#cbd5e1; font-weight:500;">🔹 Base del Duelo</td>
                                        <td style="text-align:right; color:#00f0ff; font-weight:700; font-family:'Orbitron', sans-serif;">+${(expData.base || 0).toLocaleString()} ⚡</td>
                                        <td style="text-align:right; color:#ffd700; font-weight:700; font-family:'Orbitron', sans-serif; padding-left:10px;">+${(stData.base || 0).toLocaleString()} ★</td>
                                    </tr>
                                    <tr style="height:23px;">
                                        <td style="color:#c084fc; font-weight:500;">🎴 Bonificación Avatar</td>
                                        <td style="text-align:right; color:${expData.avatarBonusAmount ? '#c084fc' : '#64748b'}; font-weight:700; font-family:'Orbitron', sans-serif;">${expData.avatarBonusAmount ? `+${expData.avatarBonusAmount.toLocaleString()} ⚡` : '—'}</td>
                                        <td style="text-align:right; color:${stData.avatarBonusAmount ? '#c084fc' : '#64748b'}; font-weight:700; font-family:'Orbitron', sans-serif; padding-left:10px;">${stData.avatarBonusAmount ? `+${stData.avatarBonusAmount.toLocaleString()} ★` : '—'}</td>
                                    </tr>
                                    <tr style="height:23px;">
                                        <td style="color:#fde047; font-weight:500;">💎 Membresía VIP</td>
                                        <td style="text-align:right; color:${expData.vipBonusAmount ? '#fde047' : '#64748b'}; font-weight:700; font-family:'Orbitron', sans-serif;">${expData.vipBonusAmount ? `+${expData.vipBonusAmount.toLocaleString()} ⚡` : '—'}</td>
                                        <td style="text-align:right; color:${stData.vipBonusAmount ? '#fde047' : '#64748b'}; font-weight:700; font-family:'Orbitron', sans-serif; padding-left:10px;">${stData.vipBonusAmount ? `+${stData.vipBonusAmount.toLocaleString()} ★` : '—'}</td>
                                    </tr>
                                    <tr style="height:23px;">
                                        <td style="color:#38bdf8; font-weight:500;">🎖️ Medallas</td>
                                        <td style="text-align:right; color:${expData.medalsBonusAmount ? '#38bdf8' : '#64748b'}; font-weight:700; font-family:'Orbitron', sans-serif;">${expData.medalsBonusAmount ? `+${expData.medalsBonusAmount.toLocaleString()} ⚡` : '—'}</td>
                                        <td style="text-align:right; color:${stData.medalsBonusAmount ? '#38bdf8' : '#64748b'}; font-weight:700; font-family:'Orbitron', sans-serif; padding-left:10px;">${stData.medalsBonusAmount ? `+${stData.medalsBonusAmount.toLocaleString()} ★` : '—'}</td>
                                    </tr>
                                    <tr style="height:23px;">
                                        <td style="color:#10b981; font-weight:500;">🛡️ Bonificación Clan</td>
                                        <td style="text-align:right; color:${expData.clanBonusAmount ? '#10b981' : '#64748b'}; font-weight:700; font-family:'Orbitron', sans-serif;">${expData.clanBonusAmount ? `+${expData.clanBonusAmount.toLocaleString()} ⚡` : '—'}</td>
                                        <td style="text-align:right; color:${stData.clanBonusAmount ? '#10b981' : '#64748b'}; font-weight:700; font-family:'Orbitron', sans-serif; padding-left:10px;">${stData.clanBonusAmount ? `+${stData.clanBonusAmount.toLocaleString()} ★` : '—'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- TOTAL RECLAMADO -->
                        <div style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,215,0,0.3); border-radius:6px; padding:8px 10px; margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:#fff; font-weight:900; font-family:'Orbitron', sans-serif; font-size:10px; letter-spacing:0.5px;">TOTAL RECLAMADO</span>
                            <div style="display:flex; gap:12px;">
                                <span style="color:#00f0ff; font-weight:900; font-family:'Orbitron', sans-serif; font-size:13px; text-shadow:0 0 10px rgba(0,240,255,0.6);">+${(expData.total || expData.base || 0).toLocaleString()} ⚡</span>
                                <span style="color:#ffd700; font-weight:900; font-family:'Orbitron', sans-serif; font-size:13px; text-shadow:0 0 10px rgba(255,215,0,0.6);">+${(stData.total || stData.base || 0).toLocaleString()} ★</span>
                            </div>
                        </div>
                    </div>

                    <!-- COLUMNA 2: NIVEL, DROP DE CARTA Y ROMPECABEZAS -->
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        
                        <!-- CAJA COMPACTA DE PROGRESO DE NIVEL -->
                        <div style="background:rgba(15,23,42,0.85); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:9px 12px; text-align:left;">
                            <div style="display:flex; justify-content:space-between; align-items:center; font-size:10px; font-family:'Orbitron', sans-serif; margin-bottom:5px;">
                                <span style="color:#ffd700; font-weight:900;">Nivel ${lvlData.newLevel}</span>
                                <span style="color:#00f0ff; font-weight:700; font-size:9.5px;">${lvlData.newExp.toLocaleString()} / ${lvlData.expRequiredForNextLevel ? lvlData.expRequiredForNextLevel.toLocaleString() : 'MAX'} EXP (${lvlData.progressPercent}%)</span>
                            </div>
                            <div style="width:100%; height:7px; background:rgba(0,0,0,0.6); border-radius:4px; overflow:hidden; border:1px solid rgba(0,240,255,0.25);">
                                <div style="width:${lvlData.progressPercent}%; height:100%; background:linear-gradient(90deg, #00f0ff, #3b82f6); transition:width 1s ease-in-out;"></div>
                            </div>
                        </div>

                        <!-- CAJA VISUAL DE DROP DE CARTA (SOLO IMAGEN Y ESTADO) -->
                        <div style="background:rgba(15,23,42,0.85); border:1px solid ${cardDrop ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.08)'}; border-radius:8px; padding:10px 12px; display:flex; align-items:center; gap:12px; flex:1;">
                            ${cardDrop ? `
                                <img src="/api/cards/${cardDrop.card_id || cardDrop.id}/image" onerror="this.onerror=null; this.src='/assets/card_back.jpg';" style="width:52px; height:76px; object-fit:cover; border-radius:4px; border:1.5px solid #10b981; box-shadow:0 0 14px rgba(16,185,129,0.45); flex-shrink:0;">
                                <div style="text-align:left; flex:1; min-width:0;">
                                    <div style="font-size:9px; font-weight:900; color:#10b981; font-family:'Orbitron', sans-serif; letter-spacing:0.5px;">¡CARTA OBTENIDA!</div>
                                    <div style="font-size:11.5px; font-weight:800; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">${cardDrop.name}</div>
                                    <div style="font-size:9px; color:#94a3b8; margin-top:3px;">Suerte: <b style="color:#10b981;">+${luckData.totalLuckPct || 0}%</b></div>
                                </div>
                            ` : `
                                <div style="width:46px; height:68px; border-radius:4px; border:1px dashed rgba(255,255,255,0.2); background:rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:#64748b; font-size:18px; flex-shrink:0;">🃏</div>
                                <div style="text-align:left; flex:1;">
                                    <div style="font-size:9.5px; font-weight:800; color:#94a3b8; font-family:'Orbitron', sans-serif;">SIN DROP DE CARTA</div>
                                    <div style="font-size:9px; color:#64748b; margin-top:2px;">Suerte activa: +${luckData.totalLuckPct || 0}%</div>
                                </div>
                            `}
                        </div>

                        <!-- CAJA DE EVENTO DE ROMPECABEZAS (SIEMPRE VISIBLE SI EVENTO ESTÁ ACTIVO) -->
                        ${(puzzlePiece && puzzlePiece.active) ? `
                            <div style="background:${puzzlePiece.dropped ? 'rgba(168,85,247,0.15)' : 'rgba(15,23,42,0.85)'}; border:1px solid ${puzzlePiece.dropped ? '#a855f7' : 'rgba(255,255,255,0.08)'}; border-radius:8px; padding:8px 12px; display:flex; align-items:center; gap:10px;">
                                <span style="font-size:20px; flex-shrink:0;">🧩</span>
                                <div style="text-align:left; flex:1; min-width:0;">
                                    <div style="font-size:8.5px; font-weight:900; color:${puzzlePiece.dropped ? '#c084fc' : '#94a3b8'}; font-family:'Orbitron', sans-serif;">
                                        ${puzzlePiece.event_title || 'EVENTO DE ROMPECABEZAS'}
                                    </div>
                                    <div style="font-size:10px; font-weight:700; color:#fff; margin-top:1px;">
                                        ${puzzlePiece.dropped ? `¡Obtuviste la Ficha #${puzzlePiece.piece_number}! (${puzzlePiece.current_pieces_count}/${puzzlePiece.total_pieces} Piezas)` : `No se obtuvo ficha en este duelo (${puzzlePiece.current_pieces_count || 0}/${puzzlePiece.total_pieces || 16} Piezas)`}
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                    </div>
                </div>

                <!-- BOTONES DE ACCIÓN (LIMPIOS, SIN ICONOS NI TEXTOS LARGOS) -->
                <div style="display:flex; gap:12px;">
                    <button onclick="returnToDuelMenu()" style="flex:1; padding:10px 14px; font-size:11px; font-family:'Orbitron', sans-serif; font-weight:900; letter-spacing:0.8px; background:linear-gradient(135deg, rgba(0,229,255,0.35), rgba(9,132,227,0.55)); border:1px solid #00f0ff; color:#fff; cursor:pointer; border-radius:6px; transition:all 0.2s ease;">
                        SIGUIENTE DUELO
                    </button>
                    <button onclick="returnToLobby()" style="flex:1; padding:10px 14px; font-size:11px; font-family:'Orbitron', sans-serif; font-weight:800; letter-spacing:0.8px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.18); color:#cbd5e1; cursor:pointer; border-radius:6px; transition:all 0.2s ease;">
                        LOBBY PRINCIPAL
                    </button>
                </div>
            </div>
        `;
    }

    const contentBox = document.getElementById('game-over-modal-content');
    if (contentBox) {
        contentBox.innerHTML = contentHtml;
    } else {
        modal.innerHTML = contentHtml;
    }
    modal.style.display = 'flex';

    if (isWinner && data.winner !== 'EMPATE') {
        const u = window.Session ? window.Session.getUser() : null;
        const uid = u ? (u.id || u.user_id || u.Id || 1) : 1;
        fetch('/api/adventure/defeat-npc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: uid,
                npcId: currentNpcId,
                isWinner: true,
                turns: 10
            })
        }).then(r => r.json()).then(advRes => {
            if (advRes && advRes.success) {
                if (advRes.unlockedMedal) {
                    const mBox = document.getElementById('adv-medal-unlocked-banner');
                    if (mBox) {
                        mBox.innerHTML = `
                            <div style="background:linear-gradient(135deg, rgba(234,179,8,0.35), rgba(245,158,11,0.55)); border:2px solid #ffd700; border-radius:8px; padding:10px; margin-bottom:12px; box-shadow:0 0 20px rgba(255,215,0,0.5); text-align:center;">
                                <div style="font-family:'Orbitron', sans-serif; font-size:12px; font-weight:900; color:#ffd700;">
                                    🎖️ ¡NUEVA MEDALLA DESBLOQUEADA: ${advRes.unlockedMedal.name}! 🎖️
                                </div>
                                ${(advRes.unlockedMedal.desc && advRes.unlockedMedal.desc !== 'undefined') ? `
                                <div style="font-size:10px; color:#fff; margin-top:2px;">
                                    ${advRes.unlockedMedal.desc}
                                </div>` : ''}
                            </div>
                        `;
                        mBox.style.display = 'block';
                    }
                }
                if (advRes.isNewNpcUnlocked) {
                    const nBox = document.getElementById('adv-next-npc-banner');
                    if (nBox) {
                        nBox.innerHTML = `
                            <div style="background:linear-gradient(135deg, rgba(0,240,255,0.2), rgba(2,132,199,0.35)); border:1.5px solid #00f0ff; border-radius:6px; padding:8px; margin-bottom:10px; text-align:center;">
                                <span style="font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:800; color:#00f0ff;">
                                    ⚔️ ¡NUEVO DUELISTA DESBLOQUEADO EN MODO AVENTURA: NPC #${advRes.nextNpcId}!
                                </span>
                            </div>
                        `;
                        nBox.style.display = 'block';
                    }
                }
            }
        }).catch(err => console.warn('[ADVENTURE VICTORY SYNC ERROR]', err));
    }
}

function returnToDuelMenu() {
    window.location.href = '/views/duels/npc/select-npc.html';
}

function returnToLobby() {
    window.location.href = '/views/lobby/lobby.html';
}

let isArenaInitialized = false;
async function initNpcDuelArena() {
    if (isArenaInitialized) return;
    isArenaInitialized = true;

    if (window.Session && !window.Session.isLoggedIn()) {
        window.Session.saveUser({ id: 1, username: 'Admin', role: 'admin' });
    }

    const user = window.Session ? window.Session.getUser() : null;
    const playerName = user ? user.username : 'Admin';

    const pNameEl = document.getElementById('player-name-val');
    if (pNameEl) pNameEl.textContent = playerName;

    const urlParams = new URLSearchParams(window.location.search);
    const npcIdParam = urlParams.get('npcId') || urlParams.get('npc') || urlParams.get('id') || urlParams.get('level');
    
    if (npcIdParam) {
        currentNpcId = parseInt(npcIdParam, 10);
    } else {
        currentNpcId = 1;
    }

    // Sincronizar catálogo oficial y obtener datos del NPC seleccionado
    let npcObj = null;
    try {
        if (window.AdventureData && typeof window.AdventureData.syncFromServer === 'function') {
            await window.AdventureData.syncFromServer();
        }
        if (window.AdventureData && typeof window.AdventureData.getNpcById === 'function') {
            npcObj = window.AdventureData.getNpcById(currentNpcId);
        }

        if (!npcObj) {
            const catRes = await fetch('/api/adventure/catalog');
            if (catRes.ok) {
                const catData = await catRes.json();
                if (catData && catData.npcs) {
                    npcObj = catData.npcs.find(n => n.id === currentNpcId || n.Id === currentNpcId);
                }
            }
        }
    } catch (e) {
        console.warn('[NPC ARENA LOAD ERROR]', e);
    }

    if (npcObj) {
        currentNpcId = npcObj.id || npcObj.Id;
        currentNpcObj = npcObj;
        window.currentNpcObj = npcObj;
        window.currentNpcPortrait = npcObj.portrait || npcObj.PortraitCode || 'yugi_muto';
        currentNpcOpponent = `${npcObj.name || npcObj.Name} (Nv. ${npcObj.level || npcObj.Level})`;
    } else {
        currentNpcOpponent = `NPC Legendario #${currentNpcId}`;
    }

    // Actualizar nombre del rival en el tablero de juego y en la modal de dados
    const boardRivalEl = document.getElementById('board-rival-name');
    if (boardRivalEl) boardRivalEl.textContent = currentNpcOpponent;
    const rivalValEl = document.getElementById('rival-name-val');
    if (rivalValEl) rivalValEl.textContent = currentNpcOpponent;

    const nLabel = document.getElementById('dice-npc-label');
    if (nLabel) nLabel.textContent = currentNpcOpponent.toUpperCase();

    document.title = `Ani-Dimension - Duelo vs ${currentNpcOpponent}`;

    const activeSocket = window.getSocket ? window.getSocket() : (window.socket || (typeof socket !== 'undefined' ? socket : null));
    if (activeSocket) {
        activeSocket.off('DUEL_GAME_OVER');
        activeSocket.on('DUEL_GAME_OVER', (data) => {
            showGameOverModal(data);
        });
    }

    openDiceRollModal(currentNpcOpponent);
}

function promptSurrender() {
    const modal = document.getElementById('surrender-modal');
    if (modal) modal.style.display = 'flex';
}

function closeSurrenderModal() {
    const modal = document.getElementById('surrender-modal');
    if (modal) modal.style.display = 'none';
}

function confirmSurrender() {
    closeSurrenderModal();
    const myUsername = (window.currentUser && window.currentUser.username) 
        || (window.Session && window.Session.getUser() && window.Session.getUser().username) 
        || 'Admin';
    const activeSocket = window.getSocket ? window.getSocket() : (window.socket || (typeof socket !== 'undefined' ? socket : null));
    const roomId = (typeof window.getActiveDuelRoomId === 'function') 
        ? window.getActiveDuelRoomId() 
        : (window.lastDuelState ? window.lastDuelState.roomId : 'ROOM_DEMO');

    if (activeSocket) {
        activeSocket.emit('SURRENDER', {
            room_id: roomId,
            player_name: myUsername,
            action_type: 'SURRENDER'
        });
    }

    // Fallback: Si el socket no responde en 350ms, desplegar la modal de fin de duelo con motivo de rendición
    setTimeout(() => {
        const gameOverModal = document.getElementById('game-over-modal');
        if (gameOverModal && gameOverModal.style.display !== 'flex') {
            showGameOverModal({
                winner: currentNpcOpponent || 'NPC Yugi Muto',
                loser: myUsername,
                reason: 'SURRENDER',
                rewards: null
            });
        }
    }, 350);
}

// Exportar globalmente
window.openDiceRollModal = openDiceRollModal;
window.closeDiceRollModal = closeDiceRollModal;
window.rollDice = rollDice;
window.confirmOrderChoice = confirmOrderChoice;
window.startDuelWithOrder = startDuelWithOrder;
window.showGameOverModal = showGameOverModal;
window.returnToDuelMenu = returnToDuelMenu;
window.returnToLobby = returnToLobby;
window.initNpcDuelArena = initNpcDuelArena;
window.promptSurrender = promptSurrender;
window.closeSurrenderModal = closeSurrenderModal;
window.confirmSurrender = confirmSurrender;

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNpcDuelArena);
} else {
    initNpcDuelArena();
}
