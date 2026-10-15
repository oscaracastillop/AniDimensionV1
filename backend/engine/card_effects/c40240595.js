module.exports = {
    id: 40240595,
    name: "Cocoon of Evolution",
    type: "Effect Monster",
    atk: 0, def: 2000, level: 3, race: "Insect",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        let equippedTarget = null;
        for (let i = 0; i < monsters.length; i++) {
            if (monsters[i] && monsters[i].id !== 40240595) {
                equippedTarget = monsters[i];
                equippedTarget.def = 2000;
                equippedTarget.atk = 0;
                break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `🕸️ [Cocoon of Evolution] ¡Capullo de Evolución envuelve al monstruo objetivo protegiéndolo con DEF: 2000!`, 'monster');
        return { success: true, target: equippedTarget ? equippedTarget.name : null };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
