/**
 * [Passcode: 18591904] Final Destiny
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 18591904,
    name: "Final Destiny",
    type: "Normal Spell",
    race: "Spell",
    isMonsterBoardWipe: true,
    isSpellTrapBoardWipe: true,

    canActivate({ duelState, playerKey }) {
        const p = duelState[playerKey];
        // Requiere al menos 5 cartas para descartar (excluyendo a Final Destiny)
        if (!p || !p.hand || p.hand.length < 5) {
            return { canActivate: false, reason: "Se requieren al menos 5 cartas en la mano para pagar el costo de \"Final Destiny\"." };
        }
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const p = duelState[playerKey];
        // Descartar 5 cartas
        for (let i = 0; i < 5; i++) {
            if (p.hand.length > 0) {
                const c = p.hand.pop();
                effectUtils.sendCardToGraveyard(duelState, c, playerKey);
            }
        }

        let destroyedCount = 0;
        ['player1', 'player2'].forEach(pk => {
            const playerObj = duelState[pk];
            if (playerObj) {
                for (let i = 0; i < 5; i++) {
                    if (playerObj.monsters[i]) {
                        effectUtils.sendCardToGraveyard(duelState, playerObj.monsters[i], pk);
                        playerObj.monsters[i] = null;
                        destroyedCount++;
                    }
                    if (playerObj.spells[i]) {
                        effectUtils.sendCardToGraveyard(duelState, playerObj.spells[i], pk);
                        playerObj.spells[i] = null;
                        destroyedCount++;
                    }
                }
                if (playerObj.fieldSpell) {
                    playerObj.fieldSpell = null;
                    destroyedCount++;
                }
            }
        });

        effectUtils.emitDuelLog(duelState.roomId, `☄️💥 [${this.name}] ¡Destino Final! Descarta 5 cartas y destruye todas las cartas en el campo (${destroyedCount} cartas destruidas).`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
