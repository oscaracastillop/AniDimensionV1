module.exports = {
    id: 21347810,
    name: "Rainbow Flower",
    type: "Effect Monster",
    atk: 400, def: 500, level: 2, race: "Plant",
    canAttackDirectly: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `🌈🌸 [Rainbow Flower] ¡Flor Arcoíris esparce su polen luminoso y puede atacar directamente este turno!`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
