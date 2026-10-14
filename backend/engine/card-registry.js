/**
 * Ani-Dimension: Registro Maestro de Efectos de Cartas Nativos en JavaScript
 * Reemplaza y supera al motor WebAssembly Lua con ejecución pura, rápida y sin bloqueos.
 */
const fs = require('fs');
const path = require('path');
const { ocgCardReader } = require('../data/sql-card-reader');

function getDuelStateModule() {
    return require('./duel-state');
}

const cardEffectsMap = new Map();
const effectsDir = path.join(__dirname, 'card_effects');

function loadAllCardEffects() {
    if (!fs.existsSync(effectsDir)) return;
    const files = fs.readdirSync(effectsDir);
    let loadedCount = 0;

    files.forEach(file => {
        if (file.endsWith('.js')) {
            try {
                const modPath = path.join(effectsDir, file);
                delete require.cache[require.resolve(modPath)];
                const effectModule = require(modPath);
                if (effectModule && effectModule.id) {
                    cardEffectsMap.set(Number(effectModule.id), effectModule);
                    loadedCount++;
                }
            } catch (err) {
                console.error(`[CARD REGISTRY ERROR] Error al cargar módulo ${file}:`, err.message);
            }
        }
    });

    console.log(`✅ [NATIVE CARD REGISTRY] Cargados ${loadedCount} módulos nativos de efectos de cartas en memoria (LOB, MRD, SRL, PSV, LON, LOD, PGD, MFC, DCR, IOC & AST).`);
}

loadAllCardEffects();

function getCardEffect(cardId) {
    if (!cardId) return null;
    return cardEffectsMap.get(Number(cardId)) || null;
}

function hasCardEffect(cardId) {
    if (!cardId) return false;
    return cardEffectsMap.has(Number(cardId));
}

function isDragonMonster(m) {
    if (!m) return false;
    const mData = m.card_data || (typeof ocgCardReader === 'function' ? ocgCardReader(m.card_id || m.id) : null) || m;
    const race = (mData.race || m.race || '').toString().toLowerCase();
    const type = (mData.type || m.type || '').toString().toLowerCase();
    const name = (mData.name || m.name || '').toString().toLowerCase();
    const raceCode = Number(mData.raceCode || m.raceCode || 0);
    
    if ((raceCode & 0x2000) !== 0) return true; // RACE_DRAGON = 0x2000
    if (race === 'dragon' || race.includes('dragon') || race.includes('dragón')) return true;
    if (type.includes('dragon') || type.includes('dragón')) return true;
    if (name.includes('dragon') || name.includes('dragón')) return true;
    return false;
}

const effectUtils = {
    get emitDuelLog() { return getDuelStateModule().emitDuelLog; },
    get sendCardToGraveyard() { return getDuelStateModule().sendCardToGraveyard; },
    get sendCardToBanished() { return getDuelStateModule().sendCardToBanished; },
    get calculateMonsterCurrentStats() { return getDuelStateModule().calculateMonsterCurrentStats; },
    get checkDuelGameOver() { return getDuelStateModule().checkDuelGameOver; },
    get cleanAttachedEquipsAndContinuousEffects() { return getDuelStateModule().cleanAttachedEquipsAndContinuousEffects; },
    get cleanupOrphanedEquipCards() { return getDuelStateModule().cleanupOrphanedEquipCards; },
    ocgCardReader,
    isDragonMonster
};

async function executeNativeCardEffect(roomId, cardData, playerKey, opponentKey, targetData = null, link = null) {
    const duelRooms = getDuelStateModule().duelRooms;
    const duelState = duelRooms ? duelRooms.get(roomId) : null;
    if (!duelState) return { success: false };

    const cId = Number(cardData.id || cardData.card_id || 0);
    const effectMod = getCardEffect(cId);

    if (effectMod) {
        try {
            if (typeof effectMod.onActivate === 'function') {
                return await effectMod.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
            } else if (typeof effectMod.execute === 'function') {
                return await effectMod.execute({
                    roomId,
                    duelState,
                    player: duelState[playerKey],
                    opponent: duelState[opponentKey],
                    playerKey,
                    opponentKey,
                    targetData,
                    link,
                    ...effectUtils
                });
            }
        } catch (e) {
            console.error(`[NATIVE EFFECT ERROR] Error al ejecutar efecto de carta #${cId} (${effectMod.name}):`, e);
            return { success: false, error: e.message };
        }
    }

    return { success: false, noNativeEffect: true };
}

/**
 * Recarga un módulo de efecto de carta en memoria en caliente (Hot-Reload)
 * sin reiniciar Node.js ni desconectar duelos activos.
 * @param {number|string} cardId - ID numérico de la carta (passcode)
 * @returns {Object} Resultado de la recarga
 */
function hotReloadCardEffect(cardId) {
    if (!cardId) return { success: false, error: 'ID de carta no especificado' };
    const numId = Number(cardId);
    const fileName = `c${numId}.js`;
    const modPath = path.join(effectsDir, fileName);

    if (!fs.existsSync(modPath)) {
        return { success: false, error: `El archivo ${fileName} no existe en card_effects` };
    }

    try {
        const resolved = require.resolve(modPath);
        delete require.cache[resolved];
        const effectModule = require(modPath);
        if (effectModule && effectModule.id) {
            cardEffectsMap.set(Number(effectModule.id), effectModule);
            console.log(`⚡ [HOT-RELOAD] Módulo c${numId}.js (${effectModule.name || 'Carta'}) recargado en memoria exitosamente.`);
            return {
                success: true,
                cardId: numId,
                name: effectModule.name,
                reloadedAt: new Date().toISOString()
            };
        } else {
            return { success: false, error: 'El módulo no exporta un ID válido' };
        }
    } catch (err) {
        console.error(`❌ [HOT-RELOAD ERROR] Falló recarga de c${numId}.js:`, err.message);
        return { success: false, error: err.message };
    }
}

module.exports = {
    cardEffectsMap,
    loadAllCardEffects,
    getCardEffect,
    hasCardEffect,
    hotReloadCardEffect,
    executeNativeCardEffect,
    effectUtils
};
