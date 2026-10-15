module.exports = {
    id: 87756343,
    name: "Larvae Moth",
    type: "Effect Monster",
    atk: 500, def: 400, level: 2, race: "Insect",
    canSpecialSummonSelf: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        // Tributa Petit Moth equipado o 1 monstruo Insecto
        for (let i = 0; i < monsters.length; i++) {
            if (monsters[i]) {
                effectUtils.sendCardToGraveyard(duelState, playerKey, monsters[i]);
                monsters[i] = null;
                break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `🐛 [Larvae Moth] ¡Polilla Larva emerge sacrificando a Petit Moth!`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
