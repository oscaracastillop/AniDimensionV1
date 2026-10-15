/**
 * [Passcode: 11593137] Chaos Trap Hole
 * Tipo: Counter Trap
 * Arquetipo / Expansión: TSHD
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 11593137,
    name: "Chaos Trap Hole",
    type: "Counter Trap",
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
