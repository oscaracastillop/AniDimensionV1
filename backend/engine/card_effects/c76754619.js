/**
 * [Passcode: 76754619] Pyramid Energy
 * Tipo: Quick-Play Spell
 * Opción 1: +200 ATK a todos los monstruos propios boca arriba.
 * Opción 2: +500 DEF a todos los monstruos propios boca arriba.
 */
module.exports = {
    id: 76754619,
    name: "Pyramid Energy",
    type: "Quick-Play Spell",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",
    isEquip: false,
    isField: false,
    isContinuous: false,
    isQuickPlay: true,
    isCounter: false,
    canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const pMonsters = player.monsters || [];
        const choice = (targetData && targetData.effect_choice) ? Number(targetData.effect_choice) : 1;
        let affectedCount = 0;

        pMonsters.forEach(m => {
            if (m && !m.faceDown) {
                affectedCount++;
                if (choice === 1) {
                    m.atkMod = (m.atkMod || 0) + 200;
                    m.currentAtk = (m.currentAtk !== undefined ? m.currentAtk : (m.atk || 0)) + 200;
                } else {
                    m.defMod = (m.defMod || 0) + 500;
                    m.currentDef = (m.currentDef !== undefined ? m.currentDef : (m.def || 0)) + 500;
                }
            }
        });

        if (choice === 1) {
            effectUtils.emitDuelLog(duelState.roomId, `🔺⚔️ [${this.name}] ¡Energía de Pirámide aumenta +200 ATK a todos tus ${affectedCount} monstruo(s) boca arriba!`, 'boost');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, `🔺🛡️ [${this.name}] ¡Energía de Pirámide aumenta +500 DEF a todos tus ${affectedCount} monstruo(s) boca arriba!`, 'boost');
        }

        return { success: true, choice, affectedCount };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
