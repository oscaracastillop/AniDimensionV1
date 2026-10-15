/**
 * [Passcode: 23212990] Six Strike - Thunder Blast
 * Tipo: Normal Trap
 * Arquetipo: Six Samurai (STOR)
 * Efecto OCG:
 * Quita 1 Contador Bushido de tu lado del Campo para activar 1 de estos efectos:
 * ● Selecciona 1 monstruo que controle tu adversario; destrúyelo.
 * ● Selecciona 1 carta que controle tu adversario; devuélvela a la mano.
 */
module.exports = {
    id: 23212990,
    name: "Six Strike - Thunder Blast",
    type: "Normal Trap",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opponent.monsters || [];
        const oppSpells = opponent.spells || [];

        // Verificar o remover contador Bushido si existe en cartas continuas/mágicas
        let counterRemoved = false;
        const allSpells = player.spells || [];
        for (const s of allSpells) {
            if (s && s.counters && s.counters.bushido && s.counters.bushido > 0) {
                s.counters.bushido--;
                counterRemoved = true;
                effectUtils.emitDuelLog(duelState.roomId, `🏯 [Six Strike - Thunder Blast] Se retiró 1 Contador Bushido de "${s.card_data?.name || s.name}".`, 'info');
                break;
            }
        }

        const choice = (targetData && targetData.effect_choice) ? Number(targetData.effect_choice) : 1;

        if (choice === 1) {
            // Opción 1: Destruir 1 monstruo rival
            let targetIdx = (targetData && typeof targetData.target_slot === 'number') ? targetData.target_slot : -1;
            let targetMon = null;
            if (targetIdx >= 0 && oppMonsters[targetIdx]) {
                targetMon = oppMonsters[targetIdx];
            } else {
                targetIdx = oppMonsters.findIndex(m => m !== null);
                if (targetIdx >= 0) targetMon = oppMonsters[targetIdx];
            }

            if (targetMon) {
                oppMonsters[targetIdx] = null;
                effectUtils.sendCardToGraveyard(duelState, targetMon.card_data || targetMon, opponentKey);
                effectUtils.emitDuelLog(duelState.roomId, `⚡💥 [Six Strike - Thunder Blast] ¡Opción 1: Destruye al monstruo rival "${targetMon.card_data?.name || targetMon.name}"!`, 'destruction');
            } else {
                effectUtils.emitDuelLog(duelState.roomId, `⚡ [Six Strike - Thunder Blast] No había monstruos rivales que destruir.`, 'info');
            }
        } else {
            // Opción 2: Devolver 1 carta rival a la mano
            let bounced = false;
            // Primero buscar monstruo
            let targetIdx = (targetData && typeof targetData.target_slot === 'number') ? targetData.target_slot : -1;
            if (targetIdx >= 0 && oppMonsters[targetIdx]) {
                const mon = oppMonsters[targetIdx];
                oppMonsters[targetIdx] = null;
                opponent.hand = opponent.hand || [];
                opponent.hand.push(mon.card_data || mon);
                effectUtils.emitDuelLog(duelState.roomId, `⚡↩️ [Six Strike - Thunder Blast] ¡Opción 2: Devolvió a la mano rival a "${mon.card_data?.name || mon.name}"!`, 'bounce');
                bounced = true;
            } else {
                for (let i = 0; i < oppMonsters.length; i++) {
                    if (oppMonsters[i]) {
                        const mon = oppMonsters[i];
                        oppMonsters[i] = null;
                        opponent.hand = opponent.hand || [];
                        opponent.hand.push(mon.card_data || mon);
                        effectUtils.emitDuelLog(duelState.roomId, `⚡↩️ [Six Strike - Thunder Blast] ¡Opción 2: Devolvió a la mano rival a "${mon.card_data?.name || mon.name}"!`, 'bounce');
                        bounced = true;
                        break;
                    }
                }
            }

            if (!bounced) {
                for (let i = 0; i < oppSpells.length; i++) {
                    if (oppSpells[i]) {
                        const sp = oppSpells[i];
                        oppSpells[i] = null;
                        opponent.hand = opponent.hand || [];
                        opponent.hand.push(sp.card_data || sp);
                        effectUtils.emitDuelLog(duelState.roomId, `⚡↩️ [Six Strike - Thunder Blast] ¡Opción 2: Devolvió a la mano rival a "${sp.card_data?.name || sp.name}"!`, 'bounce');
                        bounced = true;
                        break;
                    }
                }
            }
        }

        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};