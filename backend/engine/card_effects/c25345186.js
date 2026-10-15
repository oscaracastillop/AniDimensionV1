/**
 * [Passcode: 25345186] After the Struggle
 * Tipo: Normal Spell | Expansión: LOD
 */
module.exports = {
    id: 25345186,
    name: "After the Struggle",
    type: "Normal Spell",
    race: "Spell",

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.afterTheStruggleActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `⚔️💥 [After the Struggle] Todos los monstruos que participen en batalla este turno serán destruidos al final de la Battle Phase.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
