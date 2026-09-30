/**
 * ANI-DIMENSION: NAVBAR INFERIOR FIJO CON VISTAS DEDICADAS (RUTAS ABSOLUTAS)
 * Menús: Lobby, Rankins, Duelos, Tienda, Administracion, Perfil, Salir
 */

const AppNavbar = {
    // Iconos vectoriales lineales de alta definición (Neón)
    icons: {
        lobby: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20V10.5z"/>
                <path d="M9 21V12h6v9"/>
                <circle cx="12" cy="7.5" r="1"/>
            </svg>
        `,
        rankings: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 4h16v5a8 8 0 0 1-16 0V4z"/>
                <path d="M12 12v6"/>
                <path d="M8 21h8"/>
                <path d="M10 8l2-2 2 2"/>
            </svg>
        `,
        duels: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 4l2 2-7.5 7.5-2-2L18 4z"/>
                <path d="M9.5 12.5L3 19l2 2 6.5-6.5"/>
                <line x1="6" y1="16" x2="8" y2="18"/>
                <path d="M6 4L4 6l7.5 7.5 2-2L6 4z"/>
                <path d="M14.5 12.5L21 19l-2 2-6.5-6.5"/>
                <line x1="18" y1="16" x2="16" y2="18"/>
            </svg>
        `,
        tienda: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
                <circle cx="12" cy="14" r="1.5"/>
            </svg>
        `,
        admin: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
        `,
        perfil: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
            </svg>
        `,
        salir: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
        `
    },

    // Retorna siempre la raíz absoluta de la aplicación
    getBasePath: function() {
        return '/';
    },

    // Inicializa el footer navbar
    init: function(currentTab = null) {
        const existing = document.getElementById('neon-footer-navbar');
        if (existing) existing.remove();

        const path = window.location.pathname;
        let active = currentTab;
        if (!active) {
            if (path.includes('/views/lobby/')) active = 'lobby';
            else if (path.includes('/views/rankings/')) active = 'rankings';
            else if (path.includes('/views/duels/')) active = 'duels';
            else if (path.includes('/views/shop/')) active = 'tienda';
            else if (path.includes('/views/admin/')) active = 'admin';
            else if (path.includes('/views/profile/')) active = 'perfil';
        }

        const nav = document.createElement('nav');
        nav.id = 'neon-footer-navbar';
        nav.className = 'neon-footer-navbar';
        nav.innerHTML = `
            <div class="neon-nav-container">
                <!-- 1. LOBBY -->
                <button type="button" class="neon-nav-item nav-lobby ${active === 'lobby' ? 'active' : ''}" onclick="AppNavbar.onNavigate('lobby')">
                    <div class="neon-nav-icon">${this.icons.lobby}</div>
                    <span class="neon-nav-label">Lobby</span>
                </button>

                <!-- 2. RANKINS -->
                <button type="button" class="neon-nav-item nav-rankings ${active === 'rankings' ? 'active' : ''}" onclick="AppNavbar.onNavigate('rankings')">
                    <div class="neon-nav-icon">${this.icons.rankings}</div>
                    <span class="neon-nav-label">Rankins</span>
                </button>

                <!-- 3. DUELOS -->
                <button type="button" class="neon-nav-item nav-duels ${active === 'duels' ? 'active' : ''}" onclick="AppNavbar.onNavigate('duels')">
                    <div class="neon-nav-icon">${this.icons.duels}</div>
                    <span class="neon-nav-label">Duelos</span>
                </button>

                <!-- 4. TIENDA -->
                <button type="button" class="neon-nav-item nav-tienda ${active === 'tienda' ? 'active' : ''}" onclick="AppNavbar.onNavigate('tienda')">
                    <div class="neon-nav-icon">${this.icons.tienda}</div>
                    <span class="neon-nav-label">Tienda</span>
                </button>

                <!-- 5. ADMINISTRACION -->
                <button type="button" class="neon-nav-item nav-admin ${active === 'admin' ? 'active' : ''}" onclick="AppNavbar.onNavigate('admin')">
                    <div class="neon-nav-icon">${this.icons.admin}</div>
                    <span class="neon-nav-label">Administración</span>
                </button>

                <!-- 6. PERFIL -->
                <button type="button" class="neon-nav-item nav-perfil ${active === 'perfil' ? 'active' : ''}" onclick="AppNavbar.onNavigate('perfil')">
                    <div class="neon-nav-icon">${this.icons.perfil}</div>
                    <span class="neon-nav-label">Perfil</span>
                </button>

                <!-- 7. SALIR -->
                <button type="button" class="neon-nav-item nav-salir" onclick="AppNavbar.onNavigate('salir')">
                    <div class="neon-nav-icon">${this.icons.salir}</div>
                    <span class="neon-nav-label">Salir</span>
                </button>
            </div>
        `;

        document.body.appendChild(nav);
    },

    // Enrutador directo a VISTAS DEDICADAS CON RUTAS ABSOLUTAS
    onNavigate: function(menuKey) {
        switch (menuKey) {
            case 'lobby':
                if (window.location.pathname === '/views/lobby/lobby.html') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    window.location.href = '/views/lobby/lobby.html';
                }
                break;

            case 'rankings':
                if (window.location.pathname === '/views/rankings/rankings.html') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    window.location.href = '/views/rankings/rankings.html';
                }
                break;

            case 'duels':
                if (window.location.pathname === '/views/duels/menu.html') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    window.location.href = '/views/duels/menu.html';
                }
                break;

            case 'tienda':
                if (window.location.pathname === '/views/shop/shop.html') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    window.location.href = '/views/shop/shop.html';
                }
                break;

            case 'admin':
                if (window.location.pathname === '/views/admin/admin.html') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    window.location.href = '/views/admin/admin.html';
                }
                break;

            case 'perfil':
                if (window.location.pathname === '/views/profile/profile.html') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    window.location.href = '/views/profile/profile.html';
                }
                break;

            case 'salir':
                this.executeLogout();
                break;
        }
    },

    executeLogout: function() {
        if (typeof logoutToLogin === 'function') {
            logoutToLogin();
        } else if (typeof Session !== 'undefined' && Session.clearUser) {
            Session.clearUser();
            window.location.href = '/views/login/login.html';
        } else {
            localStorage.clear();
            window.location.href = '/views/login/login.html';
        }
    }
};

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AppNavbar.init());
} else {
    AppNavbar.init();
}
