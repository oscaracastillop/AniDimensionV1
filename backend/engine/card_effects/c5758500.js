/**
 * [Passcode: 5758500] Soul Release
 * Tipo: Normal Spell
 */
module.exports = {
    id: 5758500,
    name: "Soul Release",
    type: "Normal Spell",
    race: "Spell",
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        let banished = 0;
        [opponentKey, playerKey].forEach(pk => {
            const gy = duelState[pk]?.graveyard || [];
            while (gy.length > 0 && banished < 5) {
                const c = gy.pop();
                effectUtils.sendCardToBanished(duelState, c, pk);
                banished++;
            }
        });
        effectUtils.emitDuelLog(duelState.roomId, `👻🌌 [Soul Release] ¡Destierra ${banished} cartas de los cementerios!`, 'spell');
        return { success: true, banished };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
