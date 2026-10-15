module.exports = {
    id: 93900406,
    name: "Mushroom Man #2",
    type: "Effect Monster",
    atk: 1250, def: 800, level: 3, race: "Warrior",

    async onStandbyPhase(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        player.lp = Math.max(0, (player.lp !== undefined ? player.lp : 8000) - 500);
        effectUtils.emitDuelLog(duelState.roomId, `🍄 [Mushroom Man #2] ¡Esporas parasitarias drenan 500 LP en la Standby Phase (LP actual: ${player.lp})!`, 'monster');
        return { success: true, lpBurn: 500 };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onStandbyPhase({ duelState, playerKey, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
