/**
 * [Passcode: 21770260] Jam Breeding Machine
 * Tipo: Continuous Spell | Expansión: LON
 */
module.exports = {
    id: 21770260,
    name: "Jam Breeding Machine",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🧬🧪 [Jam Breeding Machine] ¡Máquina de Crianza de Slimes activa! Invoca 1 "Slime Token" en cada una de tus Standby Phases. No puedes invocar otros monstruos.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
