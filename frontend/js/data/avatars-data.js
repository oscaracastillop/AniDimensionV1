/**
 * ANI-DIMENSION: GESTIÓN DE AVATARES Y POTENCIADORES DE DUELISTA
 * 100% CONECTADO A SQL SERVER (dbo.AvatarsCatalog, dbo.UserAvatars, dbo.UserAvatarPotenciadores)
 * CERO ALMACENAMIENTO DE CATÁLOGOS O COMPRAS EN LOCALSTORAGE
 */
(function(window) {
    'use strict';

    const AvatarsManager = {
        _cachedAvatars: [],
        _serverOwnedAvatars: ['AVA-002'],
        _userAvatarStatsMap: {},
        _activeAvatar: 'AVA-002',
        _syncPromise: null,

        /**
         * Sincroniza catálogo de avatares y pertenencias directamente desde SQL Server
         */
        syncFromServer: async function(force = false) {
            if (this._syncPromise && !force) return this._syncPromise;

            this._syncPromise = (async () => {
                const uid = window.Session ? window.Session.getUserId() : 0;
                try {
                    const headers = {};
                    if (uid && window.Session) {
                        headers['x-user-id'] = String(uid);
                        headers['x-session-token'] = window.Session.getSessionToken();
                    }

                    // 1. Obtener catálogo público de avatares desde SQL Server
                    const catRes = await fetch(`/api/game/shop/avatars${uid ? `?userId=${uid}` : ''}`, { headers });
                    if (catRes.ok) {
                        const catData = await catRes.json();
                        if (catData.success && Array.isArray(catData.avatars)) {
                            this._cachedAvatars = catData.avatars;
                        }
                    }

                    // 2. Si el usuario está autenticado, obtener avatares y estadísticas potenciadas desde dbo.UserAvatars
                    if (uid) {
                        const userRes = await fetch(`/api/game/user/avatars?userId=${uid}`, { headers });
                        if (userRes.ok) {
                            const uData = await userRes.json();
                            if (uData.success && Array.isArray(uData.userAvatars)) {
                                this._serverOwnedAvatars = [];
                                this._userAvatarStatsMap = {};

                                uData.userAvatars.forEach(av => {
                                    const code = av.code.toUpperCase().trim();
                                    this._serverOwnedAvatars.push(code);
                                    this._userAvatarStatsMap[code] = {
                                        name: av.name,
                                        exp_boost: av.exp_boost,
                                        starships_boost: av.starships_boost,
                                        luck_boost: av.luck_boost,
                                        applied_potenciadores: av.applied_potenciadores || []
                                    };
                                    if (av.is_active) {
                                        this._activeAvatar = code;
                                    }
                                });

                                if (!this._serverOwnedAvatars.includes('AVA-002')) {
                                    this._serverOwnedAvatars.push('AVA-002');
                                }
                            }
                        }
                    }
                    if (typeof window.renderShopAvatarsGrid === 'function') {
                        window.renderShopAvatarsGrid();
                    }
                    if (typeof window.loadAdminAvatarsList === 'function') {
                        window.loadAdminAvatarsList();
                    }
                    if (typeof window.renderModalAvatarsGrid === 'function') {
                        window.renderModalAvatarsGrid();
                    }
                    window.dispatchEvent(new CustomEvent('avatars:synced', { detail: this._cachedAvatars }));
                } catch (e) {
                    console.warn('[AVATARS SQL SYNC NOTICE]', e.message);
                }
            })();

            return this._syncPromise;
        },

        /**
         * Obtiene el siguiente código secuencial disponible (ej. AVA-351)
         */
        getNextCode: function() {
            const list = this.getAvatars() || [];
            let maxNum = 0;
            list.forEach(a => {
                if (a.code && a.code.startsWith('AVA-')) {
                    const n = parseInt(a.code.replace('AVA-', ''), 10);
                    if (!isNaN(n) && n > maxNum) maxNum = n;
                }
            });
            return `AVA-${String(maxNum + 1).padStart(3, '0')}`;
        },

        /**
         * Crear avatar en SQL Server (Administración)
         */
        createAvatar: async function(payload) {
            try {
                const uid = window.Session ? window.Session.getUserId() : 0;
                const headers = { 'Content-Type': 'application/json' };
                if (uid && window.Session) {
                    headers['x-user-id'] = String(uid);
                    headers['x-session-token'] = window.Session.getSessionToken();
                }

                const res = await fetch('/api/admin/avatars', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    await this.syncFromServer(true);
                    return true;
                }
                return false;
            } catch (e) {
                console.error('[CREATE AVATAR ERROR]', e);
                return false;
            }
        },

        /**
         * Actualizar avatar existente en SQL Server (Administración)
         */
        updateAvatar: async function(code, payload) {
            try {
                const uid = window.Session ? window.Session.getUserId() : 0;
                const headers = { 'Content-Type': 'application/json' };
                if (uid && window.Session) {
                    headers['x-user-id'] = String(uid);
                    headers['x-session-token'] = window.Session.getSessionToken();
                }

                const res = await fetch('/api/admin/avatars', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ ...payload, code })
                });
                const data = await res.json();
                if (data.success) {
                    await this.syncFromServer(true);
                    return true;
                }
                return false;
            } catch (e) {
                console.error('[UPDATE AVATAR ERROR]', e);
                return false;
            }
        },

        /**
         * Alternar estado activo/inactivo de un avatar en SQL Server
         */
        toggleAvatar: async function(code) {
            try {
                const uid = window.Session ? window.Session.getUserId() : 0;
                const headers = { 'Content-Type': 'application/json' };
                if (uid && window.Session) {
                    headers['x-user-id'] = String(uid);
                    headers['x-session-token'] = window.Session.getSessionToken();
                }

                const res = await fetch(`/api/admin/avatars/${encodeURIComponent(code)}/toggle`, {
                    method: 'PUT',
                    headers
                });
                const data = await res.json();
                if (data.success) {
                    const found = this._cachedAvatars.find(a => a.code === code);
                    if (found) found.active = data.isActive;
                    return true;
                }
                return false;
            } catch (e) {
                console.error('[TOGGLE AVATAR ERROR]', e);
                return false;
            }
        },

        /**
         * Eliminar avatar de SQL Server (Administración)
         */
        deleteAvatar: async function(code) {
            try {
                const uid = window.Session ? window.Session.getUserId() : 0;
                const headers = { 'Content-Type': 'application/json' };
                if (uid && window.Session) {
                    headers['x-user-id'] = String(uid);
                    headers['x-session-token'] = window.Session.getSessionToken();
                }

                const res = await fetch(`/api/admin/avatars/${encodeURIComponent(code)}`, {
                    method: 'DELETE',
                    headers
                });
                const data = await res.json();
                if (data.success) {
                    this._cachedAvatars = this._cachedAvatars.filter(a => a.code !== code);
                    return true;
                }
                return false;
            } catch (e) {
                console.error('[DELETE AVATAR ERROR]', e);
                return false;
            }
        },

        /**
         * Obtiene la lista completa de avatares desde SQL Server
         */
        getAvatars: function() {
            if (!this._cachedAvatars || this._cachedAvatars.length === 0) {
                this.syncFromServer();
            }
            return this._cachedAvatars;
        },

        /**
         * Obtiene solo los avatares activos para la tienda
         */
        getActiveAvatars: function() {
            return this.getAvatars().filter(a => a.active !== false && a.code !== 'AVA-001');
        },

        /**
         * Obtiene un avatar específico por su código AVA-XXX con sus estadísticas actualizadas desde SQL
         */
        getAvatarByCode: function(code) {
            if (!code) return null;
            const cleanCode = code.toString().toUpperCase().trim();
            const list = this.getAvatars();
            const avatar = list.find(a => a.code === cleanCode);

            if (!avatar) return null;

            if (this._userAvatarStatsMap && this._userAvatarStatsMap[cleanCode]) {
                const s = this._userAvatarStatsMap[cleanCode];
                return {
                    ...avatar,
                    exp_boost: s.exp_boost !== undefined ? s.exp_boost : avatar.exp_boost,
                    starships_boost: s.starships_boost !== undefined ? s.starships_boost : avatar.starships_boost,
                    luck_boost: s.luck_boost !== undefined ? s.luck_boost : avatar.luck_boost,
                    applied_potenciadores: s.applied_potenciadores || []
                };
            }

            return { ...avatar };
        },

        /**
         * Obtiene los códigos de avatares poseídos por el usuario desde SQL Server
         */
        getUserAvatars: function() {
            return (this._serverOwnedAvatars && this._serverOwnedAvatars.length > 0)
                ? this._serverOwnedAvatars
                : ['AVA-002'];
        },

        /**
         * Verifica si el usuario posee un avatar
         */
        isAvatarOwned: function(code) {
            if (!code) return false;
            const owned = this.getUserAvatars();
            return owned.includes(code.toString().toUpperCase().trim());
        },

        /**
         * Obtiene el código del avatar equipado del usuario
         */
        getActiveAvatarCode: function() {
            const u = window.Session ? window.Session.getUser() : null;
            return (u && (u.avatarActivoId || u.avatar || u.Avatar)) || this._activeAvatar || 'AVA-002';
        },

        /**
         * Obtiene el objeto completo del avatar equipado del usuario
         */
        getActiveAvatar: function() {
            const code = this.getActiveAvatarCode();
            return this.getAvatarByCode(code) || this.getAvatarByCode('AVA-002');
        },

        /**
         * Equipar avatar en SQL Server
         */
        setActiveAvatar: async function(code) {
            if (!code) return false;
            const cleanCode = code.toString().toUpperCase().trim();

            const uid = window.Session ? window.Session.getUserId() : 0;
            if (uid) {
                try {
                    const res = await fetch('/api/game/cosmetics/equip', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-user-id': String(uid),
                            'x-session-token': window.Session.getSessionToken()
                        },
                        body: JSON.stringify({
                            userId: uid,
                            itemType: 'AVATAR',
                            itemCode: cleanCode
                        })
                    });
                    const data = await res.json();
                    if (!res.ok || !data.success) {
                        console.error('[EQUIP AVATAR SQL ERROR]', data.message);
                        return false;
                    }
                } catch(e) {
                    console.error('[EQUIP AVATAR NETWORK ERROR]', e);
                    return false;
                }
            }

            this._activeAvatar = cleanCode;

            if (window.Session) {
                const u = window.Session.getUser();
                if (u) {
                    u.avatarActivoId = cleanCode;
                    u.AvatarActivoId = cleanCode;
                    u.avatar = cleanCode;
                    window.Session.saveUser(u);
                }
            }
            return true;
        },

        addUserAvatar: function(code) {
            const c = code.toString().toUpperCase().trim();
            if (!this._serverOwnedAvatars.includes(c)) {
                this._serverOwnedAvatars.push(c);
            }
        },

        buyAvatar: function(code) {
            this.addUserAvatar(code);
        }
    };

    // Auto-iniciar sincronización al cargar script
    if (typeof window !== 'undefined') {
        window.AvatarsManager = AvatarsManager;
        AvatarsManager.syncFromServer();
    }
})(window);
