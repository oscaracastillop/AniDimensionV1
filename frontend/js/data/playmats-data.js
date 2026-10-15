/**
 * ANI-DIMENSION: GESTIÓN DE TAPETES DE DUELO (PLAYMATS)
 * SOPORTE CRUD ADMIN: CREACIÓN, EDICIÓN DEDICADA, CARGA DE IMÁGENES (LOCAL O WEB),
 * PRECIOS EN ⭐ STARSHIPS Y $ USD, BANNERS DE OFERTA Y VITALICIOS (SIN CADUCIDAD).
 * INTEGRACIÓN CON TIENDA, PERFIL Y DUELOS (P1 Y P2 PVP).
 */
(function(window) {
    const STORAGE_KEY_PLAYMATS = 'ad_playmats_data_v2';
    const STORAGE_KEY_USER_PLAYMATS = 'ad_user_playmats_v1';
    const STORAGE_KEY_ACTIVE_PLAYMAT = 'ad_active_playmat_v1';

    function generateInitialPlaymats() {
        return [
            {
                code: 'MAT-001',
                name: 'Tapete Dragón Blanco de Ojos Azules Cósmico',
                description: 'Tapete ultra-panorámico del Dragón Blanco de Ojos Azules con vórtice de relámpagos y borde negro sólido.',
                price: 80000,
                currency: 'STARSHIPS',
                image: '/assets/images/playmats/MAT-001.jpg',
                offer_text: 'POPULAR',
                active: true
            },
            {
                code: 'MAT-002',
                name: 'Tapete Maga Oscura Hechicera Astral',
                description: 'Tapete ultra-panorámico del Santuario Arcano de la Maga Oscura con orbes galácticos y borde negro sólido.',
                price: 80000,
                currency: 'STARSHIPS',
                image: '/assets/images/playmats/MAT-002.jpg',
                offer_text: 'NUEVO',
                active: true
            }
        ];
    }

    const PlaymatsManager = {
        /**
         * Obtiene la lista completa de tapetes
         */
        _cachedPlaymats: generateInitialPlaymats(),
        _syncPromise: null,

        /**
         * Obtiene la lista completa de tapetes desde memoria (sincronizada desde SQL Server)
         */
        getPlaymats: function() {
            if (!this._cachedPlaymats || this._cachedPlaymats.length === 0) {
                this._cachedPlaymats = generateInitialPlaymats();
                this.syncFromServer();
            }
            return this._cachedPlaymats;
        },

        /**
         * Sincroniza catálogo directamente desde SQL Server
         */
        syncFromServer: async function(force = false) {
            if (this._syncPromise && !force) return this._syncPromise;
            this._syncPromise = (async () => {
                try {
                    const res = await fetch('/api/game/shop/playmats');
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success && Array.isArray(data.playmats) && data.playmats.length > 0) {
                            this._cachedPlaymats = data.playmats;
                            return data.playmats;
                        }
                    }
                } catch (e) {
                    console.warn('[PLAYMATS SYNC ERROR]', e.message);
                }
                return this._cachedPlaymats;
            })();
            return this._syncPromise;
        },

        /**
         * Actualiza en memoria el array de tapetes
         */
        savePlaymats: function(playmats) {
            if (!Array.isArray(playmats)) return false;
            this._cachedPlaymats = playmats;
            return true;
        },

        /**
         * Obtiene un tapete específico por su código MAT-XXX
         */
        getPlaymatByCode: function(code) {
            if (!code) return null;
            const list = this.getPlaymats();
            return list.find(p => p.code === code) || null;
        },

        /**
         * Genera el siguiente código secuencial disponible (MAT-001, MAT-002, ...)
         */
        getNextCode: function() {
            const list = this.getPlaymats();
            let maxNum = 0;
            list.forEach(p => {
                if (p.code && p.code.startsWith('MAT-')) {
                    const num = parseInt(p.code.replace('MAT-', ''), 10);
                    if (!isNaN(num) && num > maxNum) maxNum = num;
                }
            });
            const nextNum = maxNum + 1;
            return 'MAT-' + String(nextNum).padStart(3, '0');
        },

        /**
         * Crea un nuevo tapete
         */
        createPlaymat: async function(data) {
            const list = this.getPlaymats();
            const newCode = data.code || this.getNextCode();

            const newPlaymat = {
                code: newCode,
                name: (data.name || newCode).trim(),
                description: (data.description || '').trim(),
                image: data.image || `/assets/images/playmats/${newCode}.jpg`,
                currency: (data.currency || 'STARSHIPS').toUpperCase(),
                price: parseFloat(data.price !== undefined ? data.price : 50000),
                offer_text: (data.offer_text || '').trim().toUpperCase(),
                active: data.active !== false
            };

            const existingIdx = list.findIndex(p => p.code === newCode);
            if (existingIdx >= 0) {
                list[existingIdx] = newPlaymat;
            } else {
                list.push(newPlaymat);
            }

            this.savePlaymats(list);

            // Persistir en servidor
            try {
                await fetch('/api/admin/playmats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newPlaymat)
                });
            } catch (e) {
                console.error('[PLAYMAT CREATE SERVER SYNC ERROR]', e);
            }

            return newPlaymat;
        },

        /**
         * Actualiza un tapete existente
         */
        updatePlaymat: async function(code, data) {
            const list = this.getPlaymats();
            const idx = list.findIndex(p => p.code === code);
            if (idx === -1) return false;

            list[idx] = {
                ...list[idx],
                name: (data.name !== undefined ? data.name : list[idx].name).trim(),
                description: (data.description !== undefined ? data.description : (list[idx].description || '')).trim(),
                image: data.image !== undefined ? data.image : list[idx].image,
                currency: (data.currency !== undefined ? data.currency : (list[idx].currency || 'STARSHIPS')).toUpperCase(),
                price: parseFloat(data.price !== undefined ? data.price : list[idx].price),
                offer_text: (data.offer_text !== undefined ? data.offer_text : (list[idx].offer_text || '')).trim().toUpperCase(),
                active: data.active !== undefined ? Boolean(data.active) : list[idx].active
            };

            this.savePlaymats(list);

            // Persistir en servidor
            try {
                await fetch('/api/admin/playmats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(list[idx])
                });
            } catch (e) {
                console.error('[PLAYMAT UPDATE SERVER SYNC ERROR]', e);
            }

            return list[idx];
        },

        /**
         * Alterna el estado activo / inactivo
         */
        togglePlaymat: async function(code) {
            const list = this.getPlaymats();
            const item = list.find(p => p.code === code);
            if (!item) return false;
            item.active = !item.active;
            this.savePlaymats(list);

            try {
                await fetch('/api/admin/playmats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                });
            } catch (e) {}

            return item.active;
        },

        /**
         * Elimina un tapete
         */
        deletePlaymat: async function(code) {
            let list = this.getPlaymats();
            list = list.filter(p => p.code !== code);
            this.savePlaymats(list);

            try {
                await fetch(`/api/admin/playmats/${encodeURIComponent(code)}`, {
                    method: 'DELETE'
                });
            } catch (e) {}

            return true;
        },

        /**
         * Subir imagen al servidor
         */
        uploadImage: async function(code, imageBase64, extension = 'jpg') {
            try {
                const res = await fetch('/api/admin/playmats/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, imageBase64, extension })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.url) {
                        return data.url;
                    }
                }
            } catch (e) {
                console.error('[PLAYMAT IMAGE UPLOAD ERROR]', e);
            }
            return null;
        },

        _serverOwnedPlaymats: null,
        _activePlaymat: null,

        /**
         * Sincroniza catálogo y posesiones desde la base de datos backend
         */
        syncFromServer: async function() {
            const uid = window.Session ? window.Session.getUserId() : 0;
            if (uid) {
                try {
                    const res = await fetch(`/api/game/cosmetics?userId=${uid}`, {
                        headers: { 'x-user-id': String(uid), 'x-session-token': window.Session.getSessionToken() }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success && Array.isArray(data.playmats)) {
                            this._serverOwnedPlaymats = data.playmats;
                            this._activePlaymat = data.activePlaymat || null;
                        }
                    }
                } catch (e) {}
            }

            try {
                const res = await fetch('/api/admin/playmats');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.playmats) && data.playmats.length > 0) {
                        return data.playmats;
                    }
                }
            } catch (e) {
                console.warn('[PLAYMATS SYNC ERROR]', e);
            }
            return this.getPlaymats();
        },

        /**
         * Tapetes activos para la tienda
         */
        getActivePlaymats: function() {
            return this.getPlaymats().filter(p => p.active !== false);
        },

        /**
         * Obtiene los códigos de tapetes comprados / poseídos por el usuario desde SQL Server
         */
        getUserPlaymats: function() {
            const u = window.Session ? window.Session.getUser() : null;
            const isAdmin = Boolean(u && (u.isAdmin || u.role === 'admin' || (u.username && u.username.toLowerCase() === 'admin')));

            if (this._serverOwnedPlaymats && Array.isArray(this._serverOwnedPlaymats)) {
                return this._serverOwnedPlaymats;
            }

            if (isAdmin) {
                const allCodes = this.getPlaymats().map(p => p.code);
                this._serverOwnedPlaymats = allCodes;
                return allCodes;
            }

            return [];
        },

        /**
         * Registra la posesión de un tapete
         */
        addUserPlaymat: function(code) {
            if (!this._serverOwnedPlaymats) this._serverOwnedPlaymats = [];
            if (!this._serverOwnedPlaymats.includes(code)) {
                this._serverOwnedPlaymats.push(code);
            }
        },

        buyPlaymat: async function(code) {
            this.addUserPlaymat(code);
            const uid = window.Session ? window.Session.getUserId() : 0;
            if (uid) {
                const mat = this.getPlaymatByCode(code);
                try {
                    await fetch('/api/game/cosmetics/buy', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-user-id': String(uid),
                            'x-session-token': window.Session.getSessionToken()
                        },
                        body: JSON.stringify({
                            userId: uid,
                            itemType: 'PLAYMAT',
                            itemCode: code,
                            costStarships: (mat && mat.price) || 0
                        })
                    });
                } catch(e) {}
            }
        },

        isPlaymatOwned: function(code) {
            const owned = this.getUserPlaymats();
            return owned.includes(code);
        },

        /**
         * Obtiene el código del tapete equipado / activo del usuario
         */
        getActivePlaymatCode: function() {
            const u = window.Session ? window.Session.getUser() : null;
            return (u && (u.matActivoId || u.playmat || u.Playmat)) || this._activePlaymat || null;
        },

        /**
         * Obtiene el objeto completo del tapete equipado del usuario
         */
        getActivePlaymat: function() {
            const code = this.getActivePlaymatCode();
            if (!code) return null;
            return this.getPlaymatByCode(code);
        },

        /**
         * Establece el tapete activo del usuario directamente en SQL Server (o desactiva si es vacío/'NONE')
         */
        setActivePlaymat: async function(code) {
            const isDeactivating = (!code || code === 'NONE' || code === 'DEFAULT' || code === 'null');
            const targetCode = isDeactivating ? null : code;

            if (!isDeactivating) {
                this.addUserPlaymat(targetCode);
            }
            this._activePlaymat = targetCode;


            const uid = window.Session ? window.Session.getUserId() : 0;
            if (uid) {
                try {
                    await fetch('/api/game/cosmetics/equip', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-user-id': String(uid),
                            'x-session-token': window.Session.getSessionToken()
                        },
                        body: JSON.stringify({
                            userId: uid,
                            itemType: 'PLAYMAT',
                            itemCode: targetCode || 'NONE'
                        })
                    });
                } catch(e) {
                    console.error('[SET ACTIVE PLAYMAT ERROR]', e);
                }
            }

            if (window.Session) {
                const u = window.Session.getUser();
                if (u) {
                    u.matActivoId = targetCode;
                    u.playmat = targetCode;
                    window.Session.saveUser(u);
                }
            }
            return true;
        }
    };

    window.PlaymatsManager = PlaymatsManager;
    document.addEventListener('DOMContentLoaded', () => {
        PlaymatsManager.syncFromServer();
    });
})(window);
