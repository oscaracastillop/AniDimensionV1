module.exports = {
    id: 44729197,
    name: "Steamroid",
    type: "EFFECT_MONSTER",
    onAttackDeclare: (duelState, attacker, defender, playerKey, opponentKey, utils) => {
        if (attacker && (attacker.card_id === 44729197 || attacker.id === 44729197)) {
            attacker.tempAtkBonus = (attacker.tempAtkBonus || 0) + 500;
            utils.emitDuelLog(duelState.roomId, `🚂 [Steamroid] ¡A todo vapor! Gana +500 ATK al atacar (ATK: ${(attacker.atk || 1800) + 500}).`);
        }
    }
};