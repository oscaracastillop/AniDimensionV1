/**
 * [Passcode: 73853830] Crusader of Endymion
 * Tipo: Gemini Effect Monster
 * Arquetipo / Expansión: SOVR
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 73853830,
    name: "Crusader of Endymion",
    type: "Gemini Effect Monster",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        let target = monsters.find(m => m && !m.faceDown);
        if (target) {
            target.atkMod = (target.atkMod || 0) + 600;
            target.currentAtk = (target.currentAtk !== undefined ? target.currentAtk : (target.atk || 0)) + 600;
            effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] ¡Otorga +600 ATK a '${target.card_data?.name || target.name}'! (ATK actual: ${target.currentAtk})`, 'boost');
            return { success: true, boost: 600 };
        }
        return { success: true };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
