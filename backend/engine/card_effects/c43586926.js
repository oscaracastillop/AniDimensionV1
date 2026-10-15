/**
 * [Passcode: 43586926] Twin-Headed Behemoth
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 43586926,
    name: "Twin-Headed Behemoth",
    type: "Effect Monster",
    atk: 1500,
    def: 1200,
    level: 3,
    race: "Dragon",
    attribute: "WIND",

    canActivate() { return { canActivate: false, reason: "Efecto de revivir en End Phase." }; },

    async onEndPhaseGY(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            if (p?.pendingTwinHeadedBehemoth && !p.usedTwinHeadedBehemothDuel) {
                const gyIdx = (p.graveyard || []).findIndex(c => Number(c.id || c.card_id) === 43586926);
                const emptySlot = (p.monsters || []).findIndex(m => !m);
                if (gyIdx !== -1 && emptySlot !== -1) {
                    const mon = p.graveyard.splice(gyIdx, 1)[0];
                    mon.position = 'face-up-defense';
                    mon.currentAtk = 1000;
                    mon.currentDef = 1000;
                    p.monsters[emptySlot] = mon;
                    p.pendingTwinHeadedBehemoth = false;
                    p.usedTwinHeadedBehemothDuel = true;
                    effectUtils.emitDuelLog(duelState.roomId, `🐉✨ [Twin-Headed Behemoth] ¡Revive en la End Phase con 1000 ATK / 1000 DEF! (1 vez por duelo).`, 'monster');
                }
            }
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
