/**
 * Ani-Dimension: Orquestador de Duelos vs NPC
 * Incluye lógica de tirada de dados 3D y selección de primer turno
 */
var currentNpcOpponent = 'NPC Principiante (Nv. 1)';
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
    if (msg) msg.textContent = 'Presiona "Lanzar Dados" para determinar el orden de inicio.';
    if (actions) actions.style.display = 'block';
    if (choices) choices.style.display = 'none';

    if (modal) modal.style.display = 'flex';
}

function closeDiceRollModal() {
    if (typeof diceRollInterval !== 'undefined' && diceRollInterval) clearInterval(diceRollInterval);
    const modal = document.getElementById('dice-roll-modal');
    if (modal) modal.style.display = 'none';
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
    if (msg) msg.textContent = '🎲 Lanzando los dados...';

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
                if (msg) msg.innerHTML = `🎉 <b style="color:var(--accent-cyan);">¡Has ganado la tirada! (${pFinal} vs ${nFinal})</b><br>Elige si deseas ir de Primeras o de Segundas:`;
                if (actions) actions.style.display = 'none';
                if (choices) choices.style.display = 'flex';
            } else {
                lastDiceWinner = 'player2';
                if (msg) msg.innerHTML = `🤖 <b style="color:#ff6b81;">El NPC obtuvo mayor puntaje (${nFinal} vs ${pFinal})</b><br>${currentNpcOpponent} ha elegido <b style="color:var(--accent-gold);">IR DE PRIMERAS</b>. Entrando al duelo...`;
                if (actions) actions.style.display = 'none';

                setTimeout(() => {
                    startDuelWithOrder('player2');
                }, 2200);
            }
        }
    }, 80);
}

function confirmOrderChoice(chosenFirstPlayer) {
    startDuelWithOrder(chosenFirstPlayer);
}

function startDuelWithOrder(firstPlayer) {
    closeDiceRollModal();
    if (typeof closeDuelMenu === 'function') closeDuelMenu();
    if (typeof closeWelcomeLobby === 'function') closeWelcomeLobby();

    cleanDuelFieldUI();

    const duelApp = document.getElementById('duel-app');
    if (duelApp) duelApp.style.display = 'flex';

    const activeSocket = window.getSocket ? window.getSocket() : (window.socket || (typeof socket !== 'undefined' ? socket : null));
    const myNick = window.Session && window.Session.getUser() ? window.Session.getUser().username : 'Admin';
    
    let userDeck = null;
    if (window.DeckManager && typeof window.DeckManager.getDeck === 'function') {
        userDeck = window.DeckManager.getDeck();
    } else {
        const saved = localStorage.getItem('ad_user_deck_v1');
        if (saved) {
            try { userDeck = JSON.parse(saved); } catch(e){}
        }
    }

    if (activeSocket) {
        activeSocket.emit('DUEL_START', {
            room_id: 'ROOM_DEMO',
            opponent_name: currentNpcOpponent || 'NPC Principiante (Nv. 1)',
            player_name: myNick,
            first_player: firstPlayer,
            player_deck: userDeck
        });
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
    const title = document.getElementById('game-over-title');
    const desc = document.getElementById('game-over-desc');
    const badge = document.getElementById('game-over-status-badge');
    const rewardBadge = document.getElementById('game-over-reward-badge');
    if (!modal) return;

    const myUsername = window.Session && window.Session.getUser() ? window.Session.getUser().username : 'Admin';
    const isWinner = data.winner === myUsername;

    if (data.reason === 'SURRENDER') {
        if (title) title.innerHTML = '🏳️ RENDICIÓN DEL DUELO';
        if (title) title.style.color = 'var(--accent-ruby)';
        if (desc) desc.textContent = `${data.loser} se ha rendido. Victoria concedida a ${data.winner}.`;
        if (badge) badge.textContent = 'Rendición Oficial';
        if (rewardBadge) {
            rewardBadge.textContent = '❌ 0 Starships / ⚡ 0 EXP (Sin Premio)';
            rewardBadge.style.color = '#ff4757';
        }
    } else if (data.reason === 'DECK_OUT') {
        if (isWinner) {
            if (title) title.innerHTML = '🏆 ¡VICTORIA POR DECK OUT!';
            if (title) title.style.color = 'var(--accent-gold)';
            if (desc) desc.textContent = `¡El Deck de ${data.loser} se quedó sin cartas! Has ganado el duelo por regla oficial Konami OCG.`;
            if (badge) badge.textContent = 'Victoria por Deck Out';
            if (rewardBadge) {
                rewardBadge.textContent = '⭐ +50 Starships / ⚡ +200 EXP';
                rewardBadge.style.color = 'var(--accent-gold)';
            }
        } else {
            if (title) title.innerHTML = '💀 DERROTA POR DECK OUT';
            if (title) title.style.color = '#ff4757';
            if (desc) desc.textContent = `Te has quedado sin cartas en el Deck al intentar robar. Victoria concedida a ${data.winner}.`;
            if (badge) badge.textContent = 'Derrota por Deck Out';
            if (rewardBadge) {
                rewardBadge.textContent = '❌ 0 Starships / ⚡ 0 EXP (Sin Premio)';
                rewardBadge.style.color = '#ff4757';
            }
        }
    } else if (isWinner) {
        if (title) title.innerHTML = '🏆 ¡VICTORIA OFICIAL KONAMI!';
        if (title) title.style.color = 'var(--accent-gold)';
        if (desc) desc.textContent = `¡Felicitaciones! Has derrotado a ${data.loser} en duelo reglamentario.`;
        if (badge) badge.textContent = 'Victoria';
        if (rewardBadge) {
            rewardBadge.textContent = '⭐ +50 Starships / ⚡ +200 EXP';
            rewardBadge.style.color = 'var(--accent-gold)';
        }
    } else {
        if (title) title.innerHTML = '💀 DERROTA';
        if (title) title.style.color = '#ff4757';
        if (desc) desc.textContent = `${data.winner} ha vencido en el duelo.`;
        if (badge) badge.textContent = 'Derrota';
        if (rewardBadge) {
            rewardBadge.textContent = '❌ 0 Starships / ⚡ 0 EXP (Sin Premio)';
            rewardBadge.style.color = '#ff4757';
        }
    }

    modal.style.display = 'flex';
}

function returnToDuelMenu() {
    window.location.href = '/views/duels/npc/select-npc.html';
}

function returnToLobby() {
    window.location.href = '/views/lobby/lobby.html';
}

function initNpcDuelArena() {
    if (window.Session && !window.Session.isLoggedIn()) {
        window.Session.saveUser({ id: 999, username: 'Admin', role: 'admin' });
    }

    const user = window.Session ? window.Session.getUser() : null;
    const playerName = user ? user.username : 'Admin';

    const pNameEl = document.getElementById('player-name-val');
    if (pNameEl) pNameEl.textContent = playerName;

    const urlParams = new URLSearchParams(window.location.search);
    const selectedLevel = urlParams.get('level') || '1';
    currentNpcOpponent = `NPC Principiante (Nv. ${selectedLevel})`;

    const rNameEl = document.getElementById('rival-name-val');
    if (rNameEl) rNameEl.textContent = currentNpcOpponent;

    openDiceRollModal(currentNpcOpponent);
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

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNpcDuelArena);
} else {
    initNpcDuelArena();
}
