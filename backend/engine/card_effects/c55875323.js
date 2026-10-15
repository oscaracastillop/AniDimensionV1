module.exports = {
    id: 55875323,
    name: "Electric Lizard",
    type: "Effect Monster",
    atk: 850, def: 800, level: 3, race: "Thunder",

    async onBattleEnd(context) {
        const { duelState, opponentMonster, effectUtils } = context;
        if (opponentMonster && opponentMonster.race !== 'Zombie') {
            opponentMonster.canAttack = false;
            effectUtils.emitDuelLog(duelState.roomId, `🦎⚡ [Electric Lizard] ¡Parálisis eléctrica! '${opponentMonster.name}' queda paralizado y no puede atacar en su próximo turno.`, 'monster');
            return { success: true, paralyzed: true };
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `🦎⚡ [Electric Lizard] ¡Lagarto Eléctrico emite descargas que paralizan a los atacantes que no sean Zombis!`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
