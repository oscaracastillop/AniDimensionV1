/**
 * [Passcode: 28566710] Last Turn
 * Tipo: Normal Trap | Expansión: LOD
 */
module.exports = {
    id: 28566710,
    name: "Last Turn",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) > 1000) return { canActivate: false, reason: "Solo se puede activar cuando tus LP son 1000 o menos." };
            const hasMon = (p?.monsters || []).some(m => m);
            if (!hasMon) return { canActivate: false, reason: "Debes controlar 1 monstruo en el campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            // Selecciona 1 monstruo del controlador; envía todas las demás cartas al Cementerio
            const selectedMonIdx = (p.monsters || []).findIndex(m => m);
            const selectedMon = p.monsters[selectedMonIdx];

            [p, opp].forEach(player => {
                (player.monsters || []).forEach((m, idx) => {
                    if (m && (player !== p || idx !== selectedMonIdx)) {
                        effectUtils.sendCardToGraveyard(duelState, m, player === p ? playerKey : oppKey);
                        player.monsters[idx] = null;
                    }
                });
                (player.spells || []).forEach((s, idx) => {
                    if (s) {
                        effectUtils.sendCardToGraveyard(duelState, s, player === p ? playerKey : oppKey);
                        player.spells[idx] = null;
                    }
                });
                (player.hand || []).forEach(c => {
                    effectUtils.sendCardToGraveyard(duelState, c, player === p ? playerKey : oppKey);
                });
                player.hand = [];
            });

            // El rival Invoca de Modo Especial 1 monstruo de su Deck
            const oppDeckMonIdx = (opp.deck || []).findIndex(c => (!((c.type || '').toLowerCase().includes('spell') || (c.type || '').toLowerCase().includes('trap')) && ((c.type || '').toLowerCase().includes('monster') || (c.atk !== null && c.atk !== undefined))));
            if (oppDeckMonIdx !== -1) {
                const oppMon = opp.deck.splice(oppDeckMonIdx, 1)[0];
                oppMon.position = 'face-up-attack';
                opp.monsters[0] = oppMon;
            }

            duelState.lastTurnDuel = true;
            effectUtils.emitDuelLog(duelState.roomId, `⚔️👑 [Last Turn] ¡DUELO A MUERTE! Todas las demás cartas enviadas al Cementerio. Los dos monstruos combatirán en la Battle Phase para decidir la victoria del duelo.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
