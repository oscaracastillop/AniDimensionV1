/**
 * [Passcode: 76075810] Throwstone Unit
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 76075810,
    name: "Throwstone Unit",
    type: "Effect Monster",
    atk: 900,
    def: 2000,
    level: 4,
    race: "Warrior",
    attribute: "EARTH",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasWarrior = (p?.monsters || []).some(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'warrior');
            if (!hasWarrior) return { canActivate: false, reason: "Debes tributar 1 monstruo Guerrero." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            const wIdx = (p.monsters || []).findIndex(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'warrior');
            let tAtk = 900;
            if (wIdx !== -1) {
                tAtk = p.monsters[wIdx].currentAtk || p.monsters[wIdx].card_data?.atk || 900;
                effectUtils.sendCardToGraveyard(duelState, p.monsters[wIdx], playerKey);
                p.monsters[wIdx] = null;
            }

            const targetMon = (opp.monsters || []).find(m => m && (m.currentDef || m.card_data?.def || 0) <= tAtk);
            if (targetMon) {
                const idx = opp.monsters.indexOf(targetMon);
                opp.monsters[idx] = null;
                effectUtils.sendCardToGraveyard(duelState, targetMon, oppKey);
                effectUtils.emitDuelLog(duelState.roomId, `🪨💥 [Throwstone Unit] Tributa un Guerrero y destruye a "${targetMon.name || targetMon.card_data?.name}" (DEF <= ${tAtk}).`, 'monster');
            }
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
