/**
 * [Passcode: 7076131] Next to be Lost
 * Tipo: Normal Trap Card
 * Arquetipo / Expansión: SOI
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 7076131,
    name: "Next to be Lost",
    type: "Normal Trap Card",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opp.monsters || [];
        let banished = null;
        for (let i = 0; i < oppMonsters.length; i++) {
            if (oppMonsters[i]) {
                banished = oppMonsters[i];
                oppMonsters[i] = null;
                effectUtils.sendCardToBanished(duelState, banished, opponentKey);
                break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `🌌 [${this.name}] ¡Destierra al monstruo enemigo '${banished ? (banished.card_data?.name || banished.name) : 'Monstruo'}'!`, 'banish');
        return { success: true, banished: banished ? banished.name : null };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
