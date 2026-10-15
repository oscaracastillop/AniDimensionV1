/**
 * [Passcode: 70284332] Tuner's Scheme
 * Tipo: Continuous Trap
 * Arquetipo / Expansión: ABPF
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 70284332,
    name: "Tuner's Scheme",
    type: "Continuous Trap",
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
