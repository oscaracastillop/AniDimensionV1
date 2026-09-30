const fs = require('fs');
const path = require('path');

const lobCards = JSON.parse(fs.readFileSync(path.join(__dirname, 'lob_cards_frontend.json'), 'utf-8'));

const fileContent = `/**
 * ANI-DIMENSION: GESTIÓN DE SOBRES Y CATALOGO DE CARTAS OCG (LOB)
 * CATÁLOGO COMPLETO DE 126 CARTAS CON DATOS REGLAMENTARIOS DE SQL SERVER (cards.cdb)
 */
(function(window) {
    const STORAGE_KEY_PACKS = 'ad_packs_data_v2';
    const STORAGE_KEY_NPC_DROPS = 'ad_npc_drops_data_v1';
    const STORAGE_KEY_USER_INVENTORY = 'ad_user_inventory_v1';

    // 1. CATÁLOGO INICIAL DEL SOBRE LOB (LEGEND OF BLUE EYES WHITE DRAGON) - 126 CARTAS DE BASE DE DATOS
    const INITIAL_PACKS = [
        {
            id: 'LOB',
            name: 'Legend of Blue Eyes White Dragon',
            code: 'LOB',
            active: true,
            price: 1500,
            offer_text: '15% DESC',
            image: '../../assets/images/packs/lob_pack.jpg',
            description: 'La primera expansión legendaria de Yu-Gi-Oh! Contiene el Dragón Blanco de Ojos Azules, Mago Oscuro, las 5 piezas de Exodia, Raigeki, Monstruo Renacido y más.',
            cards_per_pack: 4,
            cards: ${JSON.stringify(lobCards, null, 16)}
        },
        {
            id: 'MRD',
            name: 'Metal Raiders',
            code: 'MRD',
            active: false,
            price: 1500,
            offer_text: 'NUEVA EXPANSIÓN',
            image: '../../assets/images/packs/lob_pack.jpg',
            description: 'Segunda expansión oficial OCG. Introduce potentes cartas de trampa y monstruos emblemáticos como el Dragón de Cañón.',
            cards_per_pack: 4,
            cards: []
        },
        {
            id: 'MRL',
            name: 'Spell Ruler',
            code: 'MRL',
            active: false,
            price: 1500,
            offer_text: 'EDICIÓN RITUAL',
            image: '../../assets/images/packs/lob_pack.jpg',
            description: 'Tercera expansión OCG enfocada en magias rápidas y monstruos de ritual. Expande las tácticas avanzadas de tu Deck.',
            cards_per_pack: 4,
            cards: []
        },
        {
            id: 'PSV',
            name: "Pharaoh's Servant",
            code: 'PSV',
            active: false,
            price: 1500,
            offer_text: 'SECRETO FARAÓN',
            image: '../../assets/images/packs/lob_pack.jpg',
            description: 'Cuarta expansión OCG legendaria del Faraón. Introduce estrategias de trampas continuas y cartas secretas OCG.',
            cards_per_pack: 4,
            cards: []
        }
    ];

    // 2. CONFIGURACIÓN INICIAL DE DROPS DE NPC
    const INITIAL_NPC_DROPS = [
        {
            npc_id: 'yugi',
            npc_name: 'NPC Yugi Muto',
            drops: [
                { card_id: 36996508, card_name: 'Dark Magician', drop_rate: 5 },
                { card_id: 91152256, card_name: 'Celtic Guardian', drop_rate: 20 },
                { card_id: 41544074, card_name: 'Feral Imp', drop_rate: 45 }
            ]
        },
        {
            npc_id: 'kaiba',
            npc_name: 'NPC Seto Kaiba',
            drops: [
                { card_id: 89631139, card_name: 'Blue-Eyes White Dragon', drop_rate: 5 },
                { card_id: 50045299, card_name: 'Dragon Capture Jar', drop_rate: 25 },
                { card_id: 90357090, card_name: 'Silver Fang', drop_rate: 50 }
            ]
        },
        {
            npc_id: 'joey',
            npc_name: 'NPC Joey Wheeler',
            drops: [
                { card_id: 74677422, card_name: 'Red-Eyes Black Dragon', drop_rate: 5 },
                { card_id: 45231177, card_name: 'Flame Swordsman', drop_rate: 20 },
                { card_id: 32452818, card_name: 'Beaver Warrior', drop_rate: 45 }
            ]
        }
    ];

    // MANEJO DE ALMACENAMIENTO (LOCALSTORAGE / BACKEND API SINGLE SOURCE OF TRUTH)
    const PacksManager = {
        getPacks: function() {
            const data = localStorage.getItem(STORAGE_KEY_PACKS);
            let parsed = null;
            if (data) {
                try { parsed = JSON.parse(data); } catch(e) { parsed = null; }
            }
            if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
                localStorage.setItem(STORAGE_KEY_PACKS, JSON.stringify(INITIAL_PACKS));
                return INITIAL_PACKS;
            }
            // Garantizar que el sobre LOB tenga todas las 126 cartas oficiales de la base de datos
            const lobInit = INITIAL_PACKS.find(p => p.id === 'LOB');
            const lobSaved = parsed.find(p => p.id === 'LOB');
            if (lobSaved && lobInit) {
                const savedMap = new Map((lobSaved.cards || []).map(c => [String(c.card_id), c]));
                lobSaved.cards = lobInit.cards.map(initCard => {
                    const saved = savedMap.get(String(initCard.card_id));
                    if (saved) {
                        return {
                            ...initCard,
                            active: saved.active !== undefined ? saved.active : initCard.active,
                            pack_drop: saved.pack_drop !== undefined ? saved.pack_drop : initCard.pack_drop,
                            deck_usable: saved.deck_usable !== undefined ? saved.deck_usable : initCard.deck_usable,
                            npc_drop: saved.npc_drop !== undefined ? saved.npc_drop : initCard.npc_drop
                        };
                    }
                    return initCard;
                });
                localStorage.setItem(STORAGE_KEY_PACKS, JSON.stringify(parsed));
            }
            return parsed;
        },
        savePacks: function(packs) {
            localStorage.setItem(STORAGE_KEY_PACKS, JSON.stringify(packs));
        },
        getNpcDrops: function() {
            const data = localStorage.getItem(STORAGE_KEY_NPC_DROPS);
            if (!data) {
                localStorage.setItem(STORAGE_KEY_NPC_DROPS, JSON.stringify(INITIAL_NPC_DROPS));
                return INITIAL_NPC_DROPS;
            }
            return JSON.parse(data);
        },
        getCardById: function(cardId) {
            const packs = this.getPacks();
            for (const pack of packs) {
                const card = pack.cards.find(c => String(c.card_id) === String(cardId));
                if (card) {
                    return card;
                }
            }
            return null;
        },
        isCardActive: function(cardId) {
            const packs = this.getPacks();
            for (const pack of packs) {
                const card = pack.cards.find(c => String(c.card_id) === String(cardId));
                if (card) {
                    return card.active !== false;
                }
            }
            return true;
        },
        getUserInventory: function() {
            const data = localStorage.getItem(STORAGE_KEY_USER_INVENTORY);
            if (!data) return [];
            try {
                return JSON.parse(data);
            } catch(e) {
                return [];
            }
        },
        clearUserInventory: function() {
            localStorage.setItem(STORAGE_KEY_USER_INVENTORY, JSON.stringify([]));
        },
        addCardToInventory: function(cardObj) {
            if (!cardObj) return;
            const cardId = String(typeof cardObj === 'object' ? (cardObj.card_id || cardObj.id) : cardObj);
            const canonicalCard = this.getCardById(cardId) || (typeof cardObj === 'object' ? cardObj : { card_id: parseInt(cardId) });
            const inv = this.getUserInventory();
            inv.push({
                card_id: parseInt(cardId) || canonicalCard.card_id,
                name: canonicalCard.name || ('Carta #' + cardId),
                rarity: canonicalCard.rarity || 'COMMON',
                type: canonicalCard.type || 'Monster',
                set: canonicalCard.set || 'LOB',
                atk: canonicalCard.atk,
                def: canonicalCard.def,
                level: canonicalCard.level,
                attribute: canonicalCard.attribute,
                race: canonicalCard.race,
                desc: canonicalCard.desc
            });
            localStorage.setItem(STORAGE_KEY_USER_INVENTORY, JSON.stringify(inv));
        },
        openPack: function(packId) {
            const packs = this.getPacks();
            const pack = packs.find(p => p.id === packId);
            if (!pack || !pack.cards || pack.cards.length === 0) return null;

            const activePool = pack.cards.filter(c => c.active !== false && c.pack_drop !== false);
            if (activePool.length === 0) return null;

            const commons = activePool.filter(c => c.rarity === 'COMMON');
            const rares = activePool.filter(c => c.rarity !== 'COMMON');

            function getRandom(pool) {
                if (!pool || pool.length === 0) return activePool[Math.floor(Math.random() * activePool.length)];
                return pool[Math.floor(Math.random() * pool.length)];
            }

            const result = [];
            const count = pack.cards_per_pack || 4;
            for (let i = 0; i < count; i++) {
                if (i === count - 1 && rares.length > 0) {
                    result.push(getRandom(rares));
                } else {
                    result.push(getRandom(commons.length > 0 ? commons : activePool));
                }
            }

            result.forEach(card => this.addCardToInventory(card));
            return result;
        }
    };

    window.PacksManager = PacksManager;
})(window);
`;

const outputPath = path.resolve(__dirname, '../../frontend/js/data/packs-data.js');
fs.writeFileSync(outputPath, fileContent, 'utf-8');
console.log('✅ Generado con éxito frontend/js/data/packs-data.js con las 126 cartas oficiales de LOB!');
