/**
 * Ani-Dimension: Controlador de la Vista del Lobby (Portal Informativo de Noticias y Eventos)
 */
async function enforceLandscapeOrientation() {
    try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.ScreenOrientation) {
            await window.Capacitor.Plugins.ScreenOrientation.lock({ orientation: 'landscape' });
        } else if (screen.orientation && typeof screen.orientation.lock === 'function') {
            await screen.orientation.lock('landscape');
        }
    } catch (e) {
        // En navegadores de escritorio sin permisos de orientación no interfiere
    }
}

document.addEventListener('DOMContentLoaded', () => {
    enforceLandscapeOrientation();
    // Protección de ruta: requerir autenticación
    if (window.Session && !window.Session.requireAuth('../login/login.html')) {
        return;
    }

    initLobbyUser();
    loadLobbyContent();
});

function initLobbyUser() {
    const user = window.Session ? window.Session.getUser() : null;
    if (!user) return;

    const nameEl = document.getElementById('lobby-username');
    const lvlEl = document.getElementById('lobby-level');
    const coinsEl = document.getElementById('lobby-starships');

    if (nameEl) nameEl.textContent = user.username || 'Duelista';
    if (lvlEl) {
        const lvl = (user.stats && user.stats.level) || user.nivel || 1;
        lvlEl.textContent = `Nv. ${lvl}`;
    }
    if (coinsEl) {
        const coins = (user.balances && user.balances.coins) || user.starships || 500;
        coinsEl.textContent = `⭐ ${coins} STARSHIPS`;
    }
}

async function loadLobbyContent() {
    try {
        const res = await fetch('/api/lobby/content');
        if (!res.ok) throw new Error('Error de servidor al cargar lobby');
        const data = await res.json();

        // 1. Renderizar Eventos
        const eventsContainer = document.getElementById('lobby-events-container');
        if (eventsContainer && data.events) {
            eventsContainer.innerHTML = data.events.map(evt => `
                <div class="event-card" style="border-left-color:${evt.badgeColor || 'var(--accent-gold)'};">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                        <span class="event-badge" style="background:${evt.badgeColor || 'var(--accent-gold)'}22; color:${evt.badgeColor || 'var(--accent-gold)'}; border:1px solid ${evt.badgeColor || 'var(--accent-gold)'}55;">
                            ${evt.badge}
                        </span>
                        <span style="font-size:10px; color:#64748b;">Expira: ${evt.endDate}</span>
                    </div>
                    <div class="event-title">${evt.title}</div>
                    <div class="event-desc">${evt.description}</div>
                    <div class="event-reward">⭐ Recompensa: ${evt.reward}</div>
                </div>
            `).join('');
        }

        // 2. Renderizar Actualizaciones y Parches
        const updatesContainer = document.getElementById('lobby-updates-container');
        if (updatesContainer && data.updates) {
            updatesContainer.innerHTML = data.updates.map(upd => `
                <div class="update-item">
                    <div class="update-header">
                        <span class="update-version">${upd.version}</span>
                        <span class="update-date">${upd.date}</span>
                    </div>
                    <div class="update-title-text">${upd.title}</div>
                    <ul class="update-highlights">
                        ${upd.highlights.map(h => {
                            const cleanText = typeof h === 'string' ? h.replace(/^[\p{Emoji}\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '').trim() : h;
                            return `<li>${cleanText}</li>`;
                        }).join('')}
                    </ul>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error('[LOBBY ERROR]', e);
    }
}
