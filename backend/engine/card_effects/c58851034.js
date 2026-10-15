/**
 * [Passcode: 58851034] Cursed Seal of the Forbidden Spell
 * Tipo: Counter Trap
 * Auténtica lógica OCG con mutaciones de estado en el duelo
 */
module.exports = {
    id: 58851034,
    name: "Cursed Seal of the Forbidden Spell",
    type: "Counter Trap",
    atk: 0, def: 0, level: 0, race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppSpells = opp.spells || [];
        let destroyed = null;
        for (let i = 0; i < oppSpells.length; i++) {
            if (oppSpells[i]) {
                destroyed = oppSpells[i];
                effectUtils.sendCardToGraveyard(duelState, opponentKey, destroyed);
                oppSpells[i] = null;
                break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `💥 [${this.name}] Destruye la carta mágica/trampa enemiga '${destroyed ? destroyed.name : 'Magia/Trampa'}' en el campo.`, 'effect');
        return { success: true, destroyed: destroyed ? destroyed.name : null };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
