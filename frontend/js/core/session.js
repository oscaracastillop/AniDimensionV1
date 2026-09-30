/**
 * Ani-Dimension: Gestor de Sesión y Almacenamiento Local (Web & APK Móvil)
 * Inicialización Automática de Avatar por Defecto (AVA-002) y Deck de Inicio (40 Cartas)
 */
const Session = {
    STORAGE_KEY: 'ani_dimension_user',

    saveUser(userData) {
        if (!userData) return;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(userData));
        this.initAccountDefaults();
    },

    getUser() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('[SESSION ERROR] Error al parsear usuario:', e);
            return null;
        }
    },

    isLoggedIn() {
        const u = this.getUser();
        return u !== null && (u.id !== undefined || u.user_id !== undefined || u.username !== undefined);
    },

    getUsername() {
        const u = this.getUser();
        return u ? (u.username || 'Duelista') : 'Invitado';
    },

    clearUser() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    updateUserNick(newNick) {
        const u = this.getUser();
        if (u) {
            u.username = newNick;
            this.saveUser(u);
        }
    },

    updateBalances(balances) {
        const u = this.getUser();
        if (u) {
            u.balances = { ...u.balances, ...balances };
            this.saveUser(u);
        }
    },

    initAccountDefaults() {
        // Garantizar Avatar AVA-002 por defecto
        if (window.AvatarsManager) {
            window.AvatarsManager.addUserAvatar('AVA-002');
            window.AvatarsManager.setActiveAvatar('AVA-002');
        } else {
            localStorage.setItem('ad_user_avatars_v1', JSON.stringify(['AVA-002']));
            localStorage.setItem('ad_active_avatar_v1', 'AVA-002');
        }

        // Garantizar Deck Inicial de 40 cartas e Inventario Inicial
        if (window.DeckManager && typeof window.DeckManager.initializeNewUserAccount === 'function') {
            window.DeckManager.initializeNewUserAccount();
        }
    },

    requireAuth(loginPath = '/views/login/login.html') {
        if (new URLSearchParams(window.location.search).get('preview') === '1') return true;
        if (!this.isLoggedIn()) {
            window.location.href = loginPath;
            return false;
        }
        return true;
    },

    requireGuest(lobbyPath = '/views/lobby/lobby.html') {
        if (this.isLoggedIn()) {
            window.location.href = lobbyPath;
            return false;
        }
        return true;
    }
};

window.Session = Session;
window.currentUser = Session.getUser() || { id: 999, username: 'Admin', role: 'admin' };

// Configurar balance inicial de admin a 9,999,999 StarShips
if (!localStorage.getItem("ad_user_coins") || parseInt(localStorage.getItem("ad_user_coins")) < 9999999) {
    localStorage.setItem("ad_user_coins", "9999999");
}

// Inicialización automática de v4 con avatar AVA-002 y Deck inicial de 40 cartas
if (!localStorage.getItem('ad_inventory_reset_v4')) {
    localStorage.setItem('ad_user_avatars_v1', JSON.stringify(['AVA-002']));
    localStorage.setItem('ad_active_avatar_v1', 'AVA-002');
    
    // Forzar inicialización de Starter Deck de 40 cartas
    setTimeout(() => {
        if (window.DeckManager && typeof window.DeckManager.initializeNewUserAccount === 'function') {
            window.DeckManager.initializeNewUserAccount();
        }
    }, 100);

    localStorage.setItem('ad_inventory_reset_v4', 'true');
}
