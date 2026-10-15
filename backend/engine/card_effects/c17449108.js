/**
 * [Passcode: 17449108] Nobleman of Extermination
 * Tipo: Normal Spell | Expansión: PSV
 */
module.exports = {
    id: 17449108,
    name: "Nobleman of Extermination",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allSpells = [...(duelState[playerKey]?.spells || []), ...(duelState[oppKey]?.spells || [])];
            const hasFaceDown = allSpells.some(s => s && s.faceDown);
            if (!hasFaceDown) return { canActivate: false, reason: "No hay cartas Mágicas o de Trampa boca abajo en el campo." };
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
                target = duelState[tKey]?.spells?.[tIdx];
            } else {
                tIdx = (duelState[oppKey]?.spells || []).findIndex(s => s && s.faceDown);
                if (tIdx !== -1) {
                    tKey = oppKey;
                    target = duelState[oppKey].spells[tIdx];
                } else {
                    tIdx = (duelState[playerKey]?.spells || []).findIndex(s => s && s.faceDown);
                    if (tIdx !== -1) {
                        tKey = playerKey;
                        target = duelState[playerKey].spells[tIdx];
                    }
                }
            }

            if (!target || !target.faceDown) return { success: false, reason: "Objetivo M/T boca abajo inválido." };

            const targetName = target.card_data?.name || target.name || 'Carta Oculta';
            const isTrap = (target.card_data?.type || target.type || '').toLowerCase().includes('trap');

            duelState[tKey].spells[tIdx] = null;
            effectUtils.sendCardToBanished(duelState, target, tKey);
            effectUtils.emitDuelLog(duelState.roomId, `🗡️📜 [Nobleman of Extermination] Destruye y destierra boca abajo a "${targetName}".`, 'spell');

            if (isTrap) {
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
                effectUtils.emitDuelLog(duelState.roomId, `🎴🚫 [Nobleman of Extermination] ¡Era una Carta de Trampa! Se destierran ${banishedCount} copia(s) de los Decks.`, 'spell');
            }

            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
