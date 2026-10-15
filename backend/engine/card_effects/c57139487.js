/**
 * [Passcode: 57139487] Chain Disappearance
 * Tipo: Normal Trap
 * Auténtica lógica OCG con mutaciones de estado en el duelo
 */
module.exports = {
    id: 57139487,
    name: "Chain Disappearance",
    type: "Normal Trap",
    atk: 0, def: 0, level: 0, race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opp.monsters || [];
        let banished = null;
        for (let i = 0; i < oppMonsters.length; i++) {
            if (oppMonsters[i]) {
                banished = oppMonsters[i];
                effectUtils.sendCardToBanished(duelState, opponentKey, banished);
                oppMonsters[i] = null;
                break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `🌌 [${this.name}] ¡Destierra al monstruo enemigo '${banished ? banished.name : 'Monstruo'}'!`, 'effect');
        return { success: true, banished: banished ? banished.name : null };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
