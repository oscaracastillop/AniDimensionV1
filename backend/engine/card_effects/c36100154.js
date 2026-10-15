/**
 * [Passcode: 36100154] Amazoness Fighting Spirit
 * Tipo: Continuous Spell
 * Arquetipo / Expansión: DREV
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 36100154,
    name: "Amazoness Fighting Spirit",
    type: "Continuous Spell",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        let target = monsters.find(m => m && !m.faceDown);
        if (target) {
            target.atkMod = (target.atkMod || 0) + 1000;
            target.currentAtk = (target.currentAtk !== undefined ? target.currentAtk : (target.atk || 0)) + 1000;
            effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] ¡Otorga +1000 ATK a '${target.card_data?.name || target.name}'! (ATK actual: ${target.currentAtk})`, 'boost');
            return { success: true, boost: 1000 };
        }
        return { success: true };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
