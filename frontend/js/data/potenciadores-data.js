/**
 * ANI-DIMENSION: GESTIÓN DE POTENCIADORES DE AVATAR Y BUZÓN DE DUELISTA
 * 100% RESPALDADO EN SQL SERVER (dbo.PotenciadoresCatalog, dbo.UserAvatarPotenciadores)
 * CERO ALMACENAMIENTO DE DATOS EN LOCALSTORAGE
 */
(function(window) {
    'use strict';

    const PotenciadoresManager = {
        _cachedPotenciadores: [],
        _syncPromise: null,

        /**
         * Sincroniza catálogo de potenciadores directamente desde SQL Server
         */
        syncFromServer: async function(force = false) {
            if (this._syncPromise && !force) return this._syncPromise;

            this._syncPromise = (async () => {
                try {
                    const res = await fetch('/api/game/shop/potenciadores');
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success && Array.isArray(data.potenciadores)) {
                            this._cachedPotenciadores = data.potenciadores;
                            if (typeof window.renderPotenciadoresShopCards === 'function') {
                                window.renderPotenciadoresShopCards();
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[POTENCIADORES SQL SYNC NOTICE]', e.message);
                }
                return this._cachedPotenciadores;
            })();

            return this._syncPromise;
        },

        /**
         * Obtiene la lista de potenciadores desde memoria (sincronizada desde SQL)
         */
        getPotenciadores: function() {
            if (!this._cachedPotenciadores || this._cachedPotenciadores.length === 0) {
                this.syncFromServer();
            }
            return this._cachedPotenciadores;
        },

        /**
         * Alias esperado por la vista de tienda
         */
        getActivePotenciadores: function() {
            return this.getPotenciadores().filter(p => p.active !== false);
        },

        /**
         * Obtiene un potenciador específico por su código
         */
        getPotenciadorByCode: function(code) {
            if (!code) return null;
            const clean = code.toString().toUpperCase().trim();
            const list = this.getPotenciadores();
            return list.find(p => p.code === clean) || null;
        },

        /**
         * Aplica un potenciador a un avatar a través del API respaldado por Stored Procedure ACID
         */
        applyPotenciadorToAvatar: async function(avatarCode, potenciadorCode) {
            const uid = window.Session ? window.Session.getUserId() : 0;
            if (!uid) {
                return { success: false, message: 'Debes iniciar sesión.' };
            }

            try {
                const res = await fetch('/api/game/avatar/apply-potenciador', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': String(uid),
                        'x-session-token': window.Session.getSessionToken()
                    },
                    body: JSON.stringify({
                        userId: uid,
                        avatarCode: avatarCode,
                        potenciadorCode: potenciadorCode
                    })
                });

                const data = await res.json();
                if (data.success && window.AvatarsManager) {
                    window.AvatarsManager.syncFromServer(true);
                }
                return data;
            } catch (err) {
                return { success: false, message: 'Error de conexión con el servidor.' };
            }
        }
    };

    if (typeof window !== 'undefined') {
        window.PotenciadoresManager = PotenciadoresManager;
        PotenciadoresManager.syncFromServer();
    }
})(window);
