/**
 * [Passcode: 72709014] Trial of the Princesses
 * Tipo: Equip Spell Card
 * Arquetipo: General
 */
module.exports = {
    id: 72709014,
    name: "Trial of the Princesses",
    type: "Equip Spell Card",
    atk: 0,
    def: 0,
    level: 0,
    race: "",
    isEquip: true,
    isField: false,
    isContinuous: false,
    isQuickPlay: false,
    isCounter: false,
    canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const playerField = player.field || player;
        const oppField = opponent.field || opponent;
        const pMonsters = playerField.monsters || player.monsters || [];
        const oppMonsters = oppField.monsters || opponent.monsters || [];
        const pSpells = playerField.spells || player.spells || [];
        const oppSpells = oppField.spells || opponent.spells || [];
        const pHand = player.hand || [];
        const oppHand = opponent.hand || [];
        const pDeck = player.deck || [];
        const oppDeck = opponent.deck || [];
        const pGY = playerField.graveyard || player.graveyard || [];
        const oppGY = oppField.graveyard || opponent.graveyard || [];

        // Magia de Equipo: Incremento dinámico
        let targetSlot = targetData ? (targetData.target_slot !== undefined ? targetData.target_slot : targetData.slot_index) : undefined;
        let targetMonster = (targetSlot !== undefined && pMonsters[targetSlot]) ? pMonsters[targetSlot] : pMonsters.find(m => m && !m.faceDown);
        if (targetMonster) {
            if (!targetMonster.attachedEffects) targetMonster.attachedEffects = [];
            targetMonster.attachedEffects.push({ card_id: 72709014, card_name: this.name, effect_type: 'EQUIP', atkDelta: 800, defDelta: 300 });
            effectUtils.calculateMonsterCurrentStats(targetMonster, duelState, playerKey);
            effectUtils.emitDuelLog(duelState.roomId, `🗡️✨ [${this.name}] Equipado a "${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}" (+800 ATK / +300 DEF).`, 'spell');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, `🗡️ [${this.name}] Activado en el campo.`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
