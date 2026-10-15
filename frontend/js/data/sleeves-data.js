/**
 * ANI-DIMENSION: GESTIÓN DE FUNDAS Y REVERSOS DE CARTAS (SLEEVES)
 * SOPORTE CRUD ADMIN: CREACIÓN, EDICIÓN DEDICADA, CARGA DE IMÁGENES (LOCAL O WEB),
 * PRECIOS EN ⭐ STARSHIPS Y $ USD, BANNERS DE OFERTA Y VITALICIOS (SIN CADUCIDAD).
 * INTEGRACIÓN CON TIENDA, PERFIL Y DUELOS (P1 Y P2 PVP).
 */
(function(window) {
    const STORAGE_KEY_SLEEVES = 'ad_sleeves_data_v2';
    const STORAGE_KEY_USER_SLEEVES = 'ad_user_sleeves_v1';
    const STORAGE_KEY_ACTIVE_SLEEVE = 'ad_active_sleeve_v1';

    function generateInitialSleeves() {
        return [
            {
                code: 'SLV-001',
                name: 'Funda Dragón Blanco de Ojos Azules Cósmico',
                description: 'Reverso de carta con el Dragón Blanco de Ojos Azules en fulgor astral cósmico y borde negro sólido.',
                price: 50000,
                currency: 'STARSHIPS',
                image: '/assets/images/sleeves/SLV-001.png',
                offer_text: 'POPULAR',
                active: true
            },
            {
                code: 'SLV-002',
                name: 'Funda Maga Oscura Hechicera Astral',
                description: 'Reverso de carta con la Maga Oscura canalizando energía mágica magenta y cian con borde negro sólido.',
                price: 50000,
                currency: 'STARSHIPS',
                image: '/assets/images/sleeves/SLV-002.png',
                offer_text: 'NUEVO',
                active: true
            }
        ];
    }

    const SleevesManager = {
        /**
         * Obtiene la lista completa de fundas
         */
        _cachedSleeves: generateInitialSleeves(),
        _syncPromise: null,

        /**
         * Obtiene la lista completa de fundas desde memoria (sincronizada desde SQL Server)
         */
        getSleeves: function() {
            if (!this._cachedSleeves || this._cachedSleeves.length === 0) {
                this._cachedSleeves = generateInitialSleeves();
                this.syncFromServer();
            }
            return this._cachedSleeves;
        },

        /**
         * Sincroniza catálogo directamente desde SQL Server
         */
        syncFromServer: async function(force = false) {
            if (this._syncPromise && !force) return this._syncPromise;
            this._syncPromise = (async () => {
                try {
                    const res = await fetch('/api/game/shop/sleeves');
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success && Array.isArray(data.sleeves) && data.sleeves.length > 0) {
                            this._cachedSleeves = data.sleeves;
                            return data.sleeves;
                        }
                    }
                } catch (e) {
                    console.warn('[SLEEVES SYNC ERROR]', e.message);
                }
                return this._cachedSleeves;
            })();
            return this._syncPromise;
        },

        /**
         * Actualiza en memoria el array de fundas
         */
        saveSleeves: function(sleeves) {
            if (!Array.isArray(sleeves)) return false;
            this._cachedSleeves = sleeves;
            return true;
        },

        /**
         * Obtiene una funda específica por su código SLV-XXX
         */
        getSleeveByCode: function(code) {
            if (!code) return null;
            const list = this.getSleeves();
            return list.find(s => s.code === code) || null;
        },

        /**
         * Genera el siguiente código secuencial disponible (SLV-001, SLV-002, ...)
         */
        getNextCode: function() {
            const list = this.getSleeves();
            let maxNum = 0;
            list.forEach(s => {
                if (s.code && s.code.startsWith('SLV-')) {
                    const num = parseInt(s.code.replace('SLV-', ''), 10);
                    if (!isNaN(num) && num > maxNum) maxNum = num;
                }
            });
            const nextNum = maxNum + 1;
            return 'SLV-' + String(nextNum).padStart(3, '0');
        },

        /**
         * Crea una nueva funda
         */
        createSleeve: async function(data) {
            const list = this.getSleeves();
            const newCode = data.code || this.getNextCode();

            const newSleeve = {
                code: newCode,
                name: (data.name || newCode).trim(),
                description: (data.description || '').trim(),
                image: data.image || `/assets/images/sleeves/${newCode}.png`,
                currency: (data.currency || 'STARSHIPS').toUpperCase(),
                price: parseFloat(data.price !== undefined ? data.price : 35000),
                offer_text: (data.offer_text || '').trim().toUpperCase(),
                active: data.active !== false
            };

            const existingIdx = list.findIndex(s => s.code === newCode);
            if (existingIdx >= 0) {
                list[existingIdx] = newSleeve;
            } else {
                list.push(newSleeve);
            }

            this.saveSleeves(list);

            // Persistir en servidor
            try {
                await fetch('/api/admin/sleeves', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newSleeve)
                });
            } catch (e) {
                console.error('[SLEEVE CREATE SERVER SYNC ERROR]', e);
            }

            return newSleeve;
        },

        /**
         * Actualiza una funda existente
         */
        updateSleeve: async function(code, data) {
            const list = this.getSleeves();
            const idx = list.findIndex(s => s.code === code);
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

            this.saveSleeves(list);

            // Persistir en servidor
            try {
                await fetch('/api/admin/sleeves', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(list[idx])
                });
            } catch (e) {
                console.error('[SLEEVE UPDATE SERVER SYNC ERROR]', e);
            }

            return list[idx];
        },

        /**
         * Alterna el estado activo / inactivo
         */
        toggleSleeve: async function(code) {
            const list = this.getSleeves();
            const item = list.find(s => s.code === code);
            if (!item) return false;
            item.active = !item.active;
            this.saveSleeves(list);

            try {
                await fetch('/api/admin/sleeves', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                });
            } catch (e) {}

            return item.active;
        },

        /**
         * Elimina una funda
         */
        deleteSleeve: async function(code) {
            let list = this.getSleeves();
            list = list.filter(s => s.code !== code);
            this.saveSleeves(list);

            try {
                await fetch(`/api/admin/sleeves/${encodeURIComponent(code)}`, {
                    method: 'DELETE'
                });
            } catch (e) {}

            return true;
        },

        /**
         * Subir imagen al servidor
         */
        uploadImage: async function(code, imageBase64, extension = 'png') {
            try {
                const res = await fetch('/api/admin/sleeves/upload', {
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
                console.error('[SLEEVE IMAGE UPLOAD ERROR]', e);
            }
            return null;
        },

        _serverOwnedSleeves: null,
        _activeSleeve: null,

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
                        if (data.success && Array.isArray(data.sleeves)) {
                            this._serverOwnedSleeves = data.sleeves;
                            this._activeSleeve = data.activeSleeve || null;
                        }
                    }
                } catch (e) {}
            }

            try {
                const res = await fetch('/api/admin/sleeves');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.sleeves) && data.sleeves.length > 0) {
                        return data.sleeves;
                    }
                }
            } catch (e) {
                console.warn('[SLEEVES SYNC ERROR]', e);
            }
            return this.getSleeves();
        },

        /**
         * Fundas activas para la tienda
         */
        getActiveSleeves: function() {
            return this.getSleeves().filter(s => s.active !== false);
        },

        /**
         * Obtiene los códigos de fundas compradas / poseídas por el usuario desde SQL Server
         */
        getUserSleeves: function() {
            const u = window.Session ? window.Session.getUser() : null;
            const isAdmin = Boolean(u && (u.isAdmin || u.role === 'admin' || (u.username && u.username.toLowerCase() === 'admin')));

            if (this._serverOwnedSleeves && Array.isArray(this._serverOwnedSleeves)) {
                return this._serverOwnedSleeves;
            }

            if (isAdmin) {
                const allCodes = this.getSleeves().map(s => s.code);
                this._serverOwnedSleeves = allCodes;
                return allCodes;
            }

            return [];
        },

        /**
         * Registra la posesión de una funda
         */
        addUserSleeve: function(code) {
            if (!this._serverOwnedSleeves) this._serverOwnedSleeves = [];
            if (!this._serverOwnedSleeves.includes(code)) {
                this._serverOwnedSleeves.push(code);
            }
        },

        buySleeve: async function(code) {
            this.addUserSleeve(code);
            const uid = window.Session ? window.Session.getUserId() : 0;
            if (uid) {
                const slv = this.getSleeveByCode(code);
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
                            itemType: 'SLEEVE',
                            itemCode: code,
                            costStarships: (slv && slv.price) || 0
                        })
                    });
                } catch(e) {}
            }
        },

        isSleeveOwned: function(code) {
            const owned = this.getUserSleeves();
            return owned.includes(code);
        },

        /**
         * Obtiene el código de la funda equipada / activa del usuario
         */
        getActiveSleeveCode: function() {
            const u = window.Session ? window.Session.getUser() : null;
            return (u && (u.fundaActivaId || u.sleeve || u.Sleeve)) || this._activeSleeve || null;
        },

        /**
         * Obtiene el objeto completo de la funda equipada del usuario
         */
        getActiveSleeve: function() {
            const code = this.getActiveSleeveCode();
            if (!code) return null;
            return this.getSleeveByCode(code);
        },

        /**
         * Establece la funda activa del usuario directamente en SQL Server (o desactiva si es vacío/'NONE')
         */
        setActiveSleeve: async function(code) {
            const isDeactivating = (!code || code === 'NONE' || code === 'DEFAULT' || code === 'null');
            const targetCode = isDeactivating ? null : code;

            if (!isDeactivating) {
                this.addUserSleeve(targetCode);
            }
            this._activeSleeve = targetCode;


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
                            itemType: 'SLEEVE',
                            itemCode: targetCode || 'NONE'
                        })
                    });
                } catch(e) {
                    console.error('[SET ACTIVE SLEEVE ERROR]', e);
                }
            }

            if (window.Session) {
                const u = window.Session.getUser();
                if (u) {
                    u.fundaActivaId = targetCode;
                    u.sleeve = targetCode;
                    window.Session.saveUser(u);
                }
            }
            return true;
        }
    };

    window.SleevesManager = SleevesManager;
    document.addEventListener('DOMContentLoaded', () => {
        SleevesManager.syncFromServer();
    });
})(window);
