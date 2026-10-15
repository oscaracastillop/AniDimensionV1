/**
 * [Passcode: 24094653] Polymerization (Polimerización)
 * Tipo: Normal Spell | Expansión: LOB
 * Descripción Oficial:
 * Fusion Summon 1 Fusion Monster from your Extra Deck, using monsters from your hand 
 * or field as Fusion Material.
 * 
 * Regla Oficial OCG:
 * Solo puede activarse si el jugador posee en su Extra Deck al menos 1 Monstruo de Fusión
 * que pueda ser Invocado por Fusión usando los materiales disponibles en su mano y/o campo.
 */
const { ocgCardReader } = require('../../data/sql-card-reader');

function checkFusionMaterialsMatch(reqMaterials, handMonsters, fieldMonsters) {
    if (!Array.isArray(reqMaterials) || reqMaterials.length < 2) return null;
    const availablePool = [
        ...handMonsters.map(m => ({ ...m, _loc: 'HAND' })),
        ...fieldMonsters.map(m => ({ ...m, _loc: 'FIELD' }))
    ];

    const matched = [];
    const usedIndices = new Set();

    for (const req of reqMaterials) {
        let foundIdx = -1;
        for (let i = 0; i < availablePool.length; i++) {
            if (usedIndices.has(i)) continue;
            const cand = availablePool[i];
            const cId = Number(cand.card_id || cand.id || (cand.card_data && cand.card_data.id) || 0);
            const cName = String(cand.name || (cand.card_data && cand.card_data.name) || '').toLowerCase();

            if (typeof req === 'number') {
                if (cId === req) {
                    foundIdx = i;
                    break;
                }
            } else if (typeof req === 'string') {
                const reqLower = req.toLowerCase();
                if (cName === reqLower || cName.includes(reqLower)) {
                    foundIdx = i;
                    break;
                }
            }
        }

        if (foundIdx !== -1) {
            usedIndices.add(foundIdx);
            matched.push(availablePool[foundIdx]);
        } else {
            return null; // Falta al menos 1 material requerido
        }
    }

    return matched;
}

