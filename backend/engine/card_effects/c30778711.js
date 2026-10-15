module.exports = {
    id: 30778711,
    name: "Shadow Ghoul",
    type: "Effect Monster",
    atk: 1600, def: 1300, level: 5, race: "Zombie",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const gy = player.graveyard || [];
        const monsterCountInGY = gy.filter(c => c && (c.type ? c.type.includes('Monster') : true)).length;
        const boost = monsterCountInGY * 100;
        
        const monsters = player.monsters || [];
        const selfCard = monsters.find(m => m && m.id === 30778711);
        if (selfCard) {
            selfCard.atk = 1600 + boost;
        }
        effectUtils.emitDuelLog(duelState.roomId, `🧟‍♂️💀 [Shadow Ghoul] ¡Necrófago de las Sombras absorbe energía del cementerio! (+${boost} ATK por ${monsterCountInGY} monstruos en el GY).`, 'monster');
        return { success: true, boost, monsterCountInGY };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
