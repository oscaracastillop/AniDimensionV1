module.exports = {
    id: 25109950,
    name: "The Little Swordsman of Aile",
    type: "Effect Monster",
    atk: 800, def: 1300, level: 3, race: "Warrior",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        let tributed = false;
        let selfCard = null;
        for (let i = 0; i < monsters.length; i++) {
            if (monsters[i]) {
                if (monsters[i].id === 25109950) {
                    selfCard = monsters[i];
                } else if (!tributed) {
                    effectUtils.sendCardToGraveyard(duelState, playerKey, monsters[i]);
                    monsters[i] = null;
                    tributed = true;
                }
            }
        }
        if (selfCard) {
            selfCard.atk = (selfCard.atk || 800) + 700;
        }
        effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [The Little Swordsman of Aile] ¡El Pequeño Espadachín de Aile sacrifica un aliado y gana +700 ATK (ATK actual: ${selfCard ? selfCard.atk : 1500})!`, 'monster');
        return { success: true, buff: 700 };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
