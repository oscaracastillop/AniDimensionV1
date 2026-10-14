/**
 * Ani-Dimension: Orquestador de Duelos PvP Multijugador Online
 * Maneja sincronización de tablero, reloj de 2 minutos y perspectiva dual
 */
var currentPvpRoomId = 'ROOM_PVP_ONLINE';

document.addEventListener('DOMContentLoaded', () => {
    if (window.Session && !window.Session.requireAuth('../../login/login.html')) return;

    const user = window.Session ? window.Session.getUser() : null;
    const playerName = user ? user.username : 'Duelista';

    const pNameEl = document.getElementById('player-name-val');
    if (pNameEl) pNameEl.textContent = playerName;

    initPvpMatch();
});

function initPvpMatch() {
    const socket = window.getSocket ? window.getSocket() : (window.socket || (typeof io !== 'undefined' ? io() : null));
    const user = window.Session ? window.Session.getUser() : null;
    const playerName = user ? user.username : 'Duelista';

    const urlParams = new URLSearchParams(window.location.search);
    currentPvpRoomId = urlParams.get('room') || 'ROOM_PVP_ONLINE';
    window.currentPvpRoomId = currentPvpRoomId;

    const isSpectator = urlParams.get('spectate') === '1' || urlParams.get('mode') === 'spectator';
    window.isSpectatorMode = isSpectator;

    const spectatorBadge = document.getElementById('spectator-live-badge');
    if (spectatorBadge && isSpectator) {
        spectatorBadge.style.display = 'flex';
    }

        socket.emit('USER_IDENTIFY', { 
            username: user.username,
            mat: (window.PlaymatsManager && window.PlaymatsManager.getActivePlaymatCode && window.PlaymatsManager.getActivePlaymatCode()) || user.matActivoId || 'default_mat'
        });

    console.log(`[PVP ARENA] Conectado a sala: ${currentPvpRoomId} como ${playerName} (Espectador: ${isSpectator})`);

    const tId = urlParams.get('tournament') || urlParams.get('torneo');
    const mId = urlParams.get('match') || urlParams.get('partida');

    if (socket) {
        if (tId && mId && !isSpectator) {
            // Unirse como jugador oficial de la partida de torneo
            const myDeck = (window.DeckManager && window.DeckManager.getActiveDeck) ? window.DeckManager.getActiveDeck() : null;
            socket.emit('TOURNAMENT_JOIN_MATCH_ROOM', {
                torneoId: tId,
                matchId: mId,
                roomId: currentPvpRoomId,
                username: playerName,
                player_deck: myDeck
            });
        } else {
            // Conectar a la sala PvP activa
            socket.emit('PVP_CONNECT_DUEL', {
                room_id: currentPvpRoomId,
                username: playerName,
                isSpectator: isSpectator
            });
        }

        // Manejador de espectadores conectados
        socket.on('PVP_SPECTATOR_COUNT', (data) => {
            if (!data) return;
            const countLbl = document.getElementById('spectator-count-label');
            if (countLbl) {
                countLbl.textContent = `(${data.count || 0} espectadores)`;
            }
        });

        // 1. Manejador del Temporizador de Turno PvP (2 minutos / 120s)
        socket.on('PVP_TIMER_TICK', (data) => {
            if (!data) return;
            updatePvpTurnTimerDisplay(data.timeRemaining, data.turnPlayer);
        });

        // 2. Manejador del Sorteo de Dados PvP
        socket.on('PVP_DICE_RESULT', (data) => {
            if (!data) return;
            const pCube = document.getElementById('die-player-cube');
            const nCube = document.getElementById('die-npc-cube');
            const msg = document.getElementById('dice-status-message');
            const btnRoll = document.getElementById('btn-roll-dice');
            const pLabel = document.getElementById('dice-player-label');
            const nLabel = document.getElementById('dice-npc-label');

            const isP1 = Boolean(data.p1Username && playerName && data.p1Username.toLowerCase() === playerName.toLowerCase());
            const myRoll = isP1 ? data.p1Roll : data.p2Roll;
            const rivalRoll = isP1 ? data.p2Roll : data.p1Roll;
            const rivalName = isP1 ? data.p2Username : data.p1Username;

            if (pLabel) pLabel.textContent = (isSpectator ? (data.p1Username || 'JUGADOR 1') : playerName).toUpperCase();
            if (nLabel) nLabel.textContent = (isSpectator ? (data.p2Username || 'JUGADOR 2') : (rivalName || 'RIVAL')).toUpperCase();

            if (btnRoll) btnRoll.disabled = true;
            if (pCube) { pCube.classList.remove('die-rolling'); pCube.textContent = myRoll; }
            if (nCube) { nCube.classList.remove('die-rolling'); nCube.textContent = rivalRoll; }

            const won = Boolean(data.winnerUsername && playerName && data.winnerUsername.toLowerCase() === playerName.toLowerCase());
            if (msg) {
                if (isSpectator) {
                    msg.innerHTML = `<b style="color:#00f0ff; font-size:13px;">⚔️ ${data.winnerUsername} ganó el sorteo (${Math.max(myRoll, rivalRoll)} vs ${Math.min(myRoll, rivalRoll)})</b><br><span style="color:#38bdf8; font-size:11px;">Iniciando transmisión en vivo...</span>`;
                } else if (won) {
                    msg.innerHTML = `<b style="color:#00f0ff; font-size:13px;">🎉 ¡Ganaste el sorteo (${myRoll} vs ${rivalRoll})!</b><br><span style="color:#38bdf8; font-size:11px;">Inicias de Primeras. Entrando al Duelo...</span>`;
                } else {
                    msg.innerHTML = `<b style="color:#ff4757; font-size:13px;">⚔️ ${data.winnerUsername} ganó el sorteo (${rivalRoll} vs ${myRoll})</b><br><span style="color:#94a3b8; font-size:11px;">El rival inicia de Primeras. Entrando al Duelo...</span>`;
                }
            }

            setTimeout(() => {
                closeDiceRollModal();
                const duelApp = document.getElementById('duel-app');
                if (duelApp) duelApp.style.display = 'flex';
            }, 2500);
        });

        // 3. Manejador de Fin de Duelo (Victoria / Derrota PvP)
        socket.on('DUEL_GAME_OVER', (data) => {
            showGameOverModal(data);
        });
    }
}

