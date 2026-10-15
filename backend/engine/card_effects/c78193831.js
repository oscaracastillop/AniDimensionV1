/**
 * [Passcode: 78193831] Buster Blader
 * Tipo: Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 78193831,
    name: "Buster Blader",
    type: "Effect Monster",
    atk: 2600,
    def: 2300,
    level: 7,
    race: "Warrior",
    attribute: "EARTH",

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];

            let dragonCount = 0;
            (opp?.monsters || []).forEach(m => {
                if (m) {
                    const r = (m.card_data?.race || m.race || '').toLowerCase();
                    if (r.includes('dragon') || r.includes('dragón')) dragonCount++;
                }
            });
            (opp?.graveyard || []).forEach(c => {
                const r = (c.card_data?.race || c.race || '').toLowerCase();
                if (r.includes('dragon') || r.includes('dragón')) dragonCount++;
            });

            const bonus = dragonCount * 500;
            effectUtils.emitDuelLog(duelState.roomId, `⚔️🐉 [Buster Blader] ¡Cazador de Dragones! Gana +${bonus} ATK (${dragonCount} dragones en campo/cementerio rival). (ATK: ${2600 + bonus})`, 'monster');
            return { success: true, bonus };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
