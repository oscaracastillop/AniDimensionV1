/**
 * [Passcode: 6343408] Miracle Dig
 * Tipo: Normal Spell | Expansión: LON
 */
module.exports = {
    id: 6343408,
    name: "Miracle Dig",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey }) {
            const banishedCount = (duelState[playerKey]?.banished || []).length;
            if (banishedCount < 5) return { canActivate: false, reason: "Debes tener al menos 5 o más de tus monstruos desterrados." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            let returned = 0;
            for (let i = p.banished.length - 1; i >= 0 && returned < 3; i--) {
                const [card] = p.banished.splice(i, 1);
                p.graveyard.push(card);
                returned++;
            }
            effectUtils.emitDuelLog(duelState.roomId, `⛏️✨ [Miracle Dig] ¡Excavación Milagrosa devuelve ${returned} monstruo(s) desterrado(s) al Cementerio!`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
