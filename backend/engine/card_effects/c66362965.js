/**
 * [Passcode: 66362965] The Fiend Megacyber
 * Tipo: Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 66362965,
    name: "The Fiend Megacyber",
    type: "Effect Monster",
    atk: 2200,
    def: 1200,
    level: 6,
    race: "Warrior",
    attribute: "DARK",
    canSpecialSummonSelf: true,

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const oppCount = (duelState[oppKey]?.monsters || []).filter(m => m).length;
            const myCount = (duelState[playerKey]?.monsters || []).filter(m => m).length;
            if (oppCount < myCount + 2) {
                return { canActivate: false, reason: "El rival debe controlar al menos 2 monstruos más que tú para la Invocación Especial." };
            }
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const freeSlot = (p.monsters || []).findIndex(m => !m);
            if (freeSlot === -1) return { success: false, reason: "Zona de monstruos llena." };

            const handIdx = (p.hand || []).findIndex(c => Number(c.card_id || c.id) === 66362965);
            if (handIdx !== -1) {
                const [card] = p.hand.splice(handIdx, 1);
                card.position = 'ATK';
                card.faceDown = false;
                p.monsters[freeSlot] = card;
                effectUtils.emitDuelLog(duelState.roomId, `🤖⚡ [The Fiend Megacyber] ¡Invocación Especial desde la mano! El rival controla 2 o más monstruos que tú.`, 'special_summon');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
