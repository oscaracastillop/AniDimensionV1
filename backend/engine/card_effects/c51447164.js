/**
 * [Passcode: 51447164] T.G. Blade Blaster
 * Tipo: Synchro Effect Monster
 * Arquetipo / Expansión: EXVC
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 51447164,
    name: "T.G. Blade Blaster",
    type: "Synchro Effect Monster",
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