function rollDice() {
    const socket = window.getSocket ? window.getSocket() : (window.socket || null);
    const user = window.Session ? window.Session.getUser() : null;
    const myName = user ? user.username : 'Duelista';

    const pCube = document.getElementById('die-player-cube');
    const nCube = document.getElementById('die-npc-cube');
    const msg = document.getElementById('dice-status-message');
    const btnRoll = document.getElementById('btn-roll-dice');

    if (btnRoll) btnRoll.disabled = true;
    if (pCube) pCube.classList.add('die-rolling');
    if (nCube) nCube.classList.add('die-rolling');
    if (msg) msg.innerHTML = '<b style="color:#00f0ff;">🎲 Lanzando dados para decidir el orden de inicio...</b>';

    if (socket) {
        socket.emit('PVP_ROLL_DICE', {
            room_id: window.currentPvpRoomId || currentPvpRoomId,
            username: myName
        });
    }
}

function closeDiceRollModal(cancelToLobby = false) {
    const modal = document.getElementById('dice-roll-modal');
    if (modal) modal.style.display = 'none';
    if (cancelToLobby) {
        returnToPvpLobby();
    }
}

window.rollDice = rollDice;
window.closeDiceRollModal = closeDiceRollModal;

function updatePvpTurnTimerDisplay(secondsRemaining, turnPlayer) {
    const timerBox = document.getElementById('pvp-turn-timer-box');
    const timerText = document.getElementById('pvp-turn-timer-text');
    if (!timerText) return;

    const mins = Math.floor(Math.max(0, secondsRemaining) / 60);
    const secs = Math.max(0, secondsRemaining) % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    timerText.textContent = formatted;

    if (timerBox) {
        timerBox.classList.remove('warning', 'danger');
        if (secondsRemaining <= 15) {
            timerBox.classList.add('danger');
        } else if (secondsRemaining <= 35) {
            timerBox.classList.add('warning');
        }
    }
}

function promptSurrender() {
    const modal = document.getElementById('surrender-modal');
    if (modal) {
        modal.style.display = 'flex';
    } else if (confirm('¿Estás seguro de que deseas rendirte? Concederás la victoria al rival.')) {
        confirmSurrender();
    }
}

function closeSurrenderModal() {
    const modal = document.getElementById('surrender-modal');
    if (modal) modal.style.display = 'none';
}

