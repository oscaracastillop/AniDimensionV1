/**
 * ANI-DIMENSION: GESTIÓN OFICIAL DE DECKS (OFICIAL KONAMI OCG)
 * 100% CONECTADO A BASE DE DATOS SQL SERVER
 */
(function(window) {
    let _cachedDeck = { mainDeck: [], extraDeck: [], sideDeck: [] };
    let _cachedInventory = [];

    const EXTRA_DECK_CARD_IDS = new Set([
        '45231177', '58528964', '17881964', '37421579', '70681994',
        '95952802', '66889139', '1641882', '54541900', '9293977'
    ]);

    const DeckManager = {
        /**
         * Obtiene las cartas y el mazo activo directamente desde SQL Server
         */
        syncFromServer: async function() {
            let uid = window.Session ? window.Session.getUserId() : 0;
            if (!uid) {
                const u = window.Session ? window.Session.getUser() : null;
                if (u) uid = parseInt(u.id || u.user_id || u.Id || 0, 10);
            }
            if (!uid) {
                try {
                    const authRes = await fetch('/api/auth/me?userId=1');
                    if (authRes.ok) {
                        const aData = await authRes.json();
                        if (aData && aData.success && aData.user) {
                            uid = parseInt(aData.user.id || aData.user.Id || 0, 10);
                            if (window.Session) window.Session.saveUser(aData.user);
                        }
                    }
                } catch(e) {}
            }
            if (!uid) uid = 1;

            try {
                const token = window.Session ? window.Session.getSessionToken() : '';
                const res = await fetch(`/api/game/deck-inventory?userId=${uid}`, {
                    headers: { 'x-user-id': String(uid), 'x-session-token': token }
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        _cachedDeck = {
                            id: data.deck.id,
                            name: data.deck.name || 'Mazo Principal',
                            mainDeck: (data.deck.mainDeck || []).map(c => this.getHydratedCard(c)).filter(Boolean),
                            extraDeck: (data.deck.extraDeck || []).map(c => this.getHydratedCard(c)).filter(Boolean),
                            sideDeck: (data.deck.sideDeck || []).map(c => this.getHydratedCard(c)).filter(Boolean)
                        };

                        _cachedInventory = (data.inventory || []).map(c => this.getHydratedCard(c)).filter(Boolean);
                        if (window.PacksManager) {
                            window.PacksManager._cachedInventory = _cachedInventory;
                        }
                        window.dispatchEvent(new CustomEvent('ad-deck-loaded', { detail: _cachedDeck }));
                    }
                }
            } catch (err) {
                console.error('[DECK MANAGER SYNC ERROR]', err);
            }

            return { deck: _cachedDeck, inventory: _cachedInventory };
        },

        getHydratedCard: function(cardObj) {
            if (!cardObj) return null;
            const cardId = parseInt(typeof cardObj === 'object' ? (cardObj.card_id || cardObj.id || cardObj.CardCode) : cardObj, 10);
            const canonical = window.PacksManager && typeof window.PacksManager.getCardById === 'function' ? window.PacksManager.getCardById(cardId) : null;

            const base = canonical || {};
            const obj = typeof cardObj === 'object' ? cardObj : {};

            return {
                card_id: cardId,
                name: (obj.name && !obj.name.startsWith('Carta #')) ? obj.name : (base.name || obj.name || `Carta #${cardId}`),
                type: obj.type || base.type || 'Normal Monster',
                rarity: obj.rarity || base.rarity || 'COMMON',
                atk: obj.atk !== undefined ? obj.atk : (base.atk !== undefined ? base.atk : null),
                def: obj.def !== undefined ? obj.def : (base.def !== undefined ? base.def : null),
                level: obj.level !== undefined ? obj.level : (base.level || 0),
                attribute: obj.attribute || base.attribute || '',
                race: obj.race || base.race || '',
                desc: obj.desc || base.desc || '',
                ownedCount: obj.quantity || obj.ownedCount || 1,
                image_url: obj.image_url || base.image_url || `https://images.ygoprodeck.com/images/cards_small/${cardId}.jpg`
            };
        },

        isExtraDeckCard: function(card) {
            if (!card) return false;
            const hydrated = this.getHydratedCard(card);
            if (!hydrated) return false;

            const cardIdStr = String(hydrated.card_id);
            if (EXTRA_DECK_CARD_IDS.has(cardIdStr)) return true;

            const type = (hydrated.type || '').toLowerCase();
            const race = (hydrated.race || '').toLowerCase();
            return type.includes('fusion') || type.includes('synchro') || type.includes('xyz') || type.includes('link') || race.includes('fusion');
        },

        isCardDeckUsable: function(cardId) {
            return true;
        },

        getDeck: function() {
            return _cachedDeck;
        },

        getUserDeck: function() {
            return _cachedDeck;
        },

        getUserInventoryGrouped: function() {
            return _cachedInventory;
        },

        /**
         * Guarda el mazo directamente en SQL Server
         */
        saveDeck: async function(deckObj) {
            const uid = window.Session ? window.Session.getUserId() : 0;
            if (!uid) return { success: false, message: 'Debes iniciar sesión.' };

            const mainDeckIds = (deckObj.mainDeck || []).map(c => parseInt(typeof c === 'object' ? (c.card_id || c.id) : c, 10));
            const extraDeckIds = (deckObj.extraDeck || []).map(c => parseInt(typeof c === 'object' ? (c.card_id || c.id) : c, 10));
            const sideDeckIds = (deckObj.sideDeck || []).map(c => parseInt(typeof c === 'object' ? (c.card_id || c.id) : c, 10));

            try {
                const res = await fetch('/api/game/deck/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': String(uid),
                        'x-session-token': window.Session.getSessionToken()
                    },
                    body: JSON.stringify({
                        userId: uid,
                        name: deckObj.name || 'Mazo Principal',
                        mainDeck: mainDeckIds,
                        extraDeck: extraDeckIds,
                        sideDeck: sideDeckIds
                    })
                });

                const data = await res.json();
                if (data.success) {
                    _cachedDeck = {
                        id: _cachedDeck.id,
                        name: deckObj.name || 'Mazo Principal',
                        mainDeck: (deckObj.mainDeck || []).map(c => this.getHydratedCard(c)),
                        extraDeck: (deckObj.extraDeck || []).map(c => this.getHydratedCard(c)),
                        sideDeck: (deckObj.sideDeck || []).map(c => this.getHydratedCard(c))
                    };
                    return { success: true, message: data.message };
                } else {
                    return { success: false, message: data.message };
                }
            } catch (err) {
                return { success: false, message: 'Error de red al guardar en la base de datos.' };
            }
        },

        validateDeck: function(deck) {
            const errors = [];
            const warnings = [];

            if (!deck) return { isValid: false, errors: ['No existe deck asignado.'], warnings: [] };

            const mainCount = deck.mainDeck ? deck.mainDeck.length : 0;
            const extraCount = deck.extraDeck ? deck.extraDeck.length : 0;

            if (mainCount < 40) {
                errors.push(`El Main Deck debe tener al menos 40 cartas (actualmente: ${mainCount}).`);
            } else if (mainCount > 60) {
                errors.push(`El Main Deck no puede exceder las 60 cartas (actualmente: ${mainCount}).`);
            }

            if (extraCount > 15) {
                errors.push(`El Extra Deck no puede exceder las 15 cartas (actualmente: ${extraCount}).`);
            }

            (deck.mainDeck || []).forEach(card => {
                if (this.isExtraDeckCard(card)) {
                    errors.push(`La carta de Fusión "${card.name}" (#${card.card_id}) debe estar en el Extra Deck.`);
                }
            });

            return { isValid: errors.length === 0, errors, warnings };
        }
    };

    window.DeckManager = DeckManager;

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                DeckManager.syncFromServer();
            });
        } else {
            DeckManager.syncFromServer();
        }
    }
})(window);
