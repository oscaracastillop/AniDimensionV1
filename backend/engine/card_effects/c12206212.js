module.exports = {
    id: 12206212,
    name: "Harpie Lady Sisters",
    type: "Effect Monster",
    atk: 1950, def: 2100, level: 6, race: "Winged Beast",
    canSpecialSummonSelf: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `🪶 [Harpie Lady Sisters] ¡Las Hermanas de la Dama Arpía descienden al campo con un trío de ráfagas cortantes!`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
