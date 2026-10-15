/**
 * [Passcode: 69296555] Array of Revealing Light
 * Tipo: Field Spell | Expansión: LOD
 */
module.exports = {
    id: 69296555,
    name: "Array of Revealing Light",
    type: "Field Spell",
    race: "Spell",
    isField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.fieldSpell = { id: 69296555, name: "Array of Revealing Light", controller: playerKey };
            effectUtils.emitDuelLog(duelState.roomId, `☀️✨ [Array of Revealing Light] Campo activo: Los monstruos del Tipo declarado no pueden atacar en el turno en que son Invocados.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
