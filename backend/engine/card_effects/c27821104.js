/**
 * [Passcode: 27821104] Asceticism of the Six Samurai
 * Tipo: Quick-Play Spell
 * Selecciona 1 monstruo "Six Samurai" boca arriba que controles; Invoca de Modo Especial, desde tu Deck, 
 * 1 monstruo "Six Samurai" con el mismo ATK pero diferente nombre. Destrúyelo durante la End Phase de este turno.
 */
module.exports = {
    id: 27821104,
    name: "Asceticism of the Six Samurai",
    type: "Quick-Play Spell",
    isQuickPlay: true,

    canActivate(duelState, playerKey) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const pMonsters = player.monsters || [];
        const pDeck = player.deck || [];
        const freeSlot = pMonsters.findIndex(m => m === null);
        if (freeSlot === -1) return false;

        // Debe haber al menos 1 Six Samurai boca arriba con un candidato en el Deck de igual ATK y distinto nombre
        const ssField = pMonsters.filter(m => {
            if (!m || m.faceDown) return false;
            const name = (m.card_data?.name || m.name || '').toLowerCase();
            return name.includes('six samurai') || name.includes('seis samurai');
        });
        if (ssField.length === 0) return false;

        return ssField.some(fieldMon => {
            const fieldAtk = fieldMon.currentAtk !== undefined ? fieldMon.currentAtk : (fieldMon.card_data?.atk || 0);
            const fieldName = (fieldMon.card_data?.name || fieldMon.name || '').toLowerCase();
            return pDeck.some(deckCard => {
                const deckName = (deckCard.name || '').toLowerCase();
                const isSS = deckName.includes('six samurai') || deckName.includes('seis samurai');
                const sameAtk = Number(deckCard.atk) === Number(fieldAtk);
                const diffName = deckName !== fieldName;
                return isSS && sameAtk && diffName;
            });
        });
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const pMonsters = player.monsters || [];
        const pDeck = player.deck || [];

        const freeSlot = pMonsters.findIndex(m => m === null);
        if (freeSlot === -1) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [Asceticism of the Six Samurai] No hay zonas de monstruos disponibles.`, 'warning');
            return { success: false, reason: 'Sin zonas disponibles' };
        }

        // Buscar el monstruo objetivo en campo (o el primero elegible)
        let targetMon = null;
        if (targetData && targetData.slot_index !== undefined && pMonsters[targetData.slot_index]) {
            targetMon = pMonsters[targetData.slot_index];
        } else {
            targetMon = pMonsters.find(m => {
                if (!m || m.faceDown) return false;
                const name = (m.card_data?.name || m.name || '').toLowerCase();
                if (!name.includes('six samurai') && !name.includes('seis samurai')) return false;
                const fieldAtk = m.currentAtk !== undefined ? m.currentAtk : (m.card_data?.atk || 0);
                const fieldName = name;
                return pDeck.some(dc => {
                    const dn = (dc.name || '').toLowerCase();
                    return (dn.includes('six samurai') || dn.includes('seis samurai')) && Number(dc.atk) === Number(fieldAtk) && dn !== fieldName;
                });
            });
        }

        if (!targetMon) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [Asceticism of the Six Samurai] No hay un monstruo Six Samurai válido en el campo como objetivo.`, 'warning');
            return { success: false, reason: 'Sin objetivo válido' };
        }

        const targetAtk = targetMon.currentAtk !== undefined ? targetMon.currentAtk : (targetMon.card_data?.atk || 0);
        const targetName = (targetMon.card_data?.name || targetMon.name || '').toLowerCase();

        const matchIdx = pDeck.findIndex(dc => {
            const dn = (dc.name || '').toLowerCase();
            return (dn.includes('six samurai') || dn.includes('seis samurai')) && Number(dc.atk) === Number(targetAtk) && dn !== targetName;
        });

        if (matchIdx === -1) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [Asceticism of the Six Samurai] No hay ningún Six Samurai en el Deck con ${targetAtk} ATK y nombre diferente.`, 'warning');
            return { success: false, reason: 'Sin coincidencia en Deck' };
        }

        const [summonedCard] = pDeck.splice(matchIdx, 1);
        const cardId = Number(summonedCard.id || summonedCard.card_id);

        pMonsters[freeSlot] = {
            card_id: cardId,
            position: 'ATK',
            faceDown: false,
            hasAttacked: false,
            turnSummoned: duelState.turnNumber,
            destroyAtEndPhase: true,
            card_data: { ...summonedCard, id: cardId, card_id: cardId }
        };

        effectUtils.calculateMonsterCurrentStats(pMonsters[freeSlot], duelState);
        effectUtils.emitDuelLog(duelState.roomId, `⚡⚔️ [Asceticism of the Six Samurai] En sincronía con "${targetMon.card_data?.name || 'Six Samurai'}" (${targetAtk} ATK). ¡Invoca de Modo Especial a "${summonedCard.name}" desde el Deck! (Se destruirá al final del turno)`, 'summon');

        const { triggerOnSummonHooks } = require('../duel-actions');
        if (typeof triggerOnSummonHooks === 'function') {
            triggerOnSummonHooks(duelState, summonedCard, 'SPECIAL', playerKey);
        }

        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
