/**
 * ANI-DIMENSION: GESTIÓN DE PASES VIP Y BENEFICIOS TEMPORALES
 * 100% RESPALDADO EN SQL SERVER (dbo.VipPassesCatalog, dbo.UserVipPasses)
 * CERO ALMACENAMIENTO DE DATOS EN LOCALSTORAGE
 */
(function(window) {
    'use strict';

    const VipManager = {
        _cachedVipPasses: [],
        _syncPromise: null,

        /**
         * Sincroniza catálogo de pases VIP directamente desde SQL Server
         */
        syncFromServer: async function(force = false) {
            if (this._syncPromise && !force) return this._syncPromise;

            this._syncPromise = (async () => {
                try {
                    const res = await fetch('/api/game/shop/vip');
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success && Array.isArray(data.passes)) {
                            this._cachedVipPasses = data.passes;
                            if (typeof window.renderShopVipGrid === 'function') {
                                window.renderShopVipGrid();
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[VIP PASSES SQL SYNC NOTICE]', e.message);
                }
                return this._cachedVipPasses;
            })();

            return this._syncPromise;
        },

        /**
         * Obtiene la lista de pases VIP desde memoria (sincronizada desde SQL)
         */
        getVipPasses: function() {
            if (!this._cachedVipPasses || this._cachedVipPasses.length === 0) {
                this.syncFromServer();
            }
            return this._cachedVipPasses;
        },

        /**
         * Alias esperado por la vista de tienda
         */
        getActiveVipPasses: function() {
            return this.getVipPasses().filter(v => v.active !== false);
        },

        /**
         * Obtiene un pase VIP por su código
         */
        getVipPassByCode: function(code) {
            if (!code) return null;
            const clean = code.toString().toUpperCase().trim();
            const list = this.getVipPasses();
            return list.find(v => v.code === clean) || null;
        },

        /**
         * Verifica si el usuario actual tiene membresía VIP activa consultando su estado oficial
         */
        isUserVip: function() {
            const u = window.Session ? window.Session.getUser() : null;
            if (!u) return false;
            if (u.isAdmin || u.role === 'admin' || (u.username && u.username.toLowerCase() === 'admin')) return true;
            const vipUntilRaw = u.vipUntil || u.VipUntil;
            if (!vipUntilRaw) return false;

            const now = new Date();
            const exp = new Date(vipUntilRaw);
            return exp > now;
        },

        /**
         * Obtiene el estado consolidado de la membresía VIP del usuario
         */
        getUserVipStatus: function() {
            const u = window.Session ? window.Session.getUser() : null;
            if (!u) {
                return {
                    active: false,
                    remainingFormatted: '0 Días',
                    expiresAt: null,
                    exp_boost: 0.0,
                    starships_boost: 0.0,
                    luck_boost: 0.0,
                    passName: 'Sin VIP',
                    passCode: null
                };
            }

            const isAdmin = Boolean(u.isAdmin || u.role === 'admin' || (u.username && u.username.toLowerCase() === 'admin'));
            const vipUntilRaw = u.vipUntil || u.VipUntil;

            if (isAdmin && !vipUntilRaw) {
                return {
                    active: true,
                    remainingFormatted: 'PERMANENTE',
                    expiresAt: null,
                    exp_boost: 10.0,
                    starships_boost: 10.0,
                    luck_boost: 5.0,
                    passName: 'Pase VIP Admin',
                    passCode: 'VIP-ADMIN'
                };
            }

            if (!vipUntilRaw) {
                return {
                    active: false,
                    remainingFormatted: '0 Días',
                    expiresAt: null,
                    exp_boost: 0.0,
                    starships_boost: 0.0,
                    luck_boost: 0.0,
                    passName: 'Sin VIP',
                    passCode: null
                };
            }

            const now = new Date();
            const exp = new Date(vipUntilRaw);
            if (exp <= now) {
                return {
                    active: false,
                    remainingFormatted: 'EXPIRADO',
                    expiresAt: exp,
                    exp_boost: 0.0,
                    starships_boost: 0.0,
                    luck_boost: 0.0,
                    passName: 'Pase Expirado',
                    passCode: null
                };
            }

            const diffMs = exp - now;
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
            const remainingFormatted = diffDays > 1 ? `${diffDays} DÍAS` : `${diffHours} HORAS`;

            return {
                active: true,
                remainingFormatted: remainingFormatted,
                expiresAt: exp,
                exp_boost: 10.0,
                starships_boost: 10.0,
                luck_boost: 5.0,
                passName: 'Pase VIP AD',
                passCode: 'VIP-001'
            };
        },

        /**
         * Activa o extiende la membresía VIP en memoria de sesión
         */
        activateUserVip: function(vipCode, details = {}) {
            const u = window.Session ? window.Session.getUser() : null;
            if (!u) return false;

            const days = parseInt(details.days || 30, 10);
            const now = new Date();
            const currentVip = (u.vipUntil || u.VipUntil) ? new Date(u.vipUntil || u.VipUntil) : now;
            const baseTime = currentVip > now ? currentVip : now;
            baseTime.setDate(baseTime.getDate() + days);

            u.vipUntil = baseTime.toISOString();
            u.VipUntil = u.vipUntil;
            if (window.Session) {
                window.Session.saveUser(u);
            }
            return true;
        }
    };

    if (typeof window !== 'undefined') {
        window.VipManager = VipManager;
        VipManager.syncFromServer();
    }
})(window);
