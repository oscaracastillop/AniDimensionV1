/**
 * [Passcode: 13314457] Deepsea Macrotrema
 * Tipo: Effect
 * Arquetipo / Expansión: PTDN
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 13314457,
    name: "Deepsea Macrotrema",
    type: "Effect",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        let target = monsters.find(m => m && !m.faceDown);
        if (target) {
            target.atkMod = (target.atkMod || 0) + 500;
            target.currentAtk = (target.currentAtk !== undefined ? target.currentAtk : (target.atk || 0)) + 500;
            effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] ¡Otorga +500 ATK a '${target.card_data?.name || target.name}'! (ATK actual: ${target.currentAtk})`, 'boost');
            return { success: true, boost: 500 };
        }
        return { success: true };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
