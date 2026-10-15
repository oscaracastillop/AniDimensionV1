module.exports = {
    id: 71413901,
    name: "Breaker the Magical Warrior",
    type: "Effect Monster",
    atk: 1600, def: 1000, level: 4, race: "Spellcaster",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppSpells = opp.spells || [];

        let destroyedSpell = null;
        for (let i = 0; i < oppSpells.length; i++) {
            if (oppSpells[i]) {
                destroyedSpell = oppSpells[i];
                effectUtils.sendCardToGraveyard(duelState, opponentKey, destroyedSpell);
                oppSpells[i] = null;
                break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `🧙‍♂️⚡ [Breaker the Magical Warrior] ¡Breaker retira su Contador Mágico y destruye '${destroyedSpell ? destroyedSpell.name : 'Magia/Trampa enemiga'}'!`, 'monster');
        return { success: true, destroyed: destroyedSpell ? destroyedSpell.name : null };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
