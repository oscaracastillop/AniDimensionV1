/**
 * [Passcode: 6979239] Woodland Sprite
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 6979239,
    name: "Woodland Sprite",
    type: "Effect Monster",
    atk: 900,
    def: 400,
    level: 3,
    race: "Plant",
    attribute: "EARTH",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasEquip = (p?.spells || []).some(s => s && (s.isEquip || s.race === 'Equip'));
            if (!hasEquip) return { canActivate: false, reason: "Requiere 1 Carta de Equipo en tu campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            const sIdx = (p.spells || []).findIndex(s => s && (s.isEquip || s.race === 'Equip'));
            if (sIdx !== -1) {
                effectUtils.sendCardToGraveyard(duelState, p.spells[sIdx], playerKey);
                p.spells[sIdx] = null;
                opp.lifePoints = Math.max(0, (opp.lifePoints || 0) - 500);
                effectUtils.emitDuelLog(duelState.roomId, `🧚🌿 [Woodland Sprite] Envía una Carta de Equipo al Cementerio e inflige 500 de daño a ${opp.username} (LP: ${opp.lifePoints}).`, 'monster');
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
