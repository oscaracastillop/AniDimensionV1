module.exports = {
    id: 14141448,
    name: "Great Moth",
    type: "Effect Monster",
    atk: 2600, def: 2500, level: 8, race: "Insect",
    canSpecialSummonSelf: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        // Sacrifica Petit Moth equipado
        for (let i = 0; i < monsters.length; i++) {
            if (monsters[i]) {
                effectUtils.sendCardToGraveyard(duelState, playerKey, monsters[i]);
                monsters[i] = null;
                break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `🦋✨ [Great Moth] ¡La Gran Polilla completa su metamorfosis y desciende con 2600 ATK!`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
