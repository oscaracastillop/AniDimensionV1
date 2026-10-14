/**
 * Ani-Dimension: Gestor Oficial de Sesión (Web & APK Móvil)
 * 100% Basado en Base de Datos SQL Server & Sesión Única Antifraude
 */
(function() {
    try {
        if (typeof localStorage !== 'undefined') {
            const keysToRemove = [
                'ad_user_coins', 'ad_user_starships',
                'ad_user_inventory_v1', 'ad_user_deck_v1', 'ad_user_avatars_v1', 'ad_active_avatar_v1',
                'ad_user_playmats_v1', 'ad_user_sleeves_v1', 'ad_user_mailbox_v1', 'ad_audio_muted',
                'ad_bgm_volume', 'ad_sfx_volume', 'ad_packs_overrides_v1', 'ad_pack_overrides_v2'
            ];
            keysToRemove.forEach(k => localStorage.removeItem(k));
        }
    } catch(e) {}

    if (!window.showAniModal && typeof document !== 'undefined' && !document.querySelector('script[src*="modal-utils.js"]')) {
        const s = document.createElement('script');
        s.src = '/js/core/modal-utils.js';
        document.head.appendChild(s);
    }
})();

var Session = window.Session || {
    STORAGE_KEY: 'ani_dimension_user',
    _heartbeatTimer: null,
    _isTerminating: false,

    saveUser(userData) {
        if (!userData) return;
        try {
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(userData));
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(userData));
            }
        } catch (e) {}
    },

    setUser(userData) {
        return this.saveUser(userData);
    },

    getUser() {
        try {
            let sess = sessionStorage.getItem(this.STORAGE_KEY);
            if (!sess && typeof localStorage !== 'undefined') {
                sess = localStorage.getItem(this.STORAGE_KEY);
                if (sess) {
                    sessionStorage.setItem(this.STORAGE_KEY, sess);
                }
            }
            if (sess) return JSON.parse(sess);
            return null;
        } catch (e) {
            console.error('[SESSION ERROR]', e);
            return null;
        }
    },

    getUserId() {
        const u = this.getUser();
        return u ? (u.id || u.user_id || u.Id || 0) : 0;
    },

    getSessionToken() {
        const u = this.getUser();
        return u ? (u.sessionToken || '') : '';
    },

    isLoggedIn() {
        const u = this.getUser();
        return u !== null && (u.id !== undefined || u.user_id !== undefined || u.Id !== undefined);
    },

    isAdmin() {
        const u = this.getUser();
        return Boolean(u && (u.isAdmin === true || u.IsAdmin === 1 || (u.username && u.username.toLowerCase() === 'admin')));
    },

    getUsername() {
        const u = this.getUser();
        return u ? (u.username || 'Duelista') : 'Invitado';
    },

    getStarships() {
        const u = this.getUser();
        return u ? (parseInt(u.starships ?? u.Starships ?? 0, 10)) : 0;
    },

    setStarships(amount) {
        const num = parseInt(amount, 10) || 0;
        const u = this.getUser();
        if (u) {
            u.starships = num;
            u.Starships = num;
            this.saveUser(u);
        }
        try {
            window.dispatchEvent(new CustomEvent('starships_updated', { detail: { starships: num } }));
        } catch (e) {}
        return num;
    },

    addStarships(amount) {
        const current = this.getStarships();
        const add = parseInt(amount, 10) || 0;
        return this.setStarships(current + add);
    },

    getAvatarCode() {
        const u = this.getUser();
        return u ? (u.avatarActivoId || u.AvatarActivoId || 'AVA-002') : 'AVA-002';
    },

    async logout(redirectPath = '/views/login/login.html') {
        const u = this.getUser();
        if (u) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-user-id': this.getUserId(), 'x-session-token': this.getSessionToken() },
                    body: JSON.stringify({ userId: this.getUserId(), username: u.username })
                });
            } catch (e) {}
        }
        this.clearUser();
        if (redirectPath) {
            window.location.href = redirectPath;
        }
    },

    clearUser() {
        sessionStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.STORAGE_KEY);
        // Limpiar todas las llaves heredadas
        localStorage.removeItem('ad_user_coins');
        localStorage.removeItem('ad_user_starships');
        localStorage.removeItem('ad_user_inventory_v1');
        localStorage.removeItem('ad_user_deck_v1');
        localStorage.removeItem('ad_user_avatars_v1');
        localStorage.removeItem('ad_active_avatar_v1');
        localStorage.removeItem('ad_user_playmats_v1');
        localStorage.removeItem('ad_user_sleeves_v1');
        localStorage.removeItem('ad_user_mailbox_v1');
    },

    /**
     * Aplica inmediatamente los datos oficiales de la base de datos a los elementos del DOM
     */
    applyImmediateUI() {
        const u = this.getUser();
        const stars = this.getStarships();

        // 1. Balance de StarShips en todas las vistas
        document.querySelectorAll('#shop-user-coins, .ad-user-starships-val').forEach(el => {
            el.textContent = `⭐ ${stars.toLocaleString()}`;
        });

        const lobbyStarsEl = document.getElementById('lobby-starships');
        if (lobbyStarsEl) lobbyStarsEl.textContent = `⭐ ${stars.toLocaleString()} STARSHIPS`;

        const profCoinsEl = document.getElementById('prof-coins');
        if (profCoinsEl) profCoinsEl.textContent = `⭐ ${stars.toLocaleString()}`;

        // 2. Nombres y niveles
        if (u) {
            const uname = u.username || 'Duelista';
            const ulvl = u.nivel || u.Nivel || 1;

            const lobbyUserEl = document.getElementById('lobby-username');
            if (lobbyUserEl) lobbyUserEl.textContent = uname;

            const profUserEl = document.getElementById('prof-username');
            if (profUserEl) profUserEl.textContent = uname;

            const lobbyLvlEl = document.getElementById('lobby-level');
            if (lobbyLvlEl) lobbyLvlEl.textContent = `Nv. ${ulvl}`;

            const profLvlEl = document.getElementById('prof-level');
            if (profLvlEl) profLvlEl.textContent = `Nv. ${ulvl}`;
        }
    },

    /**
     * Sincroniza en tiempo real los datos del usuario con SQL Server y valida sesión única
     */
    async syncWithServer() {
        if (!this.isLoggedIn() || this._isTerminating) return;

        const uid = this.getUserId();
        const token = this.getSessionToken();

        try {
            const res = await fetch(`/api/auth/me?userId=${uid}`, {
                headers: { 'x-user-id': String(uid), 'x-session-token': token }
            });

            if (res.status === 401 || res.status === 403 || res.status === 409) {
                this.handleSessionTerminated('Tu sesión ha sido finalizada porque se inició sesión en otro dispositivo.');
                return;
            }

            if (!res.ok) return;

            const data = await res.json();
            if (data && data.success && data.user) {
                const fresh = data.user;

                // Verificación de token de sesión única
                if (token && fresh.activeSessionToken && token !== fresh.activeSessionToken) {
                    this.handleSessionTerminated('Tu sesión ha sido transferida a otro dispositivo.');
                    return;
                }

                const current = this.getUser() || {};
                const merged = { ...current, ...fresh, starships: fresh.starships ?? fresh.Starships };
                this.saveUser(merged);
                this.applyImmediateUI();
                window.dispatchEvent(new CustomEvent('ad-user-synced', { detail: merged }));
            }
        } catch (e) {
            // Silencioso en desconexión temporal
        }
    },

    /**
     * Termina la sesión inmediatamente y redirige a login
     */
    handleSessionTerminated(reasonMessage) {
        if (this._isTerminating) return;
        this._isTerminating = true;

        if (this._heartbeatTimer) clearInterval(this._heartbeatTimer);
        this.clearUser();

        const currentPath = window.location.pathname.toLowerCase();
        if (currentPath.includes('login.html') || currentPath.includes('register.html')) {
            this._isTerminating = false;
            return;
        }

        console.warn('[SESSION TERMINATED]', reasonMessage);
        window.location.href = '/views/login/login.html?reason=' + encodeURIComponent(reasonMessage || 'session_expired');
    },

    startSessionHeartbeat() {
        if (this._heartbeatTimer) clearInterval(this._heartbeatTimer);
        const currentPath = window.location.pathname.toLowerCase();
        if (currentPath.includes('login.html') || currentPath.includes('register.html')) {
            return;
        }
        // Verificar validez de sesión única cada 6 segundos
        this._heartbeatTimer = setInterval(() => {
            if (this.isLoggedIn()) {
                this.syncWithServer();
            }
        }, 6000);
    },

    requireAuth(loginPath = '/views/login/login.html') {
        if (new URLSearchParams(window.location.search).get('preview') === '1') return true;
        if (!this.isLoggedIn()) {
            window.location.href = loginPath;
            return false;
        }
        return true;
    },

    requireAdmin(lobbyPath = '/views/lobby/lobby.html') {
        if (!this.requireAuth()) return false;
        if (!this.isAdmin()) {
            alert('Acceso Denegado: No tienes permisos de Administrador.');
            window.location.href = lobbyPath;
            return false;
        }
        return true;
    }
};

window.Session = Session;

// Inicializar y sincronizar
Session.applyImmediateUI();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        Session.applyImmediateUI();
        Session.syncWithServer();
        Session.startSessionHeartbeat();
    });
} else {
    Session.applyImmediateUI();
    Session.syncWithServer();
    Session.startSessionHeartbeat();
}
