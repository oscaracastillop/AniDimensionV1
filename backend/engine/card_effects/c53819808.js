/**
 * [Passcode: 53819808] Temple of the Six
 * Tipo: Field Spell
 * Efecto Oficial OCG:
 * Cada vez que uno o más monstruos "Six Samurai" son Invocados de Modo Normal o Especial, 
 * coloca 1 Contador Bushido en esta carta.
 * Los monstruos que controle tu adversario pierden 100 ATK y DEF por cada Contador Bushido en esta carta.
 */
module.exports = {
    id: 53819808,
    name: "Temple of the Six",
    type: "Field Spell",
    atk: 0,
    def: 0,
    level: 0,
    race: "Field",
    isEquip: false,
    isField: true,
    isContinuous: false,
    isQuickPlay: false,
    isCounter: false,
    canSpecialSummonSelf: false,

    canActivate(duelState, playerKey) {
        return true;
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        if (player.fieldSpell) {
            effectUtils.sendCardToGraveyard(duelState, player.fieldSpell, playerKey);
        }
        player.fieldSpell = {
            card_id: 53819808,
            bushidoCounters: 0,
            faceDown: false,
            position: 'ACT',
            card_data: { id: 53819808, name: this.name, type: "Field Spell", race: "Field" }
        };
        effectUtils.emitDuelLog(duelState.roomId, `🏯 [Temple of the Six] ¡El Templo de los Seis Samuráis es erigido en el campo!`, 'field');
        return { success: true };
    },

    onMonsterSummoned({ duelState, playerKey, summonedMeta, summonType, spellSlot }) {
        if (!spellSlot) return;
        spellSlot.bushidoCounters = (spellSlot.bushidoCounters || 0) + 1;
        const { emitDuelLog, recalculateAllFieldMonstersStats } = require('../duel-state');
        emitDuelLog(duelState.roomId, `🏯 [Temple of the Six] ¡Coloca 1 Contador Bushido! (Total en Templo: ${spellSlot.bushidoCounters})`, 'spell');
        recalculateAllFieldMonstersStats(duelState);
    },

    modifyStats(duelState, targetMonster, targetPlayerKey, controllerKey, fieldSlot) {
        if (targetPlayerKey !== controllerKey && fieldSlot && fieldSlot.bushidoCounters) {
            const reduction = Number(fieldSlot.bushidoCounters) * 100;
            return {
                atkMod: -reduction,
                defMod: -reduction
            };
        }
        return null;
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
