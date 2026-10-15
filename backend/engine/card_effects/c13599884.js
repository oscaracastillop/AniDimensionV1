module.exports = {
    id: 13599884,
    name: "Steel Scorpion",
    type: "Effect Monster",
    atk: 250, def: 300, level: 1, race: "Machine",

    async onBattleEnd(context) {
        const { duelState, opponentMonster, opponentKey, effectUtils } = context;
        if (opponentMonster && opponentMonster.race !== 'Machine') {
            opponentMonster.poisoned = true;
            effectUtils.emitDuelLog(duelState.roomId, `🦂⚙️ [Steel Scorpion] ¡Veneno metálico inoculado a '${opponentMonster.name}'! Será destruido al final de su segundo turno.`, 'monster');
            return { success: true, poisoned: true };
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `🦂 [Steel Scorpion] ¡El aguijón de acero inyecta toxinas a los monstruos que no sean de tipo Máquina!`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