function confirmSurrender() {
    closeSurrenderModal();
    const socket = window.getSocket ? window.getSocket() : (window.socket || (typeof io !== 'undefined' ? io() : null));
    const user = window.Session ? window.Session.getUser() : null;
    const myUsername = user ? user.username : 'Duelista';
    const rId = window.currentPvpRoomId || currentPvpRoomId || (typeof window.getActiveDuelRoomId === 'function' ? window.getActiveDuelRoomId() : 'ROOM_PVP_ONLINE');

    if (socket) {
        socket.emit('SURRENDER', {
            room_id: rId,
            player_name: myUsername,
            action_type: 'SURRENDER'
        });
    }

    setTimeout(() => {
        const gameOverModal = document.getElementById('game-over-modal');
        if (gameOverModal && gameOverModal.style.display !== 'flex') {
            const rivalName = (window.lastDuelState && window.lastDuelState.player2 && window.lastDuelState.player2.username) || 'Rival PvP';
            showGameOverModal({
                winner: rivalName,
                loser: myUsername,
                reason: 'SURRENDER',
                rewards: null
            });
        }
    }, 350);
}

function surrenderDuel() {
    confirmSurrender();
}

window.promptSurrender = promptSurrender;
window.closeSurrenderModal = closeSurrenderModal;
window.confirmSurrender = confirmSurrender;
window.surrenderDuel = surrenderDuel;

