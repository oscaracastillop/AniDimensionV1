/**
 * [Passcode: 40619825] Axe of Despair
 * Tipo: Equip Spell | Expansión: MRL
 */
module.exports = {
    id: 40619825,
    name: "Axe of Despair",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,
    atkDelta: 1000,
    defDelta: 0,

    canEquip(target, isOwnMonster = true) {
        if (!target) return false;
        return true;
    },

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p1Monsters = duelState[playerKey]?.monsters || [];
        const p2Monsters = duelState[oppKey]?.monsters || [];
        const allMonsters = [...p1Monsters, ...p2Monsters];
        const hasValidMonster = allMonsters.some(m => m && !m.faceDown && this.canEquip(m.card_data || m, p1Monsters.includes(m)));
        if (!hasValidMonster) {
            return {
                canActivate: false,
                reason: "No hay ningún monstruo boca arriba en el campo para equipar \"Axe of Despair\"."
            };
        }
        return { canActivate: true };
    },

    getValidTargets({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const valid = [];
        [playerKey, oppKey].forEach(pKey => {
            (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                if (m && !m.faceDown && this.canEquip(m.card_data || m, pKey === playerKey)) {
                    valid.push({ playerKey: pKey, slotIndex: idx });
                }
            });
        });
        return valid;
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const tPlayerKey = targetData?.target_player || playerKey;
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
        const tPlayer = duelState[tPlayerKey];
        const targetMonster = (targetSlot !== undefined && tPlayer && tPlayer.monsters) ? tPlayer.monsters[targetSlot] : null;

        if (!targetMonster || targetMonster.faceDown) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [${this.name}] Objetivo inválido o boca abajo.`, 'spell');
            return { success: false, reason: "Objetivo inválido." };
        }

        if (!targetMonster.attachedEffects) targetMonster.attachedEffects = [];
        targetMonster.attachedEffects.push({
            card_id: this.id,
            card_name: this.name,
            effect_type: 'EQUIP',
            atkDelta: this.atkDelta,
            defDelta: this.defDelta,
            equippedBy: playerKey
        });

        effectUtils.calculateMonsterCurrentStats(targetMonster, duelState, tPlayerKey);
        const ownerNotice = (tPlayerKey !== playerKey) ? " del rival" : "";
        effectUtils.emitDuelLog(
            duelState.roomId,
            `🪓✨ [${this.name}] Equipado a "${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}"${ownerNotice} (+1000 ATK).`,
            'spell'
        );
        return { success: true };
    },

    async onSentToGraveyard(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        if (!p) return;
        const hasTribute = p.monsters && p.monsters.some(m => m !== null);
        if (hasTribute) {
            effectUtils.emitDuelLog(duelState.roomId, `🪓♻️ [${this.name}] Enviada al Cementerio: Puedes tributar 1 monstruo para regresarla a la cima de tu Deck.`, 'spell');
        }
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
