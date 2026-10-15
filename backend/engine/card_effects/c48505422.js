/**
 * [Passcode: 48505422] Legendary Six Samurai - Shinai
 * Tipo: Effect Monster
 * Arquetipo / Expansión: STOR
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    canSpecialSummonSelf: true,

    canSpecialSummon({ duelState, playerKey }) {
        const player = duelState[playerKey] || {};
        const monsters = player.monsters || [];
        const hasMizuho = monsters.some(m => m && !m.faceDown && ((m.card_data?.name || m.name || '').toLowerCase().includes('mizuho')));
        if (hasMizuho) return { canSummon: true };
        return { canSummon: false, reason: 'Requiere controlar a "Legendary Six Samurai - Mizuho" boca arriba.' };
    },
    id: 48505422,
    name: "Legendary Six Samurai - Shinai",
    type: "Effect Monster",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const gy = player.graveyard || [];
        player.hand = player.hand || [];
        if (gy.length > 0) {
            const recovered = gy.pop();
            player.hand.push(recovered);
            effectUtils.emitDuelLog(duelState.roomId, `♻️ [${this.name}] ¡Recupera '${recovered.name || 'Carta'}' del cementerio a la mano!`, 'effect');
            return { success: true, recovered: recovered.name };
        }
        return { success: true };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
