/**
 * [Passcode: 27132350] Fire Sorcerer
 * Tipo: Flip Effect Monster | Expansión: LON
 */
module.exports = {
    id: 27132350,
    name: "Fire Sorcerer",
    type: "Flip Effect Monster",
    atk: 1000,
    def: 1500,
    level: 4,
    race: "Spellcaster",
    attribute: "FIRE",
    isFlip: true,

    canActivate() { return { canActivate: true }; },

    async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            let banishedCount = 0;
            p.banished = p.banished || [];
            while (p.hand && p.hand.length > 0 && banishedCount < 2) {
                const rIdx = Math.floor(Math.random() * p.hand.length);
                const removed = p.hand.splice(rIdx, 1)[0];
                p.banished.push(removed);
                banishedCount++;
            }

            opp.lifePoints = Math.max(0, (opp.lifePoints || 0) - 800);
            effectUtils.emitDuelLog(duelState.roomId, `🔥🧙 [Fire Sorcerer] ¡VOLTEO! Destierra ${banishedCount} cartas de la mano al azar e inflige 800 de daño a ${opp.username} (LP: ${opp.lifePoints}).`, 'flip');
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
