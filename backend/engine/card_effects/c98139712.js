/**
 * [Passcode: 98139712] Skull Invitation
 * Tipo: Continuous Trap | Expansión: PSV
 */
module.exports = {
    id: 98139712,
    name: "Skull Invitation",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.skullInvitationActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `💀📨 [Skull Invitation] ¡Invitación de la Calavera activa! Cada vez que una carta vaya al Cementerio, su dueño recibe 300 de daño.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
