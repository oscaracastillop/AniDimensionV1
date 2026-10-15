/**
 * [Passcode: 61204415 / 61204971] Elemental HERO Thunder Giant (HÉROE Elemental Thunder Giant)
 * Tipo: FUSION_EFFECT_MONSTER
 * ATK: 2400 / DEF: 1500
 * Materiales: "Elemental HERO Sparkman" + "Elemental HERO Clayman"
 * Efecto: Once per turn: You can discard 1 card, then target 1 face-up monster on the field with original ATK less than the ATK of this card; destroy that target.
 */

module.exports = {
    id: 61204415,
    aliasIds: [61204971],
    name: "Elemental HERO Thunder Giant",
    set: "TLM",
    type: "FUSION_EFFECT_MONSTER",
    atk: 2400,
    def: 1500,
    level: 6,
    race: "Warrior",
    attribute: "LIGHT",
    fusionMaterials: [20721928, 84327329],
    desc: "\"Elemental HERO Sparkman\" + \"Elemental HERO Clayman\"\nMust be Fusion Summoned. Once per turn: You can discard 1 card, then target 1 face-up monster on the field with original ATK less than the ATK of this card; destroy that target.",

    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const player = duelState[playerKey];
        const opp = duelState[opponentKey];

        if (!player.hand || player.hand.length === 0) {
            utils.emitDuelLog(duelState.roomId, `⚠️ [Thunder Giant] Requiere descartar 1 carta de tu mano.`, 'effect');
            return { success: false, reason: 'NO_HAND_CARD' };
        }

        let targetSlot = targetData && targetData.target_slot !== undefined ? targetData.target_slot : -1;
        if (targetSlot === -1 && opp.monsters) {
            targetSlot = opp.monsters.findIndex(m => m !== null && !m.faceDown && ((m.card_data && m.card_data.atk) || m.atk || 0) < 2400);
        }

        if (targetSlot === -1 || !opp.monsters[targetSlot]) {
            utils.emitDuelLog(duelState.roomId, `⚠️ [Thunder Giant] No hay monstruo rival válido con ATK original < 2400.`, 'effect');
            return { success: false, reason: 'NO_VALID_TARGET' };
        }

        const [discarded] = player.hand.splice(0, 1);
        utils.sendCardToGraveyard(duelState, discarded, playerKey);

        const targetMon = opp.monsters[targetSlot];
        opp.monsters[targetSlot] = null;
        utils.sendCardToGraveyard(duelState, targetMon, opponentKey);

        utils.emitDuelLog(duelState.roomId, `⚡🗿💥 [HÉROE Elemental Thunder Giant] ¡Descarta "${discarded.card_data ? discarded.card_data.name : 'Carta'}" y fulmina a "${targetMon.card_data ? targetMon.card_data.name : 'Monstruo'}" de ${opp.username}!`, 'effect');
        return { success: true };
    }
};
