/**
 * [Passcode: 15259703] Toon World
 * Tipo: Continuous Spell | Expansión: MRL
 */
module.exports = {
    id: 15259703,
    name: "Toon World",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    isToonWorld: true,

    canActivate({ duelState, playerKey }) {
        const p = duelState[playerKey];
        if (p && p.lp <= 1000) {
            return { canActivate: false, reason: "Se requieren más de 1000 LP para pagar el costo de \"Toon World\"." };
        }
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const p = duelState[playerKey];
        const cost = 1000;
        p.lp = Math.max(0, (p.lp || 8000) - cost);
        p.hasToonWorld = true;

        effectUtils.emitDuelLog(duelState.roomId, `📖✨ [${this.name}] ${p.username} paga ${cost} LP. ¡El legendario Mundo Toon se abre en el campo! (LP restantes: ${p.lp})`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
