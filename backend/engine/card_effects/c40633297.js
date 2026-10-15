/**
 * [Passcode: 40633297] Bad Reaction to Simochi
 * Tipo: Continuous Trap | Expansión: LOD
 */
module.exports = {
    id: 40633297,
    name: "Bad Reaction to Simochi",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,
    convertsHealToDamage: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.simochiActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `☠️💊 [Bad Reaction to Simochi] ¡Trampa continua activa! Todos los efectos que aumenten los LP del rival ahora le infligirán esa misma cantidad como daño directo.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
