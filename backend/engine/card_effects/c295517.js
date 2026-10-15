/**
 * [Passcode: 295517] A Legendary Ocean
 * Tipo: Field Spell | Expansión: LOD
 */
module.exports = {
    id: 295517,
    name: "A Legendary Ocean",
    type: "Field Spell",
    race: "Spell",
    isField: true,
    treatAsUmi: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.fieldSpell = { id: 295517, name: "A Legendary Ocean", controller: playerKey, treatAsUmi: true };
            // Modificadores globales: AGUA +200 ATK/DEF y reduce nivel en 1 en mano y campo
            ['player1', 'player2'].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach(m => {
                    if (m && (m.attribute === 'WATER' || m.card_data?.attribute === 'WATER')) {
                        m.currentAtk = (m.currentAtk !== undefined ? m.currentAtk : (m.card_data?.atk || 0)) + 200;
                        m.currentDef = (m.currentDef !== undefined ? m.currentDef : (m.card_data?.def || 0)) + 200;
                    }
                });
            });
            effectUtils.emitDuelLog(duelState.roomId, `🌊🏛️ [A Legendary Ocean] ¡Campo activo! Se trata como "Umi". Todos los monstruos de AGUA ganan +200 ATK/DEF y sus Niveles se reducen en 1.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
