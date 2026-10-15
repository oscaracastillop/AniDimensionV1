/**
 * [Passcode: 90397998] The Six Samurai - Kamon
 * Tipo: Effect Monster (Level 3 / Fire / Warrior / 1500 ATK / 1000 DEF)
 * Ignición (1 vez por turno): Si controlas otro Six Samurai, destruye 1 Magia/Trampa boca arriba.
 */
module.exports = {
    id: 90397998,
    name: "The Six Samurai - Kamon",
    type: "Effect Monster",
    atk: 1500,
    def: 1000,
    level: 3,
    race: "Warrior",
    attribute: "FIRE",
    isIgnition: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const opponent = duelState[opponentKey] || {};
        const pMonsters = player.monsters || [];
        const oppSpells = opponent.spells || [];

        const hasOtherSS = pMonsters.some(m => {
            if (!m || m.faceDown) return false;
            const mId = Number(m.card_id || (m.card_data ? m.card_data.id : 0));
            const mName = (m.card_data?.name || m.name || '').toLowerCase();
            return mId !== 90397998 && (mName.includes('six samurai') || mName.includes('seis samurai'));
        });

        if (!hasOtherSS) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [Kamon] Requiere controlar otro monstruo "Six Samurai" con diferente nombre en el campo.`, 'warning');
            return { success: false, reason: 'Sin otro Six Samurai' };
        }

        const targetIdx = oppSpells.findIndex(s => s && !s.faceDown && s.position !== 'SET');
        if (targetIdx !== -1) {
            const destroyed = oppSpells[targetIdx];
            oppSpells[targetIdx] = null;
            effectUtils.sendCardToGraveyard(duelState, destroyed, opponentKey);
            effectUtils.emitDuelLog(duelState.roomId, `💣💥 [Kamon] ¡Destruyó la Carta Mágica/Trampa boca arriba del rival!`, 'spell');
            return { success: true };
        } else {
            effectUtils.emitDuelLog(duelState.roomId, `💣 [Kamon] El adversario no tiene Magias/Trampas boca arriba para destruir.`, 'effect');
            return { success: false, reason: 'No hay objetivo' };
        }
    }
};