/**
 * Ani-Dimension: Orquestador de Duelos PvP Multijugador Online
 */
document.addEventListener('DOMContentLoaded', () => {
    if (window.Session && !window.Session.requireAuth('../../login/login.html')) return;

    const user = window.Session ? window.Session.getUser() : null;
    const playerName = user ? user.username : 'Duelista';

    const pNameEl = document.getElementById('player-name-val');
    if (pNameEl) pNameEl.textContent = playerName;

    initPvpMatch();
});

function initPvpMatch() {
    const user = window.Session ? window.Session.getUser() : null;
    const playerName = user ? user.username : 'Duelista';

    // Generar o usar sala PvP
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room') || 'ROOM_PVP_ONLINE';

    console.log(`[PVP] Conectando a sala PvP: ${roomId}...`);

    if (window.socket) {
        window.socket.emit('DUEL_START', {
            room_id: roomId,
            player_name: playerName,
            opponent_name: 'Rival En Vivo',
            first_player: 'player1'
        });
    }
}

function returnToDuelMenu() {
    window.location.href = '../menu.html';
}

function returnToLobby() {
    window.location.href = '../../lobby/lobby.html';
}

window.returnToDuelMenu = returnToDuelMenu;
window.returnToLobby = returnToLobby;
