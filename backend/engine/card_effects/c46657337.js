module.exports = {
    id: 46657337,
    name: "Muka Muka",
    type: "Effect Monster",
    atk: 600, def: 300, level: 2, race: "Rock",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const handCount = (player.hand || []).length;
        const boost = handCount * 300;
        const monsters = player.monsters || [];
        const selfCard = monsters.find(m => m && m.id === 46657337);
        if (selfCard) {
            selfCard.atk = 600 + boost;
            selfCard.def = 300 + boost;
        }
        effectUtils.emitDuelLog(duelState.roomId, `🪨🤲 [Muka Muka] ¡Poder de la Mano! Gana +300 ATK/DEF por cada carta en mano (+${boost} ATK/DEF por ${handCount} cartas) [ATK total: ${600 + boost}].`, 'monster');
        return { success: true, boost, handCount };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
