/**
 * [Passcode: 71044499] Nobleman of Crossout
 * Tipo: Normal Spell | Expansión: PSV
 */
module.exports = {
    id: 71044499,
    name: "Nobleman of Crossout",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasFaceDown = allMonsters.some(m => m && m.faceDown);
            if (!hasFaceDown) return { canActivate: false, reason: "No hay monstruos boca abajo en el campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            let target = null;
            let tKey = null;
            let tIdx = -1;

            if (targetData?.slot_index !== undefined) {
                tKey = targetData.target_player || oppKey;
                tIdx = targetData.slot_index;
                target = duelState[tKey]?.monsters?.[tIdx];
            } else {
                // Auto-buscar monstruo boca abajo rival
                tIdx = (duelState[oppKey]?.monsters || []).findIndex(m => m && m.faceDown);
                if (tIdx !== -1) {
                    tKey = oppKey;
                    target = duelState[oppKey].monsters[tIdx];
                } else {
                    tIdx = (duelState[playerKey]?.monsters || []).findIndex(m => m && m.faceDown);
                    if (tIdx !== -1) {
                        tKey = playerKey;
                        target = duelState[playerKey].monsters[tIdx];
                    }
                }
            }

            if (!target || !target.faceDown) return { success: false, reason: "Objetivo boca abajo inválido." };

            const targetName = target.card_data?.name || target.name || 'Monstruo Oculto';
            const isFlip = (target.card_data?.type || target.type || '').toLowerCase().includes('flip');

            // Destruir y desterrar objetivo
            duelState[tKey].monsters[tIdx] = null;
            effectUtils.sendCardToBanished(duelState, target, tKey);
            effectUtils.emitDuelLog(duelState.roomId, `🗡️🚫 [Nobleman of Crossout] Destruye y destierra boca abajo a "${targetName}".`, 'spell');

            // Si era Flip, desterrar todas las copias de los Decks de ambos jugadores
            if (isFlip) {
                const targetId = Number(target.card_id || target.card_data?.id);
                let banishedCount = 0;
                [playerKey, oppKey].forEach(pKey => {
                    const deck = duelState[pKey]?.deck || [];
                    for (let i = deck.length - 1; i >= 0; i--) {
                        if (Number(deck[i].card_id || deck[i].id) === targetId) {
                            const [b] = deck.splice(i, 1);
                            effectUtils.sendCardToBanished(duelState, b, pKey);
                            banishedCount++;
                        }
                    }
                });
                effectUtils.emitDuelLog(duelState.roomId, `🎴🚫 [Nobleman of Crossout] ¡Era un Monstruo de Volteo! Se destierran ${banishedCount} copia(s) adicionales de los Decks.`, 'spell');
            }

            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
