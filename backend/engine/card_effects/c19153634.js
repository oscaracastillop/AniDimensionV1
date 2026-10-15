/**
 * [Passcode: 19153634] Patrician of Darkness
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 19153634,
    name: "Patrician of Darkness",
    type: "Effect Monster",
    atk: 2000,
    def: 1400,
    level: 5,
    race: "Zombie",
    attribute: "DARK",

    canActivate() { return { canActivate: false, reason: "Efecto continuo de batalla." }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
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
