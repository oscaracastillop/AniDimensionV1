const fs = require('fs');
const path = require('path');
const { getPool } = require('../config/db');

const MAX_LEVEL = 300;

let _cachedActivePacks = new Set(['LOB', 'MRD', 'MRL', 'PSV', 'LON', 'LOD', 'PGD', 'MFC', 'DCR', 'IOC', 'AST']);
let _cachedOverrides = new Map(); // key: `${packId}_${cardId}`
let _lastSyncTime = 0;
const _userPityTracker = new Map(); // key: userId/username -> consecutive dry wins without card drop

async function syncDbOverridesFromSql() {
    try {
        const pool = await getPool();
        if (!pool) return;
        const result = await pool.request().execute('dbo.sp_GetBoosterPacks');
        const packs = result.recordsets[0] || [];
        const overrides = result.recordsets[1] || [];

        const activeSet = new Set();
        for (const p of packs) {
            if (p.IsActive) {
                activeSet.add(p.PackId.toUpperCase());
            }
        }
        _cachedActivePacks = activeSet;

        const ovMap = new Map();
        for (const ov of overrides) {
            ovMap.set(`${ov.PackId.toUpperCase()}_${ov.CardId}`, {
                active: Boolean(ov.IsActive),
                pack_drop: Boolean(ov.PackDrop),
                deck_usable: Boolean(ov.DeckUsable),
                npc_drop: Boolean(ov.NpcDrop)
            });
        }
        _cachedOverrides = ovMap;
        _lastSyncTime = Date.now();
    } catch (err) {}
}

// Iniciar sincronización de fondo inmediata
syncDbOverridesFromSql();
setInterval(syncDbOverridesFromSql, 30000);

const packCardsCache = {};

