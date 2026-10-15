/**
 * [Passcode: 54913680] Six Scrolls of the Samurai
 * Tipo: Quick-Play Spell
 * Sacrifica 2 monstruos Six Samurai para invocar de Modo Especial a "Great Shogun Shien" desde tu Deck.
 */
module.exports = {
    id: 54913680,
    name: "Six Scrolls of the Samurai",
    type: "Quick-Play Spell",
    isQuickPlay: true,

    canActivate(duelState, playerKey) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const pMonsters = player.monsters || [];
        const pDeck = player.deck || [];

        const ssCount = pMonsters.filter(m => {
            if (!m || m.faceDown) return false;
            const mName = (m.card_data?.name || m.name || '').toLowerCase();
            return mName.includes('six samurai') || mName.includes('seis samurai');
        }).length;
        if (ssCount < 2) return false;

        const hasShien = pDeck.some(c => {
            const cId = Number(c.id || c.card_id);
            const cName = (c.name || '').toLowerCase();
            return cId === 63014935 || cName.includes('great shogun shien');
        });
        return hasShien;
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const pMonsters = player.monsters || [];
        const pDeck = player.deck || [];

        // Buscar 2 Six Samurai en campo
        const ssIndices = [];
        pMonsters.forEach((m, idx) => {
            if (m && !m.faceDown) {
                const mName = (m.card_data?.name || m.name || '').toLowerCase();
                if (mName.includes('six samurai') || mName.includes('seis samurai')) {
                    ssIndices.push(idx);
                }
            }
        });

        if (ssIndices.length < 2) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [Six Scrolls of the Samurai] Requiere tributar 2 monstruos Six Samurai en el campo (Controlas: ${ssIndices.length}).`, 'warning');
            return { success: false, reason: 'Monstruos insuficientes' };
        }

        // Buscar Great Shogun Shien en Deck (ID 63014935)
        const shienIdx = pDeck.findIndex(c => {
            const cId = Number(c.id || c.card_id);
            const cName = (c.name || '').toLowerCase();
            return cId === 63014935 || cName.includes('great shogun shien');
        });

        if (shienIdx === -1) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [Six Scrolls of the Samurai] No hay "Great Shogun Shien" en tu Deck.`, 'warning');
            return { success: false, reason: 'Sin Shien en Deck' };
        }

        // Sacrificar los 2 monstruos
        const t1 = pMonsters[ssIndices[0]];
        const t2 = pMonsters[ssIndices[1]];
        pMonsters[ssIndices[0]] = null;
        pMonsters[ssIndices[1]] = null;
        effectUtils.sendCardToGraveyard(duelState, t1, playerKey);
        effectUtils.sendCardToGraveyard(duelState, t2, playerKey);

        // Invocar a Great Shogun Shien
        const [shienCard] = pDeck.splice(shienIdx, 1);
        const freeSlot = pMonsters.findIndex(m => m === null);
        pMonsters[freeSlot] = {
            card_id: 63014935,
            position: 'ATK',
            faceDown: false,
            hasAttacked: false,
            turnSummoned: duelState.turnNumber,
            card_data: { ...shienCard, id: 63014935, card_id: 63014935, atk: 2500, def: 2400 }
        };
        effectUtils.calculateMonsterCurrentStats(pMonsters[freeSlot], duelState);
        effectUtils.emitDuelLog(duelState.roomId, `⚡👑 [Six Scrolls of the Samurai] Sacrificó 2 Six Samurai. ¡Invoca de Modo Especial a "Great Shogun Shien" (2500 ATK) desde el Deck!`, 'summon');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};