/**
 * [Passcode: 74094021] Legendary Six Samurai - Mizuho
 * Tipo: Effect Monster (Level 3 / Fire / Warrior / 1600 ATK / 1000 DEF)
 * Invocación Especial inherente si controlas a Shinai.
 * Ignición (1 vez por turno): Tributa otro Six Samurai para destruir 1 carta en el campo.
 */
module.exports = {
    canSpecialSummonSelf: true,

    canSpecialSummon({ duelState, playerKey }) {
        const player = duelState[playerKey] || {};
        const monsters = player.monsters || [];
        const hasShinai = monsters.some(m => m && !m.faceDown && ((m.card_data?.name || m.name || '').toLowerCase().includes('shinai')));
        if (hasShinai) return { canSummon: true };
        return { canSummon: false, reason: 'Requiere controlar a "Legendary Six Samurai - Shinai" boca arriba.' };
    },
    id: 74094021,
    name: "Legendary Six Samurai - Mizuho",
    type: "Effect Monster",
    atk: 1600,
    def: 1000,
    level: 3,
    race: "Warrior",
    attribute: "FIRE",
    canSpecialSummonSelf: true,
    isIgnition: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const opponent = duelState[opponentKey] || {};
        const pMonsters = player.monsters || [];
        const oppMonsters = opponent.monsters || [];
        const oppSpells = opponent.spells || [];

        // 1. Validar que haya otro Six Samurai para tributar
        const otherSixSamIdx = pMonsters.findIndex(m => {
            if (!m || m.faceDown) return false;
            const mId = Number(m.card_id || (m.card_data ? m.card_data.id : 0));
            const mName = (m.card_data?.name || m.name || '').toLowerCase();
            return mId !== 74094021 && (mName.includes('six samurai') || mName.includes('seis samurai'));
        });

        if (otherSixSamIdx === -1) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [Mizuho] Requiere tributar otro monstruo "Six Samurai" en tu campo.`, 'warning');
            return { success: false, reason: 'No hay otro Six Samurai para tributar' };
        }

        // 2. Tributar al otro Six Samurai
        const tributed = pMonsters[otherSixSamIdx];
        pMonsters[otherSixSamIdx] = null;
        effectUtils.sendCardToGraveyard(duelState, tributed, playerKey);

        // 3. Buscar objetivo para destruir (preferencia rival)
        let targetCard = null;
        let targetSlot = -1;
        let targetIsSpell = false;

        // Prioridad: Monstruo rival más fuerte
        const rivalMonIdx = oppMonsters.findIndex(m => m !== null);
        if (rivalMonIdx !== -1) {
            targetCard = oppMonsters[rivalMonIdx];
            targetSlot = rivalMonIdx;
            oppMonsters[rivalMonIdx] = null;
            effectUtils.sendCardToGraveyard(duelState, targetCard, opponentKey);
            effectUtils.emitDuelLog(duelState.roomId, `🌸💥 [Mizuho] Sacrificó a "${tributed.card_data ? tributed.card_data.name : 'Six Samurai'}" y destruyó a "${targetCard.card_data ? targetCard.card_data.name : 'Monstruo'}" del adversario!`, 'spell');
            return { success: true };
        }

        // Si no hay monstruo rival, magia/trampa rival
        const rivalSpellIdx = oppSpells.findIndex(s => s !== null);
        if (rivalSpellIdx !== -1) {
            targetCard = oppSpells[rivalSpellIdx];
            oppSpells[rivalSpellIdx] = null;
            effectUtils.sendCardToGraveyard(duelState, targetCard, opponentKey);
            effectUtils.emitDuelLog(duelState.roomId, `🌸💥 [Mizuho] Sacrificó a "${tributed.card_data ? tributed.card_data.name : 'Six Samurai'}" y destruyó una Carta Mágica/Trampa del adversario!`, 'spell');
            return { success: true };
        }

        effectUtils.emitDuelLog(duelState.roomId, `🌸 [Mizuho] Sacrificó a "${tributed.card_data ? tributed.card_data.name : 'Six Samurai'}".`, 'spell');
        return { success: true };
    }
};