module.exports = {
    id: 98049915,
    name: "Mystic Lamp",
    type: "Effect Monster",
    atk: 400, def: 300, level: 1, race: "Spellcaster",
    canAttackDirectly: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `🪔 [Mystic Lamp] ¡Lámpara Mística puede atacar directamente a los Life Points del rival!`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
