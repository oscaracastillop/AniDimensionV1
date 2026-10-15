/**
 * [Passcode: 15552258] Half or Nothing
 * Tipo: Normal Trap
 * Arquetipo / Expansión: CRMS
 * Efecto OCG:
 * Actívala solo durante la Battle Phase del adversario. Tu adversario elige 1 de estos efectos:
 * ● Divide a la mitad el ATK de todos los monstruos que controle en este momento hasta el final de la Battle Phase.
 * ● Termina la Battle Phase.
 */
module.exports = {
    id: 15552258,
    name: "Half or Nothing",
    type: "Normal Trap",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const choice = (targetData && targetData.effect_choice) ? Number(targetData.effect_choice) : 1;

        if (choice === 1) {
            // Opción 1: Reducir ATK de todos los monstruos rivales a la mitad
            const oppMonsters = opponent.monsters || [];
            let affected = 0;
            oppMonsters.forEach(m => {
                if (m && !m.faceDown) {
                    const current = m.currentAtk !== undefined ? m.currentAtk : (m.atk || 0);
                    const halved = Math.floor(current / 2);
                    m.currentAtk = halved;
                    affected++;
                }
            });
            effectUtils.emitDuelLog(duelState.roomId, `⚖️💥 [Half or Nothing] ¡Opción 1: Se redujo a la mitad el ATK de ${affected} monstruo(s) rival(es)!`, 'boost');
        } else {
            // Opción 2: Finalizar la Battle Phase inmediatamente
            duelState.phase = 'MAIN_2';
            effectUtils.emitDuelLog(duelState.roomId, `🛑⚖️ [Half or Nothing] ¡Opción 2: La Battle Phase ha concluido de inmediato! Fase actual: MAIN_2.`, 'phase');
        }

        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
