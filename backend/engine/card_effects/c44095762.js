/**
 * [Passcode: 44095762] Mirror Force
 * Tipo: Normal Trap
 */
module.exports = {
    id: 44095762,
    name: "Mirror Force",
    type: "Normal Trap",
    race: "Trap",
    
    isAttackTrap: true,
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        let destroyed = 0;
        (duelState[opponentKey]?.monsters || []).forEach((m, idx) => {
            if (m && !m.faceDown && m.position === 'ATK') {
                duelState[opponentKey].monsters[idx] = null;
                effectUtils.sendCardToGraveyard(duelState, m, opponentKey);
                destroyed++;
            }
        });
        if (duelState.pendingAction && duelState.pendingAction.type === 'ATTACK') {
            duelState.pendingAction.negated = true;
        }
        effectUtils.emitDuelLog(duelState.roomId, `🛡️💥 [Mirror Force] ¡Fuerza de Espejo refleja el ataque y destruye a todos los monstruos en Ataque (${destroyed} destruidos)!`, 'trap');
        return { success: true, destroyed };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
