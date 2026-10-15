module.exports = {
    id: 70138455,
    name: "Blast Juggler",
    type: "Effect Monster",
    atk: 800, def: 900, level: 3, race: "Machine",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opp.monsters || [];
        let destroyed = 0;
        for (let i = 0; i < oppMonsters.length; i++) {
            if (oppMonsters[i] && (oppMonsters[i].atk || 0) <= 1000) {
                effectUtils.sendCardToGraveyard(duelState, opponentKey, oppMonsters[i]);
                oppMonsters[i] = null;
                destroyed++;
                if (destroyed >= 2) break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `💣🎪 [Blast Juggler] ¡Malabarista Explosivo hace estallar sus bombas! Destruyó ${destroyed} monstruo(s) rival(es) con ATK de 1000 o menor.`, 'monster');
        return { success: true, destroyedCount: destroyed };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
