/**
 * [Passcode: 37390589] Kunai with Chain
 * Tipo: Normal Trap
 * Arquetipo / Expansión: TDGS
 * Efecto OCG:
 * Activa 1 o ambos efectos:
 * ● Cuando un monstruo del adversario declara un ataque: Selecciona el monstruo atacante; cámbialo a Posición de Defensa.
 * ● Selecciona 1 monstruo boca arriba que controles; equipa esta carta a ese objetivo. Éste gana 500 ATK.
 */
module.exports = {
    id: 37390589,
    name: "Kunai with Chain",
    type: "Normal Trap",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const choice = (targetData && targetData.effect_choice) ? Number(targetData.effect_choice) : 0; // 0 = Ambos, 1 = Cambiar DEF, 2 = +500 ATK

        // Efecto 1: Cambiar atacante rival a DEF
        if (choice === 0 || choice === 1) {
            const oppMonsters = opponent.monsters || [];
            let targetIdx = (targetData && typeof targetData.target_slot === 'number') ? targetData.target_slot : -1;
            let targetAttacker = null;
            if (targetIdx >= 0 && oppMonsters[targetIdx]) {
                targetAttacker = oppMonsters[targetIdx];
            } else {
                targetAttacker = oppMonsters.find(m => m && m.position === 'ATK' && !m.faceDown);
            }

            if (targetAttacker) {
                targetAttacker.position = 'DEF';
                effectUtils.emitDuelLog(duelState.roomId, `🛡️⛓️ [Kunai with Chain] ¡Cambió a "${targetAttacker.card_data?.name || targetAttacker.name}" a Posición de Defensa! Ataque detenido.`, 'position');
            }
        }

        // Efecto 2: Equipar y dar +500 ATK
        if (choice === 0 || choice === 2) {
            const pMonsters = player.monsters || [];
            let myTarget = pMonsters.find(m => m && !m.faceDown);
            if (myTarget) {
                myTarget.atkMod = (myTarget.atkMod || 0) + 500;
                myTarget.currentAtk = (myTarget.currentAtk !== undefined ? myTarget.currentAtk : (myTarget.atk || 0)) + 500;
                effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [Kunai with Chain] ¡Equipado a "${myTarget.card_data?.name || myTarget.name}", ganando +500 ATK! (ATK actual: ${myTarget.currentAtk})`, 'boost');
            }
        }

        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
