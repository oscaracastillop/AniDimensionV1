/**
 * [Passcode: 59784896] Dark Zebra
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 59784896,
    name: "Dark Zebra",
    type: "Effect Monster",
    atk: 1800,
    def: 400,
    level: 4,
    race: "Beast",
    attribute: "EARTH",

    async onStandby(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        const monCount = (p?.monsters || []).filter(m => m !== null).length;
        if (monCount === 1) {
            const zebra = (p.monsters || []).find(m => m && (m.id === 59784896 || m.card_id === 59784896));
            if (zebra && zebra.position === 'ATK') {
                zebra.position = 'DEF';
                effectUtils.emitDuelLog(duelState.roomId, `🦓 [${this.name}] Es el único monstruo en el campo: Cambia a Posición de Defensa.`, 'position');
            }
        }
    },

    async execute(context) {
        return { success: true };
    }
};
