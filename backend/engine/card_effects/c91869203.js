/**
 * [Passcode: 91869203] Amazoness Archer
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 91869203,
    name: "Amazoness Archer",
    type: "Effect Monster",
    atk: 1400,
    def: 1000,
    level: 4,
    race: "Warrior",
    attribute: "EARTH",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const activeMons = (p?.monsters || []).filter(m => m);
            if (activeMons.length < 2) return { canActivate: false, reason: "Debes controlar al menos 2 monstruos para tributar." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            let tCount = 0;
            for (let i = 0; i < p.monsters.length && tCount < 2; i++) {
                if (p.monsters[i]) {
                    effectUtils.sendCardToGraveyard(duelState, p.monsters[i], playerKey);
                    p.monsters[i] = null;
                    tCount++;
                }
            }

            opp.lifePoints = Math.max(0, (opp.lifePoints || 0) - 1200);
            effectUtils.emitDuelLog(duelState.roomId, `🏹💥 [Amazoness Archer] Tributa 2 monstruos e inflige 1200 de daño directo a ${opp.username} (LP: ${opp.lifePoints}).`, 'monster');
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
