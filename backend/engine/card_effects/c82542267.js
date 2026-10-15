/**
 * Gravedigger Ghoul (Ladrón de Tumbas / Cavador de Tumbas) - Passcode: 82542267
 * Regla Oficial Konami OCG:
 * Selecciona hasta 2 monstruos en el Cementerio de tu adversario; destiérralos.
 */
module.exports = {
    id: 82542267,
    name: "Gravedigger Ghoul",
    isSpell: true,
    requiresTarget: true,
    targetType: 'GRAVE_OPPONENT',

    canActivate(arg1, arg2, arg3) {
        let duelState, opponentKey;
        if (arg1 && arg1.duelState) {
            ({ duelState, opponentKey } = arg1);
        } else {
            duelState = arg1;
            opponentKey = arg3;
        }
        const opponent = duelState ? duelState[opponentKey] : null;
        if (!opponent || !opponent.graveyard || opponent.graveyard.length === 0) {
            return { canActivate: false, reason: "⚠️ [Gravedigger Ghoul] El Cementerio del rival está vacío." };
        }
        const hasMonsters = opponent.graveyard.some(c => {
            const cd = c.card_data || c;
            const t = (cd.type || '').toString().toLowerCase();
            return t.includes('monster') || t.includes('monstruo') || (cd.atk !== undefined && cd.atk !== null);
        });
        if (!hasMonsters) {
            return { canActivate: false, reason: "⚠️ [Gravedigger Ghoul] No hay monstruos en el Cementerio del rival para desterrar." };
        }
        return { canActivate: true };
    },

    async onActivate(arg1, arg2, arg3, arg4) {
        let duelState, playerKey, opponentKey, targetData, roomId;
        if (arg1 && arg1.duelState) {
            ({ duelState, playerKey, opponentKey, targetData, roomId } = arg1);
        } else {
            duelState = arg1;
            playerKey = arg2;
            opponentKey = arg3;
            targetData = arg4;
        }
        roomId = roomId || duelState?.roomId || 'ROOM_DEMO';
        const opponent = duelState ? duelState[opponentKey] : null;
        const player = duelState ? duelState[playerKey] : null;
        if (!opponent || !opponent.graveyard) return { success: false };

        const { sendCardToBanished, emitDuelLog, enrichDuelStateForBroadcast, checkDuelGameOver, getIo } = require('../duel-state');

        const targets = targetData && targetData.selected_cards ? targetData.selected_cards : [];
        const banishedNames = [];

        // Si se recibieron índices o IDs específicos del modal
        if (Array.isArray(targets) && targets.length > 0) {
            const sortedIndices = targets.map(t => {
                if (typeof t === 'number') return t;
                return opponent.graveyard.findIndex(c => Number(c.card_id || c.id || (c.card_data && c.card_data.id)) === Number(t.card_id || t.id || t));
            }).filter(idx => idx >= 0 && idx < opponent.graveyard.length).sort((a, b) => b - a);

            for (const idx of sortedIndices) {
                if (opponent.graveyard[idx] && banishedNames.length < 2) {
                    const [card] = opponent.graveyard.splice(idx, 1);
                    sendCardToBanished(duelState, card, opponentKey);
                    banishedNames.push(card.card_data?.name || card.name || 'Monstruo');
                }
            }
        }

        // Respaldo reglamentario si no se especificaron índices exactos (hasta 2 monstruos)
        if (banishedNames.length === 0) {
            for (let i = opponent.graveyard.length - 1; i >= 0 && banishedNames.length < 2; i--) {
                const c = opponent.graveyard[i];
                const cd = c.card_data || c;
                const t = (cd.type || '').toString().toLowerCase();
                if (t.includes('monster') || t.includes('monstruo') || (cd.atk !== undefined && cd.atk !== null)) {
                    opponent.graveyard.splice(i, 1);
                    sendCardToBanished(duelState, c, opponentKey);
                    banishedNames.push(cd.name || 'Monstruo');
                }
            }
        }

        emitDuelLog(roomId, `🪦👻 [Gravedigger Ghoul] ¡${player ? player.username : 'Jugador'} activa "Gravedigger Ghoul" y destierra ${banishedNames.length} monstruo(s) (${banishedNames.join(', ')}) del Cementerio de ${opponent.username}!`, 'spell');

        enrichDuelStateForBroadcast(duelState);
        checkDuelGameOver(roomId, duelState);
        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
        return { success: true };
    }
};
