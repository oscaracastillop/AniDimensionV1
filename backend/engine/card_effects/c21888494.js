/**
 * [Passcode: 21888494] Chosen One
 * Tipo: Normal Spell | Expansión: LON
 */
module.exports = {
    id: 21888494,
    name: "Chosen One",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const monCount = (p?.hand || []).filter(c => (c.card_data?.type || c.type || '').toLowerCase().includes('monster')).length;
            const nonMonCount = (p?.hand || []).length - monCount;
            if (monCount < 1 || nonMonCount < 2) return { canActivate: false, reason: "Debes tener al menos 1 monstruo y 2 cartas no monstruo en tu mano." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🎴✨ [Chosen One] ¡El Elegido! Si el rival selecciona tu Carta de Monstruo, es Invocado de Modo Especial.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
