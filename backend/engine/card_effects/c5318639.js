/**
 * [Passcode: 5318639] Mystical Space Typhoon
 * Tipo: Quick-Play Spell | Expansión: MRL
 */
module.exports = {
    id: 5318639,
    name: "Mystical Space Typhoon",
    type: "Quick-Play Spell",
    race: "Spell",
    isQuickPlay: true,
    isSpellTrapRemoval: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const hasSpellTrap = ['player1', 'player2'].some(pk => {
            const p = duelState[pk];
            return p && (p.spells.some(s => s !== null) || p.fieldSpell !== null);
        });
        if (!hasSpellTrap) return { canActivate: false, reason: "No hay cartas Mágicas o de Trampa en el campo para destruir." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const tPlayerKey = targetData?.target_player || oppKey;
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : 0;
        const tPlayer = duelState[tPlayerKey];

        if (tPlayer && tPlayer.spells && tPlayer.spells[targetSlot]) {
            const destroyed = tPlayer.spells[targetSlot];
            tPlayer.spells[targetSlot] = null;
            effectUtils.sendCardToGraveyard(duelState, destroyed, tPlayerKey);
            effectUtils.emitDuelLog(duelState.roomId, `🌪️✨ [${this.name}] ¡Tifón del Espacio Místico destruye "${destroyed.name || 'Carta'}"!`, 'spell');
        } else if (tPlayer && tPlayer.fieldSpell) {
            const destroyed = tPlayer.fieldSpell;
            tPlayer.fieldSpell = null;
            effectUtils.sendCardToGraveyard(duelState, destroyed, tPlayerKey);
            effectUtils.emitDuelLog(duelState.roomId, `🌪️✨ [${this.name}] ¡Tifón del Espacio Místico destruye el Campo Mágico "${destroyed.name || 'Campo'}"!`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
