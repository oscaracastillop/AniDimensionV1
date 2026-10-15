/**
 * [Passcode: 8574277] Princess of Tsurugi
 * Tipo: Flip Monster
 * Efecto: FLIP: Inflige 500 puntos de daño a tu adversario por cada Carta Mágica y de Trampa en su campo.
 */
module.exports = {
    id: 8574277,
    name: "Princess of Tsurugi",
    type: "Flip Effect Monster",
    atk: 900, def: 700, level: 3, race: "Warrior",
    isFlip: true,

    async onFlip({ roomId, duelState, playerKey, opponentKey, effectUtils }) {
        const opp = duelState[opponentKey] || {};
        const oppSpells = (opp.spells || []).filter(s => s !== null).length;
        const oppField = opp.fieldSpell ? 1 : 0;
        const total = oppSpells + oppField;
        const damage = total * 500;

        if (damage > 0) {
            opp.lp = Math.max(0, (opp.lp || 8000) - damage);
            effectUtils.emitDuelLog(roomId, `⚔️💥 [Princess of Tsurugi] ¡Efecto de Volteo! Causa ${damage} de daño a ${opp.username} (${total} Cartas Mágicas/Trampas).`, 'battle');
        } else {
            effectUtils.emitDuelLog(roomId, `⚔️ [Princess of Tsurugi] ¡Efecto de Volteo activado! No hay Cartas Mágicas ni Trampas en el campo rival para causar daño.`, 'effect');
        }
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
