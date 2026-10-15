module.exports = {
    id: 7019529,
    name: "Insect Soldiers of the Sky",
    type: "Effect Monster",
    atk: 1000, def: 800, level: 3, race: "Insect",

    async onDamageCalculation(context) {
        const { duelState, attackingMonster, targetMonster, effectUtils } = context;
        if (targetMonster && targetMonster.attribute === 'WIND') {
            attackingMonster.atk = (attackingMonster.atk || 1000) + 1000;
            effectUtils.emitDuelLog(duelState.roomId, `🪲🌪️ [Insect Soldiers of the Sky] ¡Gana +1000 ATK al combatir contra un monstruo de Atributo VIENTO! (ATK: ${attackingMonster.atk})`, 'monster');
            return { success: true, bonusAtk: 1000 };
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `🪲 [Insect Soldiers of the Sky] ¡Soldados Insecto del Cielo despliegan sus alas aéreas!`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
