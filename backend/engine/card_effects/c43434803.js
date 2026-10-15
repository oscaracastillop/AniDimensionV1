/**
 * [Passcode: 43434803] The Shallow Grave
 * Tipo: Normal Spell | Expansión: PSV
 */
module.exports = {
    id: 43434803,
    name: "The Shallow Grave",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const pHasMon = (duelState[playerKey]?.graveyard || []).some(c => (c.card_data?.type || c.type || '').toLowerCase().includes('monster'));
            const oppHasMon = (duelState[oppKey]?.graveyard || []).some(c => (c.card_data?.type || c.type || '').toLowerCase().includes('monster'));
            const pHasSpace = (duelState[playerKey]?.monsters || []).some(m => !m);
            const oppHasSpace = (duelState[oppKey]?.monsters || []).some(m => !m);
            if (!pHasMon || !oppHasMon || !pHasSpace || !oppHasSpace) {
                return { canActivate: false, reason: "Ambos jugadores deben tener un monstruo en el Cementerio y espacio en campo." };
            }
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            [playerKey, oppKey].forEach(pKey => {
                const p = duelState[pKey];
                const gyMonIdx = (p.graveyard || []).findLastIndex(c => (c.card_data?.type || c.type || '').toLowerCase().includes('monster'));
                const freeSlot = (p.monsters || []).findIndex(m => !m);
                if (gyMonIdx !== -1 && freeSlot !== -1) {
                    const [mon] = p.graveyard.splice(gyMonIdx, 1);
                    mon.position = 'DEF';
                    mon.faceDown = true;
                    p.monsters[freeSlot] = mon;
                }
            });
            effectUtils.emitDuelLog(duelState.roomId, `⚰️🌑 [The Shallow Grave] Ambos jugadores invocan de modo especial 1 monstruo desde su Cementerio en Posición de Defensa boca abajo.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
