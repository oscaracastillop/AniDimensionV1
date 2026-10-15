/**
 * [Passcode: 98045062] Enemy Controller (Controlador de Enemigos)
 * Tipo: Quick-Play Spell
 * Dos efectos seleccionables por el usuario:
 * - Efecto 1: Cambiar la posición de batalla de 1 monstruo boca arriba del oponente.
 * - Efecto 2: Sacrificar 1 monstruo propio para tomar control de 1 monstruo rival hasta la End Phase.
 */
module.exports = {
    id: 98045062,
    name: "Enemy Controller",
    type: "Quick-Play Spell",
    atk: 0, def: 0, level: 0, race: "Quick-Play",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const choice = (targetData && targetData.effect_choice) || 1;

        if (choice === 1) {
            // Efecto 1: Cambiar posición de batalla de monstruo rival
            const oppMonsters = opp.monsters || [];
            let targetMonster = null;
            for (let i = 0; i < oppMonsters.length; i++) {
                const m = oppMonsters[i];
                if (m && !m.faceDown) {
                    targetMonster = m;
                    m.position = (m.position === 'ATK') ? 'DEF' : 'ATK';
                    effectUtils.emitDuelLog(duelState.roomId, `🎮🔄 [Enemy Controller - Efecto 1] ¡Cambia la posición de batalla de '${m.name}' a Posición de ${m.position}!`, 'spell');
                    return { success: true, option: 1, target: m.name, newPosition: m.position };
                }
            }
            effectUtils.emitDuelLog(duelState.roomId, `🎮 [Enemy Controller - Efecto 1] No hay monstruos boca arriba para cambiar de posición.`, 'spell');
            return { success: true, option: 1 };
        } else {
            // Efecto 2: Sacrificar 1 monstruo propio y tomar control de 1 monstruo rival
            const myMonsters = player.monsters || [];
            const oppMonsters = opp.monsters || [];

            let tributedMonster = null;
            for (let i = 0; i < myMonsters.length; i++) {
                if (myMonsters[i]) {
                    tributedMonster = myMonsters[i];
                    effectUtils.sendCardToGraveyard(duelState, playerKey, tributedMonster);
                    myMonsters[i] = null;
                    break;
                }
            }

            let takenMonster = null;
            let emptyMySlot = myMonsters.findIndex(m => m === null);
            for (let i = 0; i < oppMonsters.length; i++) {
                if (oppMonsters[i] && !oppMonsters[i].faceDown && emptyMySlot !== -1) {
                    takenMonster = oppMonsters[i];
                    oppMonsters[i] = null;
                    takenMonster.originalController = opponentKey;
                    takenMonster.returnAtEndPhase = true;
                    myMonsters[emptyMySlot] = takenMonster;
                    break;
                }
            }

            effectUtils.emitDuelLog(duelState.roomId, `🎮🧠 [Enemy Controller - Efecto 2] ¡Sacrifica a '${tributedMonster ? tributedMonster.name : 'Monstruo'}' y toma el control de '${takenMonster ? takenMonster.name : 'Monstruo Rival'}' hasta el final del turno!`, 'spell');
            return { success: true, option: 2, tributed: tributedMonster ? tributedMonster.name : null, taken: takenMonster ? takenMonster.name : null };
        }
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
