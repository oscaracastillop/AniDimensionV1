/**
 * [Passcode: 52097679] Shield & Sword
 * Tipo: Normal Spell
 */
module.exports = {
    id: 52097679,
    name: "Shield & Sword",
    type: "Normal Spell",
    race: "Spell",
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        let affected = 0;
        [playerKey, opponentKey].forEach(pk => {
            (duelState[pk]?.monsters || []).forEach(m => {
                if (m && !m.faceDown) {
                    const cData = m.card_data || {};
                    const origAtk = cData.atk || 0;
                    const origDef = cData.def || 0;
                    cData.atk = origDef;
                    cData.def = origAtk;
                    effectUtils.calculateMonsterCurrentStats(m, duelState, pk);
                    affected++;
                }
            });
        });
        effectUtils.emitDuelLog(duelState.roomId, `🛡️⚔️ [Shield & Sword] ¡El ATK y DEF original de todos los monstruos (${affected}) se intercambian hasta el fin del turno!`, 'spell');
        return { success: true, affected };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
