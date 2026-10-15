/**
 * [Passcode: 73001017] Silpheed
 * Tipo: Effect Monster
 * Auténtica lógica OCG con mutaciones de estado en el duelo
 */
module.exports = {
    canSpecialSummonSelf: true,

    canSpecialSummon({ duelState, playerKey }) {
        const player = duelState[playerKey] || {};
        const gy = player.graveyard || [];
        const hasAttr = gy.some(c => ((c.attribute || c.card_data?.attribute) || '').toUpperCase() === 'WIND');
        if (!hasAttr) {
            return { canSummon: false, reason: 'Requiere desterrar 1 monstruo WIND de tu Cementerio.' };
        }
        return { canSummon: true };
    },

    executeSpecialSummon({ duelState, playerKey, effectUtils }) {
        const player = duelState[playerKey] || {};
        const gy = player.graveyard || [];
        const idx = gy.findIndex(c => ((c.attribute || c.card_data?.attribute) || '').toUpperCase() === 'WIND');
        if (idx !== -1) {
            const [c] = gy.splice(idx, 1);
            effectUtils.sendCardToBanished(duelState, playerKey, c);
            effectUtils.emitDuelLog(duelState.roomId, `🌪️ [Invocación Especial Elemental] Desterró 1 monstruo WIND de su Cementerio.`, 'summon');
        }
    },

    id: 73001017,
    name: "Silpheed",
    type: "Effect Monster",
    atk: 0, def: 0, level: 0, race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opp.monsters || [];
        let destroyed = null;
        for (let i = 0; i < oppMonsters.length; i++) {
            if (oppMonsters[i]) {
                destroyed = oppMonsters[i];
                effectUtils.sendCardToGraveyard(duelState, opponentKey, destroyed);
                oppMonsters[i] = null;
                break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `💥 [${this.name}] Destruye el monstruo enemigo '${destroyed ? destroyed.name : 'Monstruo'}' en el campo.`, 'effect');
        return { success: true, destroyed: destroyed ? destroyed.name : null };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
