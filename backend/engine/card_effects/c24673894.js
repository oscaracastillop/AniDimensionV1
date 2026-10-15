/**
 * [Passcode: 24673894] Changing Destiny
 * Tipo: Normal Trap
 * Arquetipo / Expansión: ABPF
 * Efecto OCG:
 * Actívala solo cuando se declara un ataque que involucre un monstruo que controles y uno del adversario.
 * Niega el ataque y elige 1 de estos efectos:
 * ● Tu adversario pierde LP iguales a la mitad del ATK del monstruo atacante.
 * ● Tu adversario gana LP iguales al ATK del monstruo atacante, pero ese monstruo no puede atacar por el resto del turno.
 */
module.exports = {
    id: 24673894,
    name: "Changing Destiny",
    type: "Normal Trap",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opponent.monsters || [];
        const attacker = oppMonsters.find(m => m && m.position === 'ATK' && !m.faceDown) || oppMonsters[0];

        const atkVal = attacker ? (attacker.currentAtk !== undefined ? attacker.currentAtk : (attacker.atk || 1000)) : 1000;
        const choice = (targetData && targetData.effect_choice) ? Number(targetData.effect_choice) : 1;

        if (choice === 1) {
            // Opción 1: Adversario pierde LP igual a la mitad del ATK del atacante
            const dmg = Math.floor(atkVal / 2);
            opponent.lp = Math.max(0, (opponent.lp || 8000) - dmg);
            effectUtils.emitDuelLog(duelState.roomId, `🛡️💥 [Changing Destiny] ¡Ataque negado! Opción 1: El adversario pierde ${dmg} LP (LP restantes: ${opponent.lp}).`, 'damage');
        } else {
            // Opción 2: Adversario gana LP igual al ATK del atacante, pero el atacante no puede atacar más este turno
            opponent.lp = (opponent.lp || 8000) + atkVal;
            if (attacker) {
                attacker.hasAttacked = true;
                attacker.cannotAttack = true;
            }
            effectUtils.emitDuelLog(duelState.roomId, `🛡️✨ [Changing Destiny] ¡Ataque negado! Opción 2: El adversario gana ${atkVal} LP (LP totales: ${opponent.lp}), pero el atacante no puede atacar más este turno.`, 'heal');
        }

        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
