module.exports = {
    id: 93920745,
    name: "Penguin Soldier",
    type: "Flip Effect Monster",
    atk: 750, def: 500, level: 2, race: "Aqua",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onFlip(context) {
        const { duelState, opponentKey, effectUtils } = context;
        const opponent = duelState[opponentKey];
        let returned = 0;

        if (opponent && Array.isArray(opponent.monsters)) {
            for (let i = 0; i < opponent.monsters.length && returned < 2; i++) {
                if (opponent.monsters[i]) {
                    opponent.hand = opponent.hand || [];
                    opponent.hand.push(opponent.monsters[i]);
                    opponent.monsters[i] = null;
                    returned++;
                }
            }
        }

        effectUtils.emitDuelLog(duelState.roomId, `🐧📦 [Penguin Soldier] ¡Regresó ${returned} monstruo(s) del campo a la mano!`, 'monster');
        return { success: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onFlip({ duelState, opponentKey, effectUtils });
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
