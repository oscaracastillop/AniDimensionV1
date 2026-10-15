/**
 * [Passcode: 50152549] Paralyzing Potion
 * Tipo: Equip Spell
 */
module.exports = {
    id: 50152549,
    name: "Paralyzing Potion",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,
    atkDelta: 0,
    defDelta: 0,

    canEquip(target, isOwnMonster = true) {
        if (!target) return false;
        const tData = target.card_data || target; const r = (tData.race || '').toLowerCase(); return !r.includes('machine');
    },

    canActivate({ duelState, playerKey, opponentKey }) {
        const p1Monsters = duelState[playerKey]?.monsters || [];
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p2Monsters = duelState[oppKey]?.monsters || [];
        const allMonsters = [...p1Monsters, ...p2Monsters];
        const hasValidMonster = allMonsters.some(m => m && !m.faceDown && this.canEquip(m.card_data || m, p1Monsters.includes(m)));
        if (!hasValidMonster) {
            return {
                canActivate: false,
                reason: "No hay ningún monstruo compatible boca arriba en el campo para equipar \"Paralyzing Potion\"."
            };
        }
        return { canActivate: true };
    },

    getValidTargets({ duelState, playerKey, opponentKey }) {
        const valid = [];
        [playerKey, opponentKey].forEach(pKey => {
            if (false) return;
            (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                if (m && !m.faceDown && this.canEquip(m.card_data || m, pKey === playerKey)) {
                    valid.push({ playerKey: pKey, slotIndex: idx });
                }
            });
        });
        return valid;
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const tPlayerKey = targetData?.target_player || playerKey;
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
        const tPlayer = duelState[tPlayerKey];
        const targetMonster = (targetSlot !== undefined && tPlayer && tPlayer.monsters) ? tPlayer.monsters[targetSlot] : null;

        if (!targetMonster || targetMonster.faceDown) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [${this.name}] Objetivo inválido o boca abajo.`, 'spell');
            return { success: false, reason: "Objetivo inválido." };
        }

        if (!this.canEquip(targetMonster.card_data || targetMonster, tPlayerKey === playerKey)) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [${this.name}] Monstruo no compatible.`, 'spell');
            return { success: false, reason: "Monstruo no compatible." };
        }

        if (!targetMonster.attachedEffects) targetMonster.attachedEffects = [];
        targetMonster.attachedEffects.push({
            card_id: this.id,
            card_name: this.name,
            effect_type: 'EQUIP',
            atkDelta: this.atkDelta,
            defDelta: this.defDelta,
            cannotAttack: true,
            equippedBy: playerKey
        });

        effectUtils.calculateMonsterCurrentStats(targetMonster, duelState, tPlayerKey);
        const ownerNotice = (tPlayerKey !== playerKey) ? " del rival" : "";
        effectUtils.emitDuelLog(
            duelState.roomId,
            `🗡️✨ [${this.name}] Equipado a "${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}"${ownerNotice} (${this.atkDelta >= 0 ? '+' : ''}${this.atkDelta} ATK).`,
            'spell'
        );
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