module.exports = {
    id: 24094653,
    name: "Polymerization",
    type: "Normal Spell",
    race: "Spell",
    isPolymerization: true,

    // 1. Verificación canónica de activación OCG
    canActivate({ duelState, playerKey, opponentKey }) {
        const player = duelState[playerKey];
        if (!player) return { canActivate: false, reason: 'Estado del jugador no disponible.' };

        const extraDeck = player.extraDeck || [];
        if (extraDeck.length === 0) {
            return { canActivate: false, reason: 'No tienes monstruos de Fusión en tu Extra Deck.' };
        }

        // Casillas libres en campo para recibir al Monstruo de Fusión (a menos que todos los materiales provengan del campo)
        const emptySlots = (player.monsters || []).filter(m => m === null).length;

        // Monstruos disponibles en mano (excluyendo la propia Polimerización)
        const handMonsters = (player.hand || []).filter(c => {
            if (!c) return false;
            const cId = Number(c.card_id || c.id || (c.card_data && c.card_data.id) || 0);
            if (cId === 24094653) return false;
            const cData = c.card_data || c;
            const t = (cData.type || c.type || '').toLowerCase();
            return !t.includes('spell') && !t.includes('trap') && (t.includes('monster') || (cData.atk !== null && cData.atk !== undefined));
        });

        // Monstruos boca arriba en campo
        const fieldMonsters = (player.monsters || []).filter(m => m !== null && !m.faceDown);

        if (handMonsters.length + fieldMonsters.length < 2) {
            return { canActivate: false, reason: 'No tienes suficientes monstruos en tu mano o campo para una Invocación por Fusión.' };
        }

        const { getCardEffect } = require('../card-registry');
        const availableFusions = [];

        for (const fCard of extraDeck) {
            const fId = Number(fCard.card_id || fCard.id || (fCard.card_data && fCard.card_data.id) || 0);
            const fMod = getCardEffect(fId);
            const reqMats = fMod?.fusionMaterials || fCard.fusionMaterials || (fCard.card_data && fCard.card_data.fusionMaterials);

            if (Array.isArray(reqMats) && reqMats.length >= 2) {
                const matched = checkFusionMaterialsMatch(reqMats, handMonsters, fieldMonsters);
                if (matched) {
                    const fieldMatsUsed = matched.filter(m => m._loc === 'FIELD').length;
                    // Se requiere al menos 1 casilla libre O que se libere una casilla con material del campo
                    if (emptySlots > 0 || fieldMatsUsed > 0) {
                        availableFusions.push({
                            fusionCard: fCard,
                            materials: matched,
                            fusionId: fId
                        });
                    }
                }
            }
        }

        if (availableFusions.length === 0) {
            return { 
                canActivate: false, 
                reason: 'No tienes los materiales necesarios en tu mano o campo para ningún Monstruo de Fusión de tu Extra Deck.' 
            };
        }

        return { canActivate: true, availableFusions };
    },

    // 2. Ejecución de la Invocación por Fusión
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey];
        if (!player) return { success: false, reason: 'Jugador no encontrado.' };

        const fusionCardId = Number(targetData?.fusion_card_id || targetData?.fusionCardId || 0);
        const materials = targetData?.materials;

        if (!fusionCardId || !Array.isArray(materials) || materials.length < 2) {
            return { 
                success: false, 
                requiresTargetSelection: true,
                reason: 'Debes seleccionar el Monstruo de Fusión y los materiales a utilizar.' 
            };
        }

        // Buscar el monstruo de fusión en el Extra Deck
        const extraIdx = (player.extraDeck || []).findIndex(c => Number(c.id || c.card_id || (c.card_data && c.card_data.id)) === fusionCardId);
        if (extraIdx === -1) {
            return { success: false, reason: 'El Monstruo de Fusión seleccionado no está en tu Extra Deck.' };
        }

        const [fusionCard] = player.extraDeck.splice(extraIdx, 1);
        player.extraDeckCount = player.extraDeck.length;

        // Consumir materiales de mano y campo enviándolos al Cementerio
        const matNames = [];
        for (const mat of materials) {
            const mId = Number(mat.card_id || mat.id || 0);
            const mLoc = mat.location || mat._loc;

            if (mLoc === 'FIELD') {
                const sIdx = Number(mat.slot_index !== undefined ? mat.slot_index : mat.slot);
                if (sIdx >= 0 && sIdx < 5 && player.monsters[sIdx]) {
                    const mCard = player.monsters[sIdx];
                    matNames.push(mCard.card_data?.name || mCard.name || 'Monstruo');
                    effectUtils.sendCardToGraveyard(duelState, mCard, playerKey);
                    player.monsters[sIdx] = null;
                }
            } else {
                const hIdx = (player.hand || []).findIndex(c => Number(c.id || c.card_id) === mId);
                if (hIdx !== -1) {
                    const mCard = player.hand.splice(hIdx, 1)[0];
                    matNames.push(mCard.card_data?.name || mCard.name || 'Monstruo');
                    effectUtils.sendCardToGraveyard(duelState, mCard, playerKey);
                }
            }
        }

        // Invocar el Monstruo de Fusión en la primera casilla libre
        const emptySlot = player.monsters.findIndex(m => m === null);
        if (emptySlot === -1) {
            // Revertir si no hay espacio (no debería ocurrir tras enviar materiales)
            player.extraDeck.push(fusionCard);
            return { success: false, reason: 'No hay casillas disponibles para el Monstruo de Fusión.' };
        }

        const fData = (typeof effectUtils.ocgCardReader === 'function' ? effectUtils.ocgCardReader(fusionCardId) : null) 
            || fusionCard.card_data || fusionCard;

        player.monsters[emptySlot] = {
            card_id: fusionCardId,
            position: 'ATK',
            faceDown: false,
            hasAttacked: false,
            turnSummoned: duelState.turnNumber,
            hasChangedPosition: false,
            originalOwner: playerKey,
            card_data: { ...fData, id: fusionCardId, card_id: fusionCardId, originalOwner: playerKey }
        };

        effectUtils.calculateMonsterCurrentStats(player.monsters[emptySlot], duelState, playerKey);

        effectUtils.emitDuelLog(
            duelState.roomId,
            `🌀⭐ [Invocación por Fusión] ¡${player.username || playerKey} fusiona ${matNames.join(' + ')} e Invoca por Fusión a "${fData.name}" (${fData.atk} ATK)!`,
            'summon'
        );

        return { success: true, fusionMonster: player.monsters[emptySlot] };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