function getCardsForPack(packCode = 'LOB') {
    const code = (packCode || 'LOB').toUpperCase();
    if (!packCardsCache[code]) {
        const cleanCode = code.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const candidates = [
            `${cleanCode}_cards_frontend.json`,
            `${code.toLowerCase()}_cards_frontend.json`
        ];
        if (code === 'GODS-EGY') candidates.unshift('gods_cards_frontend.json');
        if (code === 'PROMO-DM') candidates.unshift('promo_dm_cards_frontend.json');
        if (code === 'DRLG') candidates.unshift('drlg_cards_frontend.json');

        let loaded = false;
        for (const fn of candidates) {
            const pPath = path.resolve(__dirname, `../data/${fn}`);
            if (fs.existsSync(pPath)) {
                try {
                    packCardsCache[code] = JSON.parse(fs.readFileSync(pPath, 'utf-8'));
                    loaded = true;
                    break;
                } catch (e) {
                    console.error(`[PROG SERVICE] Error al leer ${fn}:`, e);
                }
            }
        }

        if (!loaded) {
            const fallbackPath = path.resolve(__dirname, '../data/lob_cards_frontend.json');
            if (fs.existsSync(fallbackPath)) {
                try { packCardsCache[code] = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8')); } catch(e){ packCardsCache[code] = []; }
            } else {
                packCardsCache[code] = [];
            }
        }
    }
    return packCardsCache[code];
}

class ProgressionService {
    constructor() {
        this.MAX_LEVEL = MAX_LEVEL;
    }

    /**
     * Calcula la Experiencia (EXP) requerida para subir del nivel actual al siguiente (L -> L+1).
     * @param {number} level - Nivel actual (1 a 500)
     * @returns {number} EXP requerida
     */
    getExpRequiredForNextLevel(level) {
        const lvl = Math.max(1, Math.min(this.MAX_LEVEL, parseInt(level, 10) || 1));
        if (lvl >= this.MAX_LEVEL) return 0; // Nivel máximo alcanzado

        // Curva Polinomial Balanceada: EXP(L) = floor(180 * L^1.38 + 70 * L)
        const req = Math.floor(180 * Math.pow(lvl, 1.38) + (70 * lvl));
        return req;
    }

    /**
     * Calcula la Experiencia total acumulada desde Nivel 1 hasta el Nivel dado.
     * @param {number} level
     * @returns {number} EXP total acumulada
     */
    getTotalExpForLevel(level) {
        let total = 0;
        const target = Math.max(1, Math.min(this.MAX_LEVEL, parseInt(level, 10) || 1));
        for (let l = 1; l < target; l++) {
            total += this.getExpRequiredForNextLevel(l);
        }
        return total;
    }

    /**
     * Obtiene el costo / respaldo base de Starships según el nivel de sala.
     */
    getBaseStarshipsForLevel(level) {
        const lvl = Math.max(1, Math.min(this.MAX_LEVEL, parseInt(level || 1, 10)));
        return Math.floor(60 + (12 * Math.pow(lvl, 0.92)) + (6 * Math.pow(lvl, 0.90)));
    }

    /**
     * Calcula las recompensas de EXP y StarShips tras una VICTORIA de duelo con desglose detallado.
     * Implementa escalado por nivel de desafío (Anti-farming) y penalización por rendición express.
     */
    calculateDuelRewards(params = {}) {
        const playerLvl = Math.max(1, Math.min(this.MAX_LEVEL, parseInt(params.playerLevel || 1, 10)));
        const rivalLvl = Math.max(1, Math.min(this.MAX_LEVEL, parseInt(params.rivalLevel || 1, 10)));
        const isPvP = !!params.isPvP;

        const avatarExpBonusPct = Math.max(0, parseFloat(params.avatarExpBonusPct || 0));
        const avatarStarshipsBonusPct = Math.max(0, parseFloat(params.avatarStarshipsBonusPct || 0));
        const avatarLuckBonusPct = Math.max(0, parseFloat(params.avatarLuckBonusPct || 0));

        const vipExpBonusPct = Math.max(0, parseFloat(params.vipExpBonusPct || 0));
        const vipStarshipsBonusPct = Math.max(0, parseFloat(params.vipStarshipsBonusPct || 0));
        const vipLuckBonusPct = Math.max(0, parseFloat(params.vipLuckBonusPct || 0));

        const medalsExpBonusPct = Math.max(0, parseFloat(params.medalsExpBonusPct || 0));
        const medalsStarshipsBonusPct = Math.max(0, parseFloat(params.medalsStarshipsBonusPct || 0));
        const medalsLuckBonusPct = Math.max(0, parseFloat(params.medalsLuckBonusPct || 0));

        const clanExpBonusPct = Math.max(0, parseFloat(params.clanExpBonusPct || 0));
        const clanStarshipsBonusPct = Math.max(0, parseFloat(params.clanStarshipsBonusPct || 0));

        const roomBonusExpPct = Math.max(0, parseFloat(params.roomBonusExpPct || 0));
        const roomBonusStarshipsPct = Math.max(0, parseFloat(params.roomBonusStarshipsPct || 0));
        const roomBonusTitle = (params.roomBonusTitle || '').trim();

        // ESCALADO POR NIVEL DE DESAFÍO (ANTI-FARMING):
        // La base de recompensas se rige por el menor nivel entre ambos jugadores.
        // Si un nivel 500 juega contra un nivel 5, el desafío real es de nivel 5.
        const effectiveChallengeLevel = Math.min(playerLvl, rivalLvl);

        // Penalización si hubo rendición inmediata (Turnos 1 o 2)
        const surrenderPenaltyMult = params.isInstaSurrender ? 0.20 : 1.0;

        // ---------------------------------------------------------------------
        // 1. EXPERIENCIA BASE (EXP)
        // ---------------------------------------------------------------------
        const baseExpCalc = Math.floor(250 + (120 * Math.pow(effectiveChallengeLevel, 1.08)) + (60 * Math.pow(effectiveChallengeLevel, 1.05)));
        const pvpExpMultiplier = isPvP ? 1.50 : 1.0;
        const calculatedBaseExp = Math.max(50, Math.round(baseExpCalc * pvpExpMultiplier * surrenderPenaltyMult));

        // Porcentajes aditivos sobre la base
        const avatarExpAmount = Math.round(calculatedBaseExp * (avatarExpBonusPct / 100));
        const vipExpAmount = Math.round(calculatedBaseExp * (vipExpBonusPct / 100));
        const medalsExpAmount = Math.round(calculatedBaseExp * (medalsExpBonusPct / 100));
        const clanExpAmount = Math.round(calculatedBaseExp * (clanExpBonusPct / 100));
        const roomBonusExpAmount = Math.round(calculatedBaseExp * (roomBonusExpPct / 100));

        const totalExp = Math.max(50, calculatedBaseExp + avatarExpAmount + vipExpAmount + medalsExpAmount + clanExpAmount + roomBonusExpAmount);

        // ---------------------------------------------------------------------
        // 2. STARSHIPS BASE
        // ---------------------------------------------------------------------
        const baseStCalc = Math.floor(60 + (12 * Math.pow(effectiveChallengeLevel, 0.92)) + (6 * Math.pow(effectiveChallengeLevel, 0.90)));
        const pvpStMultiplier = isPvP ? 1.50 : 1.0;
        const calculatedBaseStarships = Math.max(20, Math.round(baseStCalc * pvpStMultiplier * surrenderPenaltyMult));

        // Porcentajes aditivos sobre la base
        const avatarStarshipsAmount = Math.round(calculatedBaseStarships * (avatarStarshipsBonusPct / 100));
        const vipStarshipsAmount = Math.round(calculatedBaseStarships * (vipStarshipsBonusPct / 100));
        const medalsStarshipsAmount = Math.round(calculatedBaseStarships * (medalsStarshipsBonusPct / 100));
        const clanStarshipsAmount = Math.round(calculatedBaseStarships * (clanStarshipsBonusPct / 100));
        const roomBonusStarshipsAmount = Math.round(calculatedBaseStarships * (roomBonusStarshipsPct / 100));

        const totalStarships = Math.max(20, calculatedBaseStarships + avatarStarshipsAmount + vipStarshipsAmount + medalsStarshipsAmount + clanStarshipsAmount + roomBonusStarshipsAmount);

        // ---------------------------------------------------------------------
        // 3. SUERTE TOTAL Y PROBABILIDAD DE DROP (0% - 100%)
        // ---------------------------------------------------------------------
        const totalLuckPct = Math.min(100, Math.max(0, avatarLuckBonusPct + vipLuckBonusPct + medalsLuckBonusPct));
        // Si Suerte == 100% -> 100% de probabilidad de drop.
        // Si Suerte == 0% -> 10% base de probabilidad de drop.
        const dropProbability = 0.10 + (0.90 * (totalLuckPct / 100));
        const dropProbabilityPct = Math.round(dropProbability * 1000) / 10;

        return {
            playerLevel: playerLvl,
            rivalLevel: rivalLvl,
            isPvP: isPvP,
            exp: {
                base: calculatedBaseExp,
                avatarBonusPct: avatarExpBonusPct,
                avatarBonusAmount: avatarExpAmount,
                vipBonusPct: vipExpBonusPct,
                vipBonusAmount: vipExpAmount,
                medalsBonusPct: medalsExpBonusPct,
                medalsBonusAmount: medalsExpAmount,
                clanBonusPct: clanExpBonusPct,
                clanBonusAmount: clanExpAmount,
                roomBonusPct: roomBonusExpPct,
                roomBonusAmount: roomBonusExpAmount,
                roomBonusTitle: roomBonusTitle,
                total: totalExp
            },
            starships: {
                base: calculatedBaseStarships,
                avatarBonusPct: avatarStarshipsBonusPct,
                avatarBonusAmount: avatarStarshipsAmount,
                vipBonusPct: vipStarshipsBonusPct,
                vipBonusAmount: vipStarshipsAmount,
                medalsBonusPct: medalsStarshipsBonusPct,
                medalsBonusAmount: medalsStarshipsAmount,
                clanBonusPct: clanStarshipsBonusPct,
                clanBonusAmount: clanStarshipsAmount,
                roomBonusPct: roomBonusStarshipsPct,
                roomBonusAmount: roomBonusStarshipsAmount,
                roomBonusTitle: roomBonusTitle,
                total: totalStarships
            },
            luck: {
                avatarLuckPct: avatarLuckBonusPct,
                vipLuckPct: vipLuckBonusPct,
                medalsLuckPct: medalsLuckBonusPct,
                totalLuckPct: totalLuckPct,
                dropProbabilityPct: dropProbabilityPct
            }
        };
    }

    /**
    /**
     * Motor de Drop de Cartas calibrado con Protección contra Mala Racha (Pity System).
     * - Suerte 0%: 32% base de probabilidad de drop.
     * - Suerte 100%: 100% garantizado de drop.
     * - Protección Pity: Cada victoria consecutiva sin drop suma +15% de probabilidad acumulativa.
     *   (Garantiza que ningún jugador pase más de 4-5 duelos seguidos sin obtener carta).
     * - Calidad Progresiva: La suerte incrementa la probabilidad de cartas Raras, Super Raras y Ultra Raras.
     * 
     * @param {Object} options
     * @param {number|string} [options.userId] - Id del jugador para el sistema de Pity
     * @param {string} [options.username] - Nombre del jugador
     * @param {number} options.luckPct - Suerte total del avatar (0 a 100)
     * @param {boolean} options.isPvP - Si el duelo fue PvP
     * @param {number} options.playerLevel - Nivel del jugador (1 a 500)
     * @param {string} options.packId - Código del sobre (LOB, MRD, MRL, PSV, etc.)
     * @returns {Object|null} Carta ganada o null si no cayó drop
     */
    rollCardDrop(options = {}) {
        const luckPct = Math.min(100, Math.max(0, parseFloat(options.luckPct || 0)));
        const isPvP = !!options.isPvP;
        let packId = (options.packId || 'LOB').toUpperCase();
        const userKey = String(options.userId || options.username || 'default_player');

        if (Date.now() - _lastSyncTime > 60000) {
            syncDbOverridesFromSql();
        }

        // Obtener contador de victorias consecutivas sin drop (Pity System)
        const dryWins = _userPityTracker.get(userKey) || 0;

        // Curva Progresiva:
        // Base a 0% suerte = 32%
        // A 100% suerte = 100%
        // Pity Bonus = +15% por cada duelo ganado sin carta (a 4 duelos secos -> 32 + 60 = 92%, a 5 -> 100%)
        const baseProb = 0.32 + (0.68 * (luckPct / 100));
        const pityBonus = dryWins * 0.15;
        const finalDropProbability = Math.min(1.0, baseProb + pityBonus);

        const roll = Math.random();
        if (roll > finalDropProbability) {
            // No cayó carta en esta victoria -> incrementar contador de mala racha
            _userPityTracker.set(userKey, dryWins + 1);
            return null;
        }

        // Cayó drop -> reiniciar contador de protección
        _userPityTracker.set(userKey, 0);

        // Obtener cartas del sobre (con fallback inteligente a LOB si el archivo no existe o está vacío)
        let allCards = getCardsForPack(packId);
        if (!allCards || allCards.length === 0) {
            packId = 'LOB';
            allCards = getCardsForPack('LOB');
        }
        if (!allCards || allCards.length === 0) return null;

        // Filtrar cartas elegibles para drop de NPC (independiente de la tienda pública)
        const eligiblePool = allCards.filter(c => {
            const cardId = parseInt(c.card_id || c.id, 10);
            const ov = _cachedOverrides.get(`${packId}_${cardId}`);
            if (ov && ov.npc_drop === false) return false;
            if (c.npc_drop === false) return false;
            return true;
        });

        const poolToUse = eligiblePool.length > 0 ? eligiblePool : allCards;

        // Clasificar por rarezas
        const secretRares = poolToUse.filter(c => c.rarity === 'SECRET_RARE');
        const ultraRares = poolToUse.filter(c => c.rarity === 'ULTRA_RARE');
        const superRares = poolToUse.filter(c => c.rarity === 'SUPER_RARE');
        const rares = poolToUse.filter(c => c.rarity === 'RARE');
        const commons = poolToUse.filter(c => c.rarity === 'COMMON' || !c.rarity);

        // Pesos de rareza progresivos según Suerte (0% a 100%):
        // Base (Suerte 0): Common 62%, Rare 26%, SuperRare 8.5%, UltraRare 3%, SecretRare 0.5%
        // Max (Suerte 100): Common 24%, Rare 34%, SuperRare 24%, UltraRare 13%, SecretRare 5%
        const luckFactor = luckPct / 100;
        const weightSecret = 0.5 + (4.5 * luckFactor);
        const weightUltra = 3.0 + (10.0 * luckFactor);
        const weightSuper = 8.5 + (15.5 * luckFactor);
        const weightRare = 26.0 + (8.0 * luckFactor);

        const rarityRoll = Math.random() * 100;
        let selectedPool = commons;

        if (rarityRoll <= weightSecret && secretRares.length > 0) {
            selectedPool = secretRares;
        } else if (rarityRoll <= (weightSecret + weightUltra) && ultraRares.length > 0) {
            selectedPool = ultraRares;
        } else if (rarityRoll <= (weightSecret + weightUltra + weightSuper) && superRares.length > 0) {
            selectedPool = superRares;
        } else if (rarityRoll <= (weightSecret + weightUltra + weightSuper + weightRare) && rares.length > 0) {
            selectedPool = rares;
        } else {
            selectedPool = commons.length > 0 ? commons : poolToUse;
        }

        const chosenIndex = Math.floor(Math.random() * selectedPool.length);
        const card = selectedPool[chosenIndex];
        const cardNumericId = parseInt(card.card_id || card.id, 10);

        return {
            id: cardNumericId,
            card_id: cardNumericId,
            name: card.name,
            set: card.set || packId,
            rarity: card.rarity || 'COMMON',
            type: card.type || 'Monster',
            atk: card.atk,
            def: card.def,
            level: card.level,
            attribute: card.attribute,
            race: card.race,
            desc: card.desc,
            imageUrl: `assets/images/cards/${cardNumericId}.jpg`,
            fallbackImageUrl: `https://images.ygoprodeck.com/images/cards/${cardNumericId}.jpg`,
            pityTriggered: dryWins > 0,
            dryWinsPrev: dryWins
        };
    }

    /**
     * Aplica la EXP ganada a un usuario y calcula los ascensos de nivel correspondientes.
     * @param {number} currentLevel - Nivel actual del usuario (1-500)
     * @param {number} currentExp - Experiencia actual dentro del nivel
     * @param {number} expGained - EXP a sumar
     * @returns {Object} Nuevo nivel, nueva EXP, niveles subidos y si alcanzó max level
     */
    applyExpProgress(currentLevel, currentExp, expGained) {
        const oldLevel = Math.max(1, Math.min(this.MAX_LEVEL, parseInt(currentLevel, 10) || 1));
        const oldExp = Math.max(0, parseInt(currentExp, 10) || 0);

        let level = oldLevel;
        let exp = oldExp + Math.max(0, parseInt(expGained, 10) || 0);
        let levelsGained = 0;

        while (level < this.MAX_LEVEL) {
            const req = this.getExpRequiredForNextLevel(level);
            if (exp >= req) {
                exp -= req;
                level++;
                levelsGained++;
            } else {
                break;
            }
        }

        // Si alcanzó el nivel máximo (500), fijar progreso al 100%
        if (level >= this.MAX_LEVEL) {
            level = this.MAX_LEVEL;
            exp = 0;
        }

        const nextLevelReq = this.getExpRequiredForNextLevel(level);
        const progressPercent = nextLevelReq > 0 ? Math.min(100, Math.round((exp / nextLevelReq) * 100)) : 100;

        return {
            oldLevel: oldLevel,
            oldExp: oldExp,
            newLevel: level,
            newExp: exp,
            expGained: expGained,
            expRequiredForNextLevel: nextLevelReq,
            progressPercent: progressPercent,
            levelsGained: levelsGained,
            isLeveledUp: levelsGained > 0,
            isMaxLevel: level >= this.MAX_LEVEL
        };
    }
}

const progressionService = new ProgressionService();

module.exports = {
    progressionService,
    MAX_LEVEL
};

