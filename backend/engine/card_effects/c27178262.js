/**
 * [Passcode: 27178262] Cunning of the Six Samurai
 * Tipo: Quick-Play Spell
 * Envía 1 Six Samurai que controles al Cementerio; invoca Especialmente 1 Six Samurai del Cementerio.
 */
module.exports = {
    id: 27178262,
    name: "Cunning of the Six Samurai",
    type: "Quick-Play Spell",
    isQuickPlay: true,

    canActivate(duelState, playerKey) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const pMonsters = player.monsters || [];
        const pGY = player.graveyard || [];

        const hasFieldSS = pMonsters.some(m => {
            if (!m || m.faceDown) return false;
            const mName = (m.card_data?.name || m.name || '').toLowerCase();
            return mName.includes('six samurai') || mName.includes('seis samurai');
        });
        if (!hasFieldSS) return false;

        const hasGySS = pGY.some(c => {
            const cName = (c.name || '').toLowerCase();
            return cName.includes('six samurai') || cName.includes('seis samurai');
        });
        return hasGySS;
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const pMonsters = player.monsters || [];
        const pGY = player.graveyard || [];

        // Buscar 1 Six Samurai en campo
        let fieldIdx = -1;
        if (targetData && targetData.slot_index !== undefined && pMonsters[targetData.slot_index]) {
            const m = pMonsters[targetData.slot_index];
            const mName = (m.card_data?.name || m.name || '').toLowerCase();
            if (mName.includes('six samurai') || mName.includes('seis samurai')) {
                fieldIdx = targetData.slot_index;
            }
        }

        if (fieldIdx === -1) {
            fieldIdx = pMonsters.findIndex(m => {
                if (!m || m.faceDown) return false;
                const mName = (m.card_data?.name || m.name || '').toLowerCase();
                return mName.includes('six samurai') || mName.includes('seis samurai');
            });
        }

        if (fieldIdx === -1) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [Cunning of the Six Samurai] Debes controlar al menos 1 monstruo Six Samurai boca arriba.`, 'warning');
            return { success: false, reason: 'Sin Six Samurai en campo' };
        }

        // Buscar 1 Six Samurai en GY
        const gyIdx = pGY.findIndex(c => {
            const cName = (c.name || '').toLowerCase();
            return cName.includes('six samurai') || cName.includes('seis samurai');
        });

        if (gyIdx === -1) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [Cunning of the Six Samurai] No hay ningún monstruo Six Samurai en el Cementerio para revivir.`, 'warning');
            return { success: false, reason: 'Sin Six Samurai en GY' };
        }

        // Enviar el del campo al GY
        const sentToGy = pMonsters[fieldIdx];
        pMonsters[fieldIdx] = null;
        effectUtils.sendCardToGraveyard(duelState, sentToGy, playerKey);

        // Revivir el del GY en la casilla liberada
        const [revivedCard] = pGY.splice(gyIdx, 1);
        const freeSlot = pMonsters.findIndex(m => m === null);
        const revId = Number(revivedCard.id || revivedCard.card_id);
        pMonsters[freeSlot] = {
            card_id: revId,
            position: 'ATK',
            faceDown: false,
            hasAttacked: false,
            turnSummoned: duelState.turnNumber,
            card_data: { ...revivedCard, id: revId, card_id: revId }
        };
        effectUtils.calculateMonsterCurrentStats(pMonsters[freeSlot], duelState);
        effectUtils.emitDuelLog(duelState.roomId, `⚔️♻️ [Cunning of the Six Samurai] Envió a "${sentToGy.card_data ? sentToGy.card_data.name : 'Six Samurai'}" al GY. ¡Revive a "${revivedCard.name}" del Cementerio!`, 'summon');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};