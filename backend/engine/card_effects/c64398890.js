/**
 * [Passcode: 64398890] The Six Samurai - Yaichi
 * Tipo: Effect Monster (Level 3 / Water / Warrior / 1300 ATK / 800 DEF)
 * Ignición (1 vez por turno): Si controlas otro Six Samurai, destruye 1 Magia/Trampa boca abajo.
 */
module.exports = {
    id: 64398890,
    name: "The Six Samurai - Yaichi",
    type: "Effect Monster",
    atk: 1300,
    def: 800,
    level: 3,
    race: "Warrior",
    attribute: "WATER",
    isIgnition: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const opponent = duelState[opponentKey] || {};
        const pMonsters = player.monsters || [];
        const oppSpells = opponent.spells || [];

        // Validar que controle otro Six Samurai
        const hasOtherSS = pMonsters.some(m => {
            if (!m || m.faceDown) return false;
            const mId = Number(m.card_id || (m.card_data ? m.card_data.id : 0));
            const mName = (m.card_data?.name || m.name || '').toLowerCase();
            return mId !== 64398890 && (mName.includes('six samurai') || mName.includes('seis samurai'));
        });

        if (!hasOtherSS) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [Yaichi] Requiere controlar otro monstruo "Six Samurai" con diferente nombre en el campo.`, 'warning');
            return { success: false, reason: 'Sin otro Six Samurai' };
        }

        // Buscar Magia/Trampa boca abajo
        const targetIdx = oppSpells.findIndex(s => s && (s.faceDown || s.position === 'SET'));
        if (targetIdx !== -1) {
            const destroyed = oppSpells[targetIdx];
            oppSpells[targetIdx] = null;
            effectUtils.sendCardToGraveyard(duelState, destroyed, opponentKey);
            effectUtils.emitDuelLog(duelState.roomId, `🏹💥 [Yaichi] ¡Destruyó la Carta Mágica/Trampa boca abajo del rival!`, 'spell');
            return { success: true };
        } else {
            effectUtils.emitDuelLog(duelState.roomId, `🏹 [Yaichi] El adversario no tiene Magias/Trampas boca abajo para destruir.`, 'effect');
            return { success: false, reason: 'No hay objetivo' };
        }
    }
};