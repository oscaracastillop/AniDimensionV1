/**
 * [Passcode: 21297224] Hysteric Fairy
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 21297224,
    name: "Hysteric Fairy",
    type: "Effect Monster",
    atk: 1800,
    def: 500,
    level: 4,
    race: "Fairy",
    attribute: "LIGHT",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const activeMons = (p?.monsters || []).filter(m => m);
            if (activeMons.length < 2) return { canActivate: false, reason: "Debes controlar al menos 2 monstruos para tributar." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            let tCount = 0;
            for (let i = 0; i < p.monsters.length && tCount < 2; i++) {
                if (p.monsters[i]) {
                    effectUtils.sendCardToGraveyard(duelState, p.monsters[i], playerKey);
                    p.monsters[i] = null;
                    tCount++;
                }
            }
            p.lifePoints = (p.lifePoints || 0) + 1000;
            effectUtils.emitDuelLog(duelState.roomId, `🧚‍♀️💖 [Hysteric Fairy] Ofrece 2 monstruos como tributo y recupera 1000 LP (LP: ${p.lifePoints}).`, 'monster');
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
