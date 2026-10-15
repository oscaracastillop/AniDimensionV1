/**
 * [Passcode: 81426505] Six Strike - Triple Impact
 * Tipo: Normal Spell
 * Requisito: Controlar 3 o más monstruos "Six Samurai" boca arriba.
 * Elección modal de 3 efectos reglamentarios:
 * 1: Destruir todos los monstruos boca arriba del oponente.
 * 2: Destruir todas las Magias/Trampas boca arriba del oponente.
 * 3: Destruir todas las cartas boca abajo (SET) del oponente.
 */
module.exports = {
    id: 81426505,
    name: "Six Strike - Triple Impact",
    type: "Normal Spell",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const choice = (targetData && targetData.effect_choice) ? Number(targetData.effect_choice) : 1;

        const pMonsters = player.monsters || [];
        const sixSamCount = pMonsters.filter(m => m && !m.faceDown && ((m.card_data?.name || m.name || '').toLowerCase().includes('six samurai') || (m.card_data?.name || m.name || '').toLowerCase().includes('seis samur'))).length;

        if (sixSamCount < 3) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [${this.name}] Requiere controlar 3 o más monstruos "Seis Samuráis" boca arriba.`, 'effect');
            return { success: false, reason: 'Requires 3 or more Six Samurai monsters' };
        }

        let destroyedCount = 0;

        if (choice === 1) {
            // Destruir todos los monstruos boca arriba del rival
            (opp.monsters || []).forEach((m, idx) => {
                if (m && !m.faceDown) {
                    opp.monsters[idx] = null;
                    effectUtils.sendCardToGraveyard(duelState, m, opponentKey);
                    destroyedCount++;
                }
            });
            effectUtils.emitDuelLog(duelState.roomId, `💥⚔️ [${this.name}] ¡Destruye todos los monstruos boca arriba del rival (${destroyedCount} eliminados)!`, 'destroy');
        } else if (choice === 2) {
            // Destruir todas las Magias/Trampas boca arriba del rival
            (opp.spells || []).forEach((s, idx) => {
                if (s && !s.faceDown && s.position !== 'SET') {
                    opp.spells[idx] = null;
                    effectUtils.sendCardToGraveyard(duelState, s, opponentKey);
                    destroyedCount++;
                }
            });
            effectUtils.emitDuelLog(duelState.roomId, `💥✨ [${this.name}] ¡Destruye todas las Magias/Trampas boca arriba del rival (${destroyedCount} eliminadas)!`, 'destroy');
        } else {
            // Destruir todas las cartas boca abajo (SET) del rival
            (opp.monsters || []).forEach((m, idx) => {
                if (m && m.faceDown) {
                    opp.monsters[idx] = null;
                    effectUtils.sendCardToGraveyard(duelState, m, opponentKey);
                    destroyedCount++;
                }
            });
            (opp.spells || []).forEach((s, idx) => {
                if (s && (s.faceDown || s.position === 'SET')) {
                    opp.spells[idx] = null;
                    effectUtils.sendCardToGraveyard(duelState, s, opponentKey);
                    destroyedCount++;
                }
            });
            effectUtils.emitDuelLog(duelState.roomId, `💥🔒 [${this.name}] ¡Destruye todas las cartas boca abajo (SET) del rival (${destroyedCount} eliminadas)!`, 'destroy');
        }

        return { success: true, choice, destroyedCount };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
