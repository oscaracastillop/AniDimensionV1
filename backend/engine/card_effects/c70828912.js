/**
 * [Passcode: 70828912] Premature Burial
 * Tipo: Equip Spell | Expansión: PSV
 */
module.exports = {
    id: 70828912,
    name: "Premature Burial",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,

    canEquip(target) {
            return Boolean(target);
        },

    getValidTargets({ duelState, playerKey }) {
            const valid = [];
            (duelState[playerKey]?.monsters || []).forEach((m, idx) => {
                if (!m) valid.push({ playerKey, slotIndex: idx });
            });
            return valid;
        },

    canActivate({ duelState, playerKey }) {
            const pObj = duelState[playerKey];
            if (!pObj) return { canActivate: false, reason: "Estado inválido." };
            if ((pObj.lp || 0) <= 800) return { canActivate: false, reason: "No tienes suficientes Life Points (requiere 800 LP)." };
            const freeSlot = (pObj.monsters || []).some(m => !m);
            if (!freeSlot) return { canActivate: false, reason: "No tienes casillas de monstruo disponibles." };
            const hasMonsterInGY = (pObj.graveyard || []).some(c => {
                const ct = (c.card_data?.type || c.type || '').toLowerCase();
                return ct.includes('monster') && !ct.includes('ritual') && !ct.includes('fusion');
            });
            if (!hasMonsterInGY) return { canActivate: false, reason: "No hay monstruos válidos en tu Cementerio para revivir." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const pObj = duelState[playerKey];
            pObj.lp = Math.max(0, pObj.lp - 800);
            effectUtils.emitDuelLog(duelState.roomId, `🧪 [Premature Burial] ${pObj.username} paga 800 LP. (LP restantes: ${pObj.lp})`, 'spell');

            // Buscar monstruo en GY
            const gyIdx = targetData?.gy_index !== undefined ? targetData.gy_index : (pObj.graveyard || []).findLastIndex(c => {
                const ct = (c.card_data?.type || c.type || '').toLowerCase();
                return ct.includes('monster') && !ct.includes('ritual') && !ct.includes('fusion');
            });
            if (gyIdx === -1 || !pObj.graveyard?.[gyIdx]) return { success: false, reason: "Monstruo no encontrado en Cementerio." };

            const revived = pObj.graveyard.splice(gyIdx, 1)[0];
            const slotIdx = (pObj.monsters || []).findIndex(m => !m);
            if (slotIdx === -1) return { success: false, reason: "No hay espacio en campo." };

            revived.position = 'ATK';
            revived.faceDown = false;
            revived.equippedCards = revived.equippedCards || [];
            revived.equippedCards.push(this.id);
            revived.prematureBurialLinked = true;
            pObj.monsters[slotIdx] = revived;

            // Enlazar con la carta mágica en spells
            const sIdx = (link && link.slot_index !== undefined) ? link.slot_index : (pObj.spells || []).findIndex(s => s && Number(s.card_id || s.card_data?.id) === this.id);
            if (sIdx !== -1 && pObj.spells?.[sIdx]) {
                pObj.spells[sIdx].targetingMonster = { player: playerKey, slot: slotIdx };
            }

            effectUtils.emitDuelLog(duelState.roomId, `⚰️✨ [Premature Burial] ¡Revive a "${revived.card_data?.name || revived.name}" en Modo Ataque y se equipa a él!`, 'special_summon');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
