/**
 * [Passcode: 9780364] Gladiator Taming
 * Tipo: Quick-Play Spell
 * Expansión: EXVC
 * Requisito: Debe haber al menos 1 monstruo "Gladiator Beast" boca arriba en el campo.
 * Efectos modales:
 * 1: Selecciona 1 monstruo boca arriba del oponente y cambia su posición de batalla.
 * 2: Selecciona 1 monstruo "Gladiator Beast" boca arriba del oponente y toma su control hasta la End Phase.
 */
module.exports = {
    id: 9780364,
    name: "Gladiator Taming",
    type: "Quick-Play Spell",
    atk: 0,
    def: 0,
    level: 0,
    race: "Quick-Play",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const choice = (targetData && targetData.effect_choice) ? Number(targetData.effect_choice) : 1;

        // Verificar si hay algún Gladiator Beast boca arriba en cualquier lado del campo
        const allMonsters = [...(player.monsters || []), ...(opp.monsters || [])];
        const hasGladBeast = allMonsters.some(m => m && !m.faceDown && ((m.card_data?.name || m.name || '').toLowerCase().includes('gladiator beast') || (m.card_data?.name || m.name || '').toLowerCase().includes('bestia gladiad')));

        if (!hasGladBeast) {
            return { success: false, reason: 'Debe haber al menos 1 monstruo "Bestia Gladiador" boca arriba en el campo.' };
        }

        if (choice === 1) {
            // Cambiar posición de batalla de monstruo rival boca arriba
            const oppMonsters = opp.monsters || [];
            let targetSlot = -1;
            if (targetData && targetData.slot_index !== undefined && oppMonsters[targetData.slot_index] && !oppMonsters[targetData.slot_index].faceDown) {
                targetSlot = targetData.slot_index;
            } else {
                targetSlot = oppMonsters.findIndex(m => m && !m.faceDown);
            }

            if (targetSlot !== -1 && oppMonsters[targetSlot]) {
                const targetMon = oppMonsters[targetSlot];
                targetMon.position = targetMon.position === 'ATK' ? 'DEF' : 'ATK';
                targetMon.hasChangedPosition = true;
                effectUtils.emitDuelLog(duelState.roomId, `🛡️⚔️ [${this.name}] ¡Domación de Gladiador cambió la posición de '${targetMon.card_data?.name || targetMon.name}' a ${targetMon.position}!`, 'position');
                return { success: true, choice: 1, newPosition: targetMon.position };
            }
            return { success: false, reason: 'No hay ningún monstruo rival boca arriba para cambiar su posición.' };
        } else {
            // Tomar control de 1 monstruo Gladiator Beast del rival
            const oppMonsters = opp.monsters || [];
            let targetSlot = -1;
            if (targetData && targetData.slot_index !== undefined && oppMonsters[targetData.slot_index]) {
                targetSlot = targetData.slot_index;
            } else {
                targetSlot = oppMonsters.findIndex(m => m && !m.faceDown && ((m.card_data?.name || m.name || '').toLowerCase().includes('gladiator beast') || (m.card_data?.name || m.name || '').toLowerCase().includes('bestia gladiad')));
            }

            if (targetSlot === -1 || !oppMonsters[targetSlot]) {
                return { success: false, reason: 'El adversario no controla ningún monstruo "Bestia Gladiador" boca arriba.' };
            }

            const playerMonsters = player.monsters || [];
            const freeSlot = playerMonsters.findIndex(m => m === null);
            if (freeSlot === -1) {
                return { success: false, reason: 'No tienes casillas libres en tu zona de monstruos para tomar el control.' };
            }

            const controlledMon = oppMonsters[targetSlot];
            oppMonsters[targetSlot] = null;
            controlledMon.controlledUntilEndPhase = true;
            controlledMon.originalOwner = opponentKey;
            playerMonsters[freeSlot] = controlledMon;

            effectUtils.emitDuelLog(duelState.roomId, `👑⛓️ [${this.name}] ¡Tomaste el control de '${controlledMon.card_data?.name || controlledMon.name}' del rival hasta la End Phase!`, 'control');
            return { success: true, choice: 2, controlledCard: controlledMon.name };
        }
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
