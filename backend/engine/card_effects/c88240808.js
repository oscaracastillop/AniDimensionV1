/**
 * [Passcode: 88240808] Kycoo the Ghost Destroyer
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 88240808,
    name: "Kycoo the Ghost Destroyer",
    type: "Effect Monster",
    atk: 1800,
    def: 700,
    level: 4,
    race: "Spellcaster",
    attribute: "DARK",
    preventsOpponentGyBanish: true,

    canActivate() { return { canActivate: false, reason: "Efecto disparado por daño de batalla." }; },

    async onInflictBattleDamage(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];

            let banished = 0;
            if (opp?.graveyard && opp.graveyard.length > 0) {
                opp.banished = opp.banished || [];
                for (let i = opp.graveyard.length - 1; i >= 0 && banished < 2; i--) {
                    const card = opp.graveyard[i];
                    if (card && (card.type || '').toLowerCase().includes('monster')) {
                        const target = opp.graveyard.splice(i, 1)[0];
                        opp.banished.push(target);
                        banished++;
                    }
                }
            }

            effectUtils.emitDuelLog(duelState.roomId, `🗡️👻 [Kycoo the Ghost Destroyer] ¡Inflige daño de combate y destierra ${banished} monstruos del Cementerio de ${opp.username}! El rival no puede desterrar cartas de ningún Cementerio.`, 'monster');
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onInflictBattleDamage({ duelState, playerKey, opponentKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
