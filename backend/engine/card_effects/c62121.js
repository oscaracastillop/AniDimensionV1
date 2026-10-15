/**
 * [Passcode: 62121] Castle of Dark Illusions
 * Tipo: Flip Effect Monster
 */
module.exports = {
    id: 62121,
    name: "Castle of Dark Illusions",
    type: "Flip Effect Monster",
    atk: 920,
    def: 1930,
    level: 4,
    race: "Fiend",
    isFlip: true,

    
    async onFlip(context) {
        const { duelState, playerKey, effectUtils } = context;
        (duelState[playerKey]?.monsters || []).forEach(m => {
            if (m && !m.faceDown && (m.card_data?.race?.toLowerCase().includes('zombie') || m.race?.toLowerCase().includes('zombie'))) {
                m.atkBoost = (m.atkBoost || 0) + 200;
                m.defBoost = (m.defBoost || 0) + 200;
                effectUtils.calculateMonsterCurrentStats(m, duelState, playerKey);
            }
        });
        effectUtils.emitDuelLog(duelState.roomId, `🏰✨ [Castle of Dark Illusions] ¡EFECTO DE VOLTEO! Otorga +200 ATK/DEF a todos los monstruos Zombie.`, 'effect');
        return { success: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onFlip({ duelState, playerKey, opponentKey, targetData, link, effectUtils });
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
