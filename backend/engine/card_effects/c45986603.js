/**
 * [Passcode: 45986603] Snatch Steal
 * Tipo: Equip Spell | Expansión: MRL
 */
module.exports = {
    id: 45986603,
    name: "Snatch Steal",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,
    isControlSteal: true,
    atkDelta: 0,
    defDelta: 0,

    canEquip(target, isOwnMonster = false) {
        if (!target) return false;
        // Sólo se puede equipar a un monstruo que controle el adversario
        return !isOwnMonster;
    },

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const oppMonsters = duelState[oppKey]?.monsters || [];
        const hasOppMonster = oppMonsters.some(m => m && !m.faceDown);
        if (!hasOppMonster) {
            return { canActivate: false, reason: "El rival no controla ningún monstruo boca arriba para tomar el control." };
        }
        const myMonsters = duelState[playerKey]?.monsters || [];
        const hasFreeSlot = myMonsters.some(m => m === null);
        if (!hasFreeSlot) {
            return { canActivate: false, reason: "No tienes casillas libres de monstruos para recibir el control." };
        }
        return { canActivate: true };
    },

    getValidTargets({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const valid = [];
        (duelState[oppKey]?.monsters || []).forEach((m, idx) => {
            if (m && !m.faceDown) {
                valid.push({ playerKey: oppKey, slotIndex: idx });
            }
        });
        return valid;
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const tPlayerKey = targetData?.target_player || oppKey;
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
        const opp = duelState[oppKey];
        const player = duelState[playerKey];

        const targetMonster = (targetSlot !== undefined && opp && opp.monsters) ? opp.monsters[targetSlot] : null;
        if (!targetMonster || targetMonster.faceDown) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [${this.name}] Objetivo inválido.`, 'spell');
            return { success: false, reason: "Objetivo inválido." };
        }

        const freeSlot = player.monsters.findIndex(m => m === null);
        if (freeSlot === -1) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [${this.name}] Campo lleno.`, 'spell');
            return { success: false, reason: "Campo lleno." };
        }

        // Transferir monstruo del rival al campo del activador
        opp.monsters[targetSlot] = null;
        targetMonster.originalOwner = oppKey;
        targetMonster.isStolen = true;
        targetMonster.slot = freeSlot;
        player.monsters[freeSlot] = targetMonster;

        if (!targetMonster.attachedEffects) targetMonster.attachedEffects = [];
        targetMonster.attachedEffects.push({
            card_id: this.id,
            card_name: this.name,
            effect_type: 'EQUIP',
            equippedBy: playerKey,
            onOpponentStandbyGainLp: 1000
        });

        effectUtils.emitDuelLog(
            duelState.roomId,
            `🫳✨ [${this.name}] ¡${player.username} toma el control de "${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}" del rival! (El rival recuperará 1000 LP en cada una de sus Standby Phases).`,
            'spell'
        );
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