function showGameOverModal(data) {
    const modal = document.getElementById('game-over-modal');
    const contentBox = document.getElementById('game-over-modal-content');
    if (!modal) return;

    const sessionUser = (window.Session && typeof window.Session.getUser === 'function') ? window.Session.getUser() : null;
    const myUsername = (sessionUser && sessionUser.username)
        || (window.currentUser && window.currentUser.username)
        || (window.lastDuelState && window.lastDuelState.player1 && window.lastDuelState.player1.username)
        || 'Duelista';

    const rivalName = (window.lastDuelState && window.lastDuelState.player2 && window.lastDuelState.player2.username)
        || 'Rival';

    let isWinner = false;
    if (data.winner === 'EMPATE') {
        isWinner = false;
    } else if (data.rewards && (data.rewards.isWinner || data.rewards.expBreakdown || data.rewards.starshipsBreakdown || (data.rewards.expAwarded && data.rewards.expAwarded > 0))) {
        isWinner = true;
    } else if (data.winner && myUsername && data.winner.trim().toLowerCase() === myUsername.trim().toLowerCase()) {
        isWinner = true;
    } else if (data.loser && myUsername && data.loser.trim().toLowerCase() !== myUsername.trim().toLowerCase()) {
        isWinner = true;
    } else if (window.lastDuelState && window.lastDuelState.player2 && Number(window.lastDuelState.player2.lp) <= 0 && window.lastDuelState.player1 && Number(window.lastDuelState.player1.lp) > 0) {
        isWinner = true;
    }

    const rewards = data.rewards;

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
                        <div style="color:#64748b; font-size:9px; font-weight:700; font-family:'Orbitron', sans-serif;">RECOMPENSA PVP</div>
                        <div style="font-weight:800; color:#ef4444; font-size:11.5px; margin-top:2px;">0 ★ Starships / 0 ⚡ EXP</div>
                    </div>
                </div>
                <div style="display:flex; gap:12px;">
                    <button onclick="returnToPvpLobby()" style="flex:1; padding:10px 14px; font-size:11px; font-family:'Orbitron', sans-serif; font-weight:900; letter-spacing:0.8px; background:linear-gradient(135deg, rgba(0,229,255,0.35), rgba(9,132,227,0.55)); border:1px solid #00f0ff; color:#fff; cursor:pointer; border-radius:6px; transition:all 0.2s ease;">
                        LOBBY PVP
                    </button>
                    <button onclick="returnToDuelMenu()" style="flex:1; padding:10px 14px; font-size:11px; font-family:'Orbitron', sans-serif; font-weight:800; letter-spacing:0.8px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.18); color:#cbd5e1; cursor:pointer; border-radius:6px; transition:all 0.2s ease;">
                        MENÚ DE DUELOS
                    </button>
                </div>
            </div>
        `;
    } else {
        // VICTORIA CON DESGLOSE COMPLETO
        const expData = (rewards && rewards.expBreakdown) || { base: 300, avatarBonusAmount: 0, vipBonusAmount: 0, medalsBonusAmount: 0, total: 300 };
        const stData = (rewards && rewards.starshipsBreakdown) || { base: 100, avatarBonusAmount: 0, vipBonusAmount: 0, medalsBonusAmount: 0, total: 100 };
        const luckData = (rewards && rewards.luck) || { totalLuckPct: 0, dropProbabilityPct: 15 };
        const lvlData = (rewards && rewards.levelProgress) || { newLevel: 1, newExp: 0, expRequiredForNextLevel: 250, progressPercent: 0, isLeveledUp: false };
        const cardDrop = rewards && rewards.cardDrop;
        const puzzlePiece = rewards && rewards.puzzlePiece;

        if (cardDrop && window.PacksManager && typeof window.PacksManager.addCardToInventory === 'function') {
            window.PacksManager.addCardToInventory(cardDrop);
        }

        const isExodia = data.reason === 'EXODIA';
        const reasonBadge = isExodia ? '¡CONVOCACIÓN DE EXODIA!' : (data.reason === 'DECK_OUT' ? 'Victoria por Deck Out' : (data.reason === 'SURRENDER' ? 'Victoria por Rendición' : 'Victoria Oficial PvP'));

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
                            ${isExodia ? '¡VICTORIA POR EXODIA!' : '¡VICTORIA PVP OFICIAL!'}
                        </span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:11px; color:#cbd5e1;">Rival: <b style="color:#00f0ff;">${data.loser}</b></span>
                        <span style="background:rgba(0,240,255,0.15); border:1px solid #00f0ff; color:#00f0ff; padding:2px 8px; font-size:9.5px; font-weight:800; border-radius:4px; font-family:'Orbitron', sans-serif;">${reasonBadge}</span>
                        ${lvlData.isLeveledUp ? `<span style="background:linear-gradient(90deg, #ffd700, #f59e0b); color:#000; padding:2px 8px; font-size:9.5px; font-weight:900; border-radius:4px; font-family:'Orbitron', sans-serif;">¡SUBIDA DE NIVEL!</span>` : ''}
                    </div>
                </div>

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
                                    ${(expData.roomBonusAmount || stData.roomBonusAmount) ? `
                                    <tr style="height:23px; background:rgba(249,115,22,0.1); border-radius:4px;">
                                        <td style="color:#f97316; font-weight:700;">🔥 ${expData.roomBonusTitle || 'Bonus Sala PvP'}</td>
                                        <td style="text-align:right; color:#f97316; font-weight:700; font-family:'Orbitron', sans-serif;">${expData.roomBonusAmount ? `+${expData.roomBonusAmount.toLocaleString()} ⚡` : '—'}</td>
                                        <td style="text-align:right; color:#f97316; font-weight:700; font-family:'Orbitron', sans-serif; padding-left:10px;">${stData.roomBonusAmount ? `+${stData.roomBonusAmount.toLocaleString()} ★` : '—'}</td>
                                    </tr>` : ''}
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
                                <img src="https://images.ygoprodeck.com/images/cards_small/${cardDrop.card_id || cardDrop.id}.jpg" onerror="this.onerror=null; this.src='/assets/card_back.jpg';" style="width:52px; height:76px; object-fit:cover; border-radius:4px; border:1.5px solid #10b981; box-shadow:0 0 14px rgba(16,185,129,0.45); flex-shrink:0;">
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
                    <button onclick="returnToPvpLobby()" style="flex:1; padding:10px 14px; font-size:11px; font-family:'Orbitron', sans-serif; font-weight:900; letter-spacing:0.8px; background:linear-gradient(135deg, rgba(0,229,255,0.35), rgba(9,132,227,0.55)); border:1px solid #00f0ff; color:#fff; cursor:pointer; border-radius:6px; transition:all 0.2s ease;">
                        LOBBY PVP
                    </button>
                    <button onclick="returnToDuelMenu()" style="flex:1; padding:10px 14px; font-size:11px; font-family:'Orbitron', sans-serif; font-weight:800; letter-spacing:0.8px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.18); color:#cbd5e1; cursor:pointer; border-radius:6px; transition:all 0.2s ease;">
                        MENÚ DE DUELOS
                    </button>
                </div>
            </div>
        `;
    }

    if (contentBox) {
        contentBox.innerHTML = contentHtml;
    } else {
        modal.innerHTML = contentHtml;
    }
    modal.style.display = 'flex';
}

function returnToPvpLobby() {
    window.location.href = 'lobby-pvp.html';
}

function returnToDuelMenu() {
    window.location.href = '../menu.html';
}

function returnToLobby() {
    window.location.href = '../../lobby/lobby.html';
}

window.returnToPvpLobby = returnToPvpLobby;
window.returnToDuelMenu = returnToDuelMenu;
window.returnToLobby = returnToLobby;
window.surrenderDuel = surrenderDuel;
