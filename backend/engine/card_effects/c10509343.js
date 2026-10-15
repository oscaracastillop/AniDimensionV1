module.exports = {
    id: 75041269,
    name: "Clock Tower Prison",
    type: "FIELD_SPELL",
    onStandbyPhase: (duelState, playerKey, utils) => {
        const p = duelState[playerKey];
        const field = p.spells.find(s => s && (s.id === 75041269 || s.card_id === 75041269));
        if (field) {
            field.clockCounters = (field.clockCounters || 0) + 1;
            utils.emitDuelLog(duelState.roomId, `⏰ [Clock Tower Prison] Se añade 1 Contador Reloj (Total: ${field.clockCounters}).`);
        }
    }
};