/**
 * [Passcode: 62279055] Magic Cylinder
 * Tipo: Normal Trap | Expansión: LON
 */
module.exports = {
    id: 62279055,
    name: "Magic Cylinder",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,
    isAttackTrap: true,

    canActivate({ duelState, opponentKey }) {
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || 'player2';
            const opp = duelState[oppKey];
            const atkDmg = targetData?.attacker_atk !== undefined ? targetData.attacker_atk : 2000;

            // Negar ataque
            duelState.attackNegated = true;

            // Infligir daño igual al ATK al rival
            opp.lp = Math.max(0, (opp.lp || 8000) - atkDmg);
            effectUtils.emitDuelLog(duelState.roomId, `🎩✨💥 [Magic Cylinder] ¡Cilindro Mágico niega el ataque y redirige toda su potencia (${atkDmg} ATK) como daño directo a ${opp.username}! (LP: ${opp.lp})`, 'damage');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
