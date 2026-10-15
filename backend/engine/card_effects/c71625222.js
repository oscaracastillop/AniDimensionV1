/**
 * [Passcode: 71625222] Time Wizard
 * Tipo: Effect Monster
 */
module.exports = {
    id: 71625222,
    name: "Time Wizard",
    type: "Effect Monster",
    atk: 500,
    def: 400,
    level: 2,
    race: "Spellcaster",
    
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        const coin = Math.random() < 0.5 ? 'CARA' : 'CRUZ';
        if (coin === 'CARA') {
            let destroyed = 0;
            (duelState[opponentKey]?.monsters || []).forEach((m, idx) => {
                if (m) {
                    duelState[opponentKey].monsters[idx] = null;
                    effectUtils.sendCardToGraveyard(duelState, m, opponentKey);
                    destroyed++;
                }
            });
            effectUtils.emitDuelLog(duelState.roomId, `🧙‍♂️🪙 [Time Wizard] ¡Resultado CARA! ¡La Ruleta del Tiempo destruye todos los monstruos del rival (${destroyed} destruidos)!`, 'effect');
        } else {
            let totalAtk = 0;
            (duelState[playerKey]?.monsters || []).forEach((m, idx) => {
                if (m) {
                    totalAtk += (m.currentAtk !== undefined ? m.currentAtk : (m.card_data?.atk || 0));
                    duelState[playerKey].monsters[idx] = null;
                    effectUtils.sendCardToGraveyard(duelState, m, playerKey);
                }
            });
            const dmg = Math.floor(totalAtk / 2);
            duelState[playerKey].lp = Math.max(0, (duelState[playerKey].lp || 8000) - dmg);
            effectUtils.emitDuelLog(duelState.roomId, `🧙‍♂️💥 [Time Wizard] ¡Resultado CRUZ! La ruleta explota: destruye todos tus monstruos y recibes ${dmg} de daño.`, 'damage');
            effectUtils.checkDuelGameOver(duelState.roomId, duelState);
        }
        return { success: true, result: coin };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
