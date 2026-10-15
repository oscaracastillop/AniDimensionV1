/**
 * Thunder Dragon (Dragón de Trueno) - Passcode: 31786629
 * Regla Oficial Konami OCG:
 * Puedes descartar esta carta; añade a tu mano hasta 2 "Dragón de Trueno" en tu Deck.
 */
module.exports = {
    id: 31786629,
    name: "Thunder Dragon",
    isMonster: true,
    isHandEffect: true,
    canActivateFromHand: true,

    canActivate(arg1, arg2) {
        let duelState, playerKey;
        if (arg1 && arg1.duelState) {
            ({ duelState, playerKey } = arg1);
        } else {
            duelState = arg1;
            playerKey = arg2;
        }
        const player = duelState ? duelState[playerKey] : null;
        if (!player || !player.deck) return { canActivate: false, reason: "No hay Deck disponible." };
        const hasCopy = player.deck.some(c => Number(c.card_id || c.id || (c.card_data && c.card_data.id)) === 31786629);
        if (!hasCopy) {
            return { canActivate: false, reason: "No quedan copias de 'Dragón de Trueno' en tu Deck para buscar." };
        }
        return { canActivate: true };
    },

    async onActivate(arg1, arg2, arg3, arg4) {
        let duelState, playerKey, roomId;
        if (arg1 && arg1.duelState) {
            ({ duelState, playerKey, roomId } = arg1);
        } else {
            duelState = arg1;
            playerKey = arg2;
        }
        roomId = roomId || duelState?.roomId || 'ROOM_DEMO';
        const player = duelState ? duelState[playerKey] : null;
        if (!player || !player.deck) return { success: false };

        const { emitDuelLog, enrichDuelStateForBroadcast, checkDuelGameOver, getIo } = require('../duel-state');

        // Buscar hasta 2 copias de Thunder Dragon en el Deck
        const added = [];
        for (let i = player.deck.length - 1; i >= 0 && added.length < 2; i--) {
            const c = player.deck[i];
            const cId = Number(c.card_id || c.id || (c.card_data && c.card_data.id));
            if (cId === 31786629) {
                player.deck.splice(i, 1);
                added.push(c);
            }
        }

        if (added.length > 0) {
            player.hand.push(...added);
            player.mainDeckCount = player.deck.length;
            emitDuelLog(roomId, `⚡ [Dragón de Trueno] ¡${player.username} se descarta a sí mismo y añade ${added.length} copia(s) de "Dragón de Trueno" de su Deck a su mano!`, 'spell');
        } else {
            emitDuelLog(roomId, `⚡ [Dragón de Trueno] ${player.username} se descarta, pero no se encontraron copias en el Deck.`, 'spell');
        }

        enrichDuelStateForBroadcast(duelState);
        checkDuelGameOver(roomId, duelState);
        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
        return { success: true };
    }
};
