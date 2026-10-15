module.exports = {
    id: 83555666,
    name: "Ring of Destruction",
    type: "Trap Card",
    atk: 0, def: 0, level: 0, race: "Normal",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const oppMonsters = opp.monsters || [];

        let destroyed = null;
        for (let i = 0; i < oppMonsters.length; i++) {
            if (oppMonsters[i] && !oppMonsters[i].faceDown) {
                destroyed = oppMonsters[i];
                effectUtils.sendCardToGraveyard(duelState, opponentKey, destroyed);
                oppMonsters[i] = null;
                break;
            }
        }
        const dmg = destroyed ? (destroyed.atk || 1000) : 1000;
        player.lp = Math.max(0, (player.lp !== undefined ? player.lp : 8000) - dmg);
        opp.lp = Math.max(0, (opp.lp !== undefined ? opp.lp : 8000) - dmg);

        effectUtils.emitDuelLog(duelState.roomId, `💍💥 [Ring of Destruction] ¡El Anillo de la Destrucción detona a '${destroyed ? destroyed.name : 'Monstruo'}' e inflige ${dmg} puntos de daño a ambos duelistas!`, 'trap');
        return { success: true, damage: dmg };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
