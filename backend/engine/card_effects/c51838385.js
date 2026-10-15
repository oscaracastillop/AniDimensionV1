/**
 * [Passcode: 51838385] Theban Nightmare
 * Tipo: Effect Monster
 * Auténtica lógica OCG con mutaciones de estado en el duelo
 */
module.exports = {
    id: 51838385,
    name: "Theban Nightmare",
    type: "Effect Monster",
    atk: 0, def: 0, level: 0, race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        let target = monsters.find(m => m && !m.faceDown);
        if (target) {
            target.atk = (target.atk || 0) + 1500;
            effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] ¡Otorga +1500 ATK a '${target.name}'! (ATK actual: ${target.atk})`, 'effect');
            return { success: true, boost: 1500 };
        }
        return { success: true };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
