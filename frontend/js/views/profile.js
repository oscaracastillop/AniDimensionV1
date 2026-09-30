/**
 * Ani-Dimension: Controlador de la Vista Dedicada de Perfil (Lectura de Estadísticas)
 */
document.addEventListener('DOMContentLoaded', () => {
    if (window.Session && !window.Session.requireAuth('../login/login.html')) {
        return;
    }

    initProfile();
});

function initProfile() {
    const user = window.Session ? window.Session.getUser() : null;
    if (!user) return;

    const nameEl = document.getElementById('prof-username');
    const lvlEl = document.getElementById('prof-level');
    const coinsEl = document.getElementById('prof-coins');
    const winsEl = document.getElementById('prof-wins');

    if (nameEl) nameEl.textContent = user.username || 'Duelista';
    if (lvlEl) lvlEl.textContent = `Nv. ${user.nivel || (user.stats && user.stats.level) || 1}`;
    if (coinsEl) coinsEl.textContent = `⭐ ${user.starships || (user.balances && user.balances.coins) || 500}`;
    if (winsEl) winsEl.textContent = user.wins || (user.stats && user.stats.wins) || 0;
}
