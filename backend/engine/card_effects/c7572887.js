module.exports = {
    id: 7572887,
    name: "D.D. Warrior Lady",
    type: "Effect Monster",
    atk: 1500, def: 1600, level: 4, race: "Warrior",

    async onBattleEnd(context) {
        const { duelState, playerKey, opponentKey, opponentMonster, effectUtils } = context;
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const selfIdx = (player.monsters || []).findIndex(m => m && m.id === 7572887);
        if (selfIdx !== -1) {
            effectUtils.sendCardToBanished(duelState, playerKey, player.monsters[selfIdx]);
            player.monsters[selfIdx] = null;
        }
        if (opponentMonster) {
            effectUtils.sendCardToBanished(duelState, opponentKey, opponentMonster);
        }
        effectUtils.emitDuelLog(duelState.roomId, `🌌⚔️ [D.D. Warrior Lady] ¡Dama Guerrera de la D.D. abre una grieta dimensional y se destierra junto con '${opponentMonster ? opponentMonster.name : 'Monstruo oponente'}'!`, 'monster');
        return { success: true, banishedBoth: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onBattleEnd({ duelState, playerKey, opponentKey, effectUtils });
    },
    async execute(context) {
        return this.onBattleEnd(context);
    }
};
