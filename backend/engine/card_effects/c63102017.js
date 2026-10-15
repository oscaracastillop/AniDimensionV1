/**
 * [Passcode: 63102017] Stop Defense
 * Tipo: Normal Spell
 * Efecto OCG: Selecciona 1 monstruo en Posición de Defensa en el campo de tu adversario
 * (boca arriba o boca abajo) y cámbialo a Posición de Ataque boca arriba.
 * Si estaba boca abajo y tiene Efecto de Volteo, se activa.
 */
module.exports = {
    id: 63102017,
    name: "Stop Defense",
    type: "Normal Spell",
    race: "Spell",

    /**
     * Validador de activación: ¿El adversario controla al menos 1 monstruo en Posición de Defensa (DEF o SET)?
     */
    canActivate({ duelState, opponentKey }) {
        const opp = duelState && duelState[opponentKey];
        if (!opp || !opp.monsters) return { canActivate: false, reason: 'El adversario no tiene monstruos en el campo.' };
        const hasDef = opp.monsters.some(m => m && (m.position === 'DEF' || m.position === 'SET' || m.faceDown === true));
        if (!hasDef) {
            return {
                canActivate: false,
                reason: 'El adversario no controla ningún monstruo en Posición de Defensa (boca arriba o boca abajo).'
            };
        }
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = duelState[opponentKey];
        if (!opp || !opp.monsters) {
            effectUtils.emitDuelLog(duelState.roomId, `🛡️ [Stop Defense] No hay monstruos en el campo rival.`, 'spell');
            return { success: false, reason: 'Sin monstruos' };
        }

        let targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : undefined;
        if (targetSlot === undefined || !opp.monsters[targetSlot] || !(opp.monsters[targetSlot].position === 'DEF' || opp.monsters[targetSlot].position === 'SET' || opp.monsters[targetSlot].faceDown)) {
            targetSlot = opp.monsters.findIndex(m => m && (m.position === 'DEF' || m.position === 'SET' || m.faceDown === true));
        }

        if (targetSlot !== -1 && opp.monsters[targetSlot]) {
            const m = opp.monsters[targetSlot];
            const wasFaceDown = Boolean(m.faceDown || m.position === 'SET');
            m.position = 'ATK';
            m.faceDown = false;

            if (effectUtils && typeof effectUtils.calculateMonsterCurrentStats === 'function') {
                effectUtils.calculateMonsterCurrentStats(m, duelState, opponentKey);
            }

            const monName = m.card_data ? m.card_data.name : 'Monstruo';
            effectUtils.emitDuelLog(
                duelState.roomId,
                `🛡️⚔️ [Stop Defense] ¡"${monName}" (casilla #${targetSlot + 1} del rival) es forzado a Posición de Ataque boca arriba!`,
                'spell'
            );

            // Si estaba boca abajo y posee efecto de volteo, se activa inmediatamente
            if (wasFaceDown && effectUtils && typeof effectUtils.checkIsFlipMonster === 'function' && effectUtils.checkIsFlipMonster(m)) {
                if (typeof effectUtils.executeFlipEffect === 'function') {
                    await effectUtils.executeFlipEffect(duelState, opponentKey, playerKey, targetSlot, m);
                }
            }

            return { success: true, targetSlot, monsterName: monName };
        }

        effectUtils.emitDuelLog(duelState.roomId, `🛡️ [Stop Defense] No se encontró ningún monstruo en Posición de Defensa en el campo rival.`, 'spell');
        return { success: false, reason: 'Sin objetivo en defensa' };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
