/**
 * [Passcode: 94377247] Curse of the Masked Beast
 * Tipo: Ritual Spell | Expansión: LON
 */
module.exports = {
    id: 94377247,
    name: "Curse of the Masked Beast",
    type: "Ritual Spell",
    race: "Spell",
    isRitualSpell: true,

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasBeastInHand = (p?.hand || []).some(c => Number(c.card_id || c.id) === 49064413);
            if (!hasBeastInHand) return { canActivate: false, reason: "Debes tener a \"The Masked Beast\" en tu mano." };
            const monsterLevels = (p?.monsters || []).reduce((sum, m) => sum + (m ? (m.card_data?.level || m.level || 0) : 0), 0);
            if (monsterLevels < 8) return { canActivate: false, reason: "El nivel total de los sacrificios en el campo debe ser 8 o más." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const beastIdx = (p.hand || []).findIndex(c => Number(c.card_id || c.id) === 49064413);
            if (beastIdx === -1) return { success: false, reason: "The Masked Beast no encontrado en mano." };

            // Tributar monstruos en campo hasta sumar nivel 8
            let tLevel = 0;
            for (let i = 0; i < 5 && tLevel < 8; i++) {
                if (p.monsters[i]) {
                    const m = p.monsters[i];
                    tLevel += (m.card_data?.level || m.level || 1);
                    p.monsters[i] = null;
                    effectUtils.sendCardToGraveyard(duelState, m, playerKey);
                }
            }

            const freeSlot = (p.monsters || []).findIndex(m => !m);
            const [beast] = p.hand.splice(beastIdx, 1);
            beast.position = 'ATK';
            beast.faceDown = false;
            p.monsters[freeSlot] = beast;

            effectUtils.emitDuelLog(duelState.roomId, `👹🕯️ [Curse of the Masked Beast] ¡Ritual de la Bestia Enmascarada! Sacrifica tributos e Invoca por Ritual a "The Masked Beast" (3200 ATK).`, 'ritual');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
