/**
 * ANI-DIMENSION: GESTIÓN REGLAMENTARIA DE DECKS (OFICIAL KONAMI OCG)
 * RULES:
 * - MAIN DECK: 40 a 60 cartas (Monstruos Normales/Efecto/Ritual, Magias, Trampas).
 * - EXTRA DECK: 0 a 15 cartas (Fusión, Sincronía, Xyz, Link). LAS CARTAS DE FUSIÓN NUNCA PUEDEN IR EN EL MAIN DECK.
 * - MÁXIMO 3 COPIAS por carta con el mismo nombre entre Main + Extra Deck.
 * - LÍMITE DE INVENTARIO: No se pueden agregar más copias de las que el jugador posee.
 * - REGLA DE BLOQUEO ADMIN: Las cartas con c.deck_usable === false o c.active === false NO pueden incluirse.
 */
(function(window) {
    const STORAGE_KEY_USER_DECK = 'ad_user_deck_v1';

    // Lista de IDs de cartas de Fusión reglamentarias OCG
    const EXTRA_DECK_CARD_IDS = new Set([
        '45231177', // Flame Swordsman
        '58528964', // Flame Ghost
        '17881964', // Darkfire Dragon
        '37421579', // Charubin the Fire Knight
        '70681994', // Dragoness the Wicked Knight
        '95952802', // Flower Wolf
        '66889139', // Gaia the Dragon Champion
        '1641882',  // Fusionist
        '54541900', // Karbonala Warrior
        '9293977'   // Metal Dragon
    ]);

    // LISTA DE 40 PASSCODES DEL STARTER DECK INICIAL PARA NUEVOS JUGADORES
    const STARTER_DECK_PASSCODES = [
        32274490, 32274490, 32274490, // Skull Servant x3 (300 ATK / Zombie)
        76103675,                     // Sparks (300 ATK / Pyro)
        80813021,                     // Torike (1200 ATK / Beast)
        53293545,                     // Firegrass (700 ATK / Plant)
        89091579,                     // Basic Insect (500 ATK / Insect)
        36121917, 36121917,           // Monster Egg x2 (600 ATK / Warrior)
        90357090,                     // Silver Fang (1200 ATK / Beast)
        76184692,                     // Hitotsu-Me Giant (1200 ATK / Beast-Warrior)
        32452818,                     // Beaver Warrior (1200 ATK / Beast-Warrior)
        9159938,                      // Dark Gray (800 ATK / Beast)
        1784619,                      // Uraby (1500 ATK / Dinosaur)
        57305373,                     // Two-Mouth Darkruler (900 ATK / Dinosaur)
        75356564, 75356564, 75356564, // Petit Dragon x3 (600 ATK / Dragon)
        20060230,                     // Hard Armor (300 ATK / Warrior)
        44287299,                     // Masaki the Legendary Swordsman (1100 ATK / Warrior)
        85705804, 85705804, 85705804, // Kurama x3 (800 ATK / Winged Beast)
        72842870,                     // Tyhone (1200 ATK / Winged Beast)
        53375573,                     // Dark King of the Abyss (1200 ATK / Fiend)
        2863439,                      // Fiend Reflection #2 (1100 ATK / Winged Beast)
        17535588,                     // Armored Starfish (850 ATK / Aqua)
        85639257,                     // Aqua Madoor (1200 ATK / Spellcaster)
        33064647,                     // One-Eyed Shield Dragon (700 ATK / Dragon)
        96851799,                     // Hinotama Soul (600 ATK / Pyro)
        56283725,                     // Kumootoko (700 ATK / Insect)
        80770678,                     // Spirit of the Harp (800 ATK / Fairy)
        43500484,                     // Dark World Thorns (1200 ATK / Plant)
        16353197,                     // Drooling Lizard (900 ATK / Reptile)
        76211194,                     // Meda Bat (800 ATK / Fiend)
        73134081,                     // Final Flame (Magia Daño Directo)
        46130346,                     // Hinotama (Magia Daño Directo Menor)
        63102017,                     // Stop Defense (Magia Posición Ataque)
        51482758,                     // Remove Trap (Magia Destruir Trampa)
        50045229                      // Dragon Capture Jar (Trampa Dragones a Defensa)
    ];

    const DeckManager = {
        /**
         * Hidrata un objeto o ID de carta desde el catálogo oficial maestro de PacksManager
         */
        getHydratedCard: function(cardObj) {
            if (!cardObj) return null;
            const cardId = String(typeof cardObj === 'object' ? (cardObj.card_id || cardObj.id) : cardObj);
            const canonicalCard = window.PacksManager && typeof window.PacksManager.getCardById === 'function' ? window.PacksManager.getCardById(cardId) : null;

            if (canonicalCard) {
                return {
                    ...canonicalCard,
                    card_id: parseInt(cardId) || canonicalCard.card_id,
                    deck_usable: this.isCardDeckUsable(cardId),
                    active: canonicalCard.active !== false
                };
            }

            if (typeof cardObj === 'object') {
                return {
                    ...cardObj,
                    name: cardObj.name || cardObj.card_name || `Carta #${cardId}`,
                    card_id: parseInt(cardId) || cardObj.card_id || 0,
                    deck_usable: this.isCardDeckUsable(cardId)
                };
            }

            return { card_id: parseInt(cardId), name: `Carta #${cardId}`, deck_usable: this.isCardDeckUsable(cardId) };
        },

        /**
         * Determina si una carta pertenece al Extra Deck (Fusión, Sincronía, Xyz, Link)
         */
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

        /**
         * Verifica si una carta está habilitada por el Admin para su uso en Deck (active !== false y deck_usable !== false)
         */
        isCardDeckUsable: function(cardId) {
            if (window.PacksManager && typeof window.PacksManager.getPacks === 'function') {
                const packs = window.PacksManager.getPacks();
                for (const pack of packs) {
                    const card = pack.cards.find(c => String(c.card_id) === String(cardId));
                    if (card) {
                        return (card.active !== false && card.deck_usable !== false);
                    }
                }
            }
            return true;
        },

        /**
         * Obtiene la lista de cartas del inventario del usuario agrupadas por ID y 100% hidratadas
         */
        getUserInventoryGrouped: function() {
            const rawInventory = window.PacksManager ? window.PacksManager.getUserInventory() : [];
            const map = new Map();

            rawInventory.forEach(rawCard => {
                const hydrated = this.getHydratedCard(rawCard);
                if (!hydrated) return;
                const id = String(hydrated.card_id);

                if (!map.has(id)) {
                    map.set(id, {
                        ...hydrated,
                        ownedCount: 1
                    });
                } else {
                    map.get(id).ownedCount++;
                }
            });

            return Array.from(map.values());
        },

        /**
         * Obtiene el deck actual del usuario desde localStorage, hidratando y clasificando estricta y automáticamente Main vs Extra Deck.
         */
        getDeck: function() {
            const data = localStorage.getItem(STORAGE_KEY_USER_DECK);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed && Array.isArray(parsed.mainDeck) && parsed.mainDeck.length > 0) {
                        const mainDeck = parsed.mainDeck.map(c => this.getHydratedCard(c)).filter(Boolean);
                        const extraDeck = (parsed.extraDeck || []).map(c => this.getHydratedCard(c)).filter(Boolean);

                        const fixedMain = [];
                        const fixedExtra = [];

                        // Reclasificar estrictamente cada carta según regla oficial Konami
                        [...mainDeck, ...extraDeck].forEach(c => {
                            if (this.isExtraDeckCard(c)) {
                                fixedExtra.push(c);
                            } else {
                                fixedMain.push(c);
                            }
                        });

                        const cleanedDeck = { mainDeck: fixedMain, extraDeck: fixedExtra };
                        this.saveDeck(cleanedDeck);
                        return cleanedDeck;
                    }
                } catch (e) {
                    console.error('Error parseando deck de usuario:', e);
                }
            }

            return this.initializeNewUserAccount();
        },

        /**
         * Guarda el deck del usuario en localStorage
         */
        saveDeck: function(deck) {
            if (!deck || !Array.isArray(deck.mainDeck) || !Array.isArray(deck.extraDeck)) return false;
            localStorage.setItem(STORAGE_KEY_USER_DECK, JSON.stringify(deck));
            return true;
        },

        /**
         * Inicializa la cuenta de un nuevo usuario con el avatar por defecto AVA-002
         * y otorga las 40 cartas reglamentarias iniciales tanto a su inventario como a su Main Deck.
         */
        initializeNewUserAccount: function() {
            console.log('[STARTER DECK] Inicializando cuenta con avatar AVA-002 y Deck inicial de 40 cartas...');

            // 1. Asignar Avatar por defecto AVA-002
            if (window.AvatarsManager) {
                window.AvatarsManager.addUserAvatar('AVA-002');
                window.AvatarsManager.setActiveAvatar('AVA-002');
            } else {
                localStorage.setItem('ad_user_avatars_v1', JSON.stringify(['AVA-002']));
                localStorage.setItem('ad_active_avatar_v1', 'AVA-002');
            }

            // 2. Hidratar las 40 cartas del Starter Deck
            const starterCards = STARTER_DECK_PASSCODES.map(passcode => this.getHydratedCard(passcode)).filter(Boolean);

            // 3. Garantizar que las 40 cartas estén en el inventario del jugador
            if (window.PacksManager && typeof window.PacksManager.getUserInventory === 'function') {
                const currentInv = window.PacksManager.getUserInventory();
                if (!currentInv || currentInv.length === 0) {
                    starterCards.forEach(card => {
                        window.PacksManager.addCardToInventory(card);
                    });
                }
            }

            // 4. Crear y guardar el Deck de Inicio de 40 cartas
            const starterDeck = {
                mainDeck: starterCards,
                extraDeck: []
            };
            this.saveDeck(starterDeck);
            return starterDeck;
        },

        /**
         * Genera un Starter Deck por defecto (Alias para initializeNewUserAccount)
         */
        generateDefaultStarterDeck: function() {
            return this.initializeNewUserAccount();
        },

        /**
         * Limpia completamente el deck del usuario
         */
        clearUserDeck: function() {
            const emptyDeck = { mainDeck: [], extraDeck: [] };
            this.saveDeck(emptyDeck);
            return emptyDeck;
        },

        /**
         * Limpia todas las cartas del inventario y del deck del jugador (Reseteo a cero)
         */
        clearAllUserCardsAndDeck: function() {
            if (window.PacksManager && typeof window.PacksManager.clearUserInventory === 'function') {
                window.PacksManager.clearUserInventory();
            }
            this.clearUserDeck();
        },

        /**
         * Valida un deck frente a las reglas oficiales de Yu-Gi-Oh! OCG
         */
        validateDeck: function(deck) {
            const errors = [];
            const warnings = [];

            if (!deck) {
                return { isValid: false, errors: ['No existe deck asignado.'], warnings: [] };
            }

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

            // Validar que ninguna carta de Fusión esté en el Main Deck
            (deck.mainDeck || []).forEach(card => {
                if (this.isExtraDeckCard(card)) {
                    errors.push(`La carta de Fusión "${card.name}" (#${card.card_id}) debe estar en el Extra Deck, no en el Main Deck.`);
                }
            });

            // Validar que ninguna carta de Main Deck esté en el Extra Deck
            (deck.extraDeck || []).forEach(card => {
                if (!this.isExtraDeckCard(card)) {
                    errors.push(`La carta "${card.name}" (#${card.card_id}) no pertenece al Extra Deck.`);
                }
            });

            // Conteo total de copias combinadas por carta
            const copyMap = new Map();
            const allDeckCards = [...(deck.mainDeck || []), ...(deck.extraDeck || [])];

            for (const card of allDeckCards) {
                const cardId = String(card.card_id);
                const name = card.name || 'Carta';

                // Verificación de bloqueo por Admin
                if (!this.isCardDeckUsable(cardId)) {
                    errors.push(`La carta "${name}" (#${cardId}) ha sido deshabilitada por el Administrador.`);
                }

                copyMap.set(cardId, (copyMap.get(cardId) || 0) + 1);
                if (copyMap.get(cardId) > 3) {
                    errors.push(`La carta "${name}" excede el límite oficial Konami de 3 copias máximas por Deck.`);
                }
            }

            // Verificación con el inventario real del jugador
            const groupedInv = this.getUserInventoryGrouped();
            const invMap = new Map(groupedInv.map(c => [String(c.card_id), c.ownedCount]));

            copyMap.forEach((deckCount, cardId) => {
                const owned = invMap.get(cardId) || 0;
                if (deckCount > owned) {
                    const cardObj = allDeckCards.find(c => String(c.card_id) === cardId);
                    const name = cardObj ? cardObj.name : `#${cardId}`;
                    errors.push(`No posees suficientes copias de "${name}" en tu inventario (En Deck: ${deckCount}, Poseídas: ${owned}).`);
                }
            });

            return {
                isValid: errors.length === 0,
                errors: errors,
                warnings: warnings
            };
        }
    };

    window.DeckManager = DeckManager;
})(window);
