/**
 * [Passcode: 23289281] Karate Man
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 23289281,
    name: "Karate Man",
    type: "Effect Monster",
    atk: 1000,
    def: 1000,
    level: 3,
    race: "Warrior",
    attribute: "EARTH",

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const p = duelState[playerKey];
        const km = (p.monsters || []).find(m => m && (m.id === 23289281 || m.card_id === 23289281));
        if (km) {
            km.atk = 2000;
            km.destroyAtEndPhase = true;
            effectUtils.emitDuelLog(duelState.roomId, `🥋💥 [${this.name}] ¡Duplica su ATK a 2000 hasta la End Phase! (Será destruido al final del turno).`, 'atk');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
