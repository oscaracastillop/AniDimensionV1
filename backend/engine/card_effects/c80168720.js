/**
 * [Passcode: 80168720] Darkness Approaches
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 80168720,
    name: "Darkness Approaches",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey }) {
        const p = duelState[playerKey];
        if (!p || !p.hand || p.hand.length < 2) return { canActivate: false, reason: "Se requieren al menos 2 cartas en mano para descartar." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const p = duelState[playerKey];
        for (let i = 0; i < 2; i++) {
            if (p.hand.length > 0) {
                const disc = p.hand.pop();
                effectUtils.sendCardToGraveyard(duelState, disc, playerKey);
            }
        }

        const tPlayerKey = targetData?.target_player || (playerKey === 'player1' ? 'player2' : 'player1');
        const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : 0;
        const targetMon = duelState[tPlayerKey]?.monsters[tSlot];

        if (targetMon) {
            targetMon.position = 'DEF';
            targetMon.faceDown = true;
            effectUtils.emitDuelLog(duelState.roomId, `🌑✨ [${this.name}] ¡"${targetMon.card_data ? targetMon.card_data.name : 'Monstruo'}" es puesto boca abajo en Posición de Defensa!`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
