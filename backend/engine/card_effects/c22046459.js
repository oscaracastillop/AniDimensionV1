/**
 * [Passcode: 22046459] Megamorph
 * Tipo: Equip Spell | Expansión: MRL
 */
module.exports = {
    id: 22046459,
    name: "Megamorph",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,
    atkDelta: 0,
    defDelta: 0,

    canEquip(target, isOwnMonster = true) {
        return Boolean(target);
    },

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p1Monsters = duelState[playerKey]?.monsters || [];
        const p2Monsters = duelState[oppKey]?.monsters || [];
        const allMonsters = [...p1Monsters, ...p2Monsters];
        const hasValidMonster = allMonsters.some(m => m && !m.faceDown);
        if (!hasValidMonster) return { canActivate: false, reason: "No hay ningún monstruo boca arriba en el campo." };
        return { canActivate: true };
    },

    getValidTargets({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const valid = [];
        [playerKey, oppKey].forEach(pKey => {
            (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                if (m && !m.faceDown) valid.push({ playerKey: pKey, slotIndex: idx });
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

        const myLp = duelState[playerKey]?.lp || 8000;
        const oppLp = duelState[oppKey]?.lp || 8000;
        const origAtk = targetMonster.card_data ? (targetMonster.card_data.atk || 0) : (targetMonster.atk || 0);

        let delta = 0;
        if (myLp < oppLp) {
            delta = origAtk; // Duplica
        } else if (myLp > oppLp) {
            delta = -Math.floor(origAtk / 2); // Divide a la mitad
        }

        if (!targetMonster.attachedEffects) targetMonster.attachedEffects = [];
        targetMonster.attachedEffects.push({
            card_id: this.id,
            card_name: this.name,
            effect_type: 'EQUIP',
            atkDelta: delta,
            defDelta: 0,
            equippedBy: playerKey,
            isMegamorph: true
        });

        effectUtils.calculateMonsterCurrentStats(targetMonster, duelState, tPlayerKey);
        effectUtils.emitDuelLog(
            duelState.roomId,
            `🧬✨ [${this.name}] Equipado a "${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}" (${myLp < oppLp ? '¡ATK Duplicado!' : (myLp > oppLp ? '¡ATK Reducido a la mitad!' : 'Sin cambio de ATK')}).`,
            'spell'
        );
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
