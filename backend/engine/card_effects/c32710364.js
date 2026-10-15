/**
 * [Passcode: 32710364] Crystal Beast Ruby Carbuncle
 * Tipo: Effect
 * Arquetipo / Expansión: FOTB
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 32710364,
    name: "Crystal Beast Ruby Carbuncle",
    type: "Effect",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppSpells = opp.spells || [];
        let destroyed = null;
        for (let i = 0; i < oppSpells.length; i++) {
            if (oppSpells[i]) {
                destroyed = oppSpells[i];
                oppSpells[i] = null;
                effectUtils.sendCardToGraveyard(duelState, destroyed, opponentKey);
                break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `💥 [${this.name}] Destruye la carta mágica/trampa enemiga '${destroyed ? (destroyed.card_data?.name || destroyed.name) : 'Magia/Trampa'}' en el campo.`, 'destroy');
        return { success: true, destroyed: destroyed ? destroyed.name : null };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
