/**
 * [Passcode: 40418351] Cyberdark Dragon
 * Tipo: Fusion Monster
 * Arquetipo / Expansión: CDIP
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    canSpecialSummonSelf: true,

    canSpecialSummon({ duelState, playerKey }) {
        const player = duelState[playerKey] || {};
        const gy = player.graveyard || [];
        const hasAttr = gy.some(c => ((c.attribute || c.card_data?.attribute) || '').toUpperCase() === 'WATER');
        if (!hasAttr) {
            return { canSummon: false, reason: 'Requiere desterrar 1 monstruo WATER de tu Cementerio.' };
        }
        return { canSummon: true };
    },

    executeSpecialSummon({ duelState, playerKey, effectUtils }) {
        const player = duelState[playerKey] || {};
        const gy = player.graveyard || [];
        const idx = gy.findIndex(c => ((c.attribute || c.card_data?.attribute) || '').toUpperCase() === 'WATER');
        if (idx !== -1) {
            const [c] = gy.splice(idx, 1);
            effectUtils.sendCardToBanished(duelState, playerKey, c);
            effectUtils.emitDuelLog(duelState.roomId, `🌪️ [Invocación Especial Elemental] Desterró 1 monstruo WATER de su Cementerio.`, 'summon');
        }
    },

    id: 40418351,
    name: "Cyberdark Dragon",
    type: "Fusion Monster",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opp.monsters || [];
        let destroyed = null;
        for (let i = 0; i < oppMonsters.length; i++) {
            if (oppMonsters[i]) {
                destroyed = oppMonsters[i];
                oppMonsters[i] = null;
                effectUtils.sendCardToGraveyard(duelState, destroyed, opponentKey);
                break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `💥 [${this.name}] Destruye el monstruo enemigo '${destroyed ? (destroyed.card_data?.name || destroyed.name) : 'Monstruo'}' en el campo.`, 'destroy');
        return { success: true, destroyed: destroyed ? destroyed.name : null };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
