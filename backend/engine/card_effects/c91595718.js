/**
 * [Passcode: 91595718] Book of Secret Arts
 * Tipo: Equip Spell
 * Requisito: Sólo monstruos de Tipo SPELLCASTER
 */
module.exports = {
    id: 91595718,
    name: "Book of Secret Arts",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,
    requiredRace: "spellcaster",
    atkDelta: 300,
    defDelta: 300,

    // 1. Validador estricto del monstruo objetivo (propio o del rival)
    canEquip(target) {
        if (!target) return false;
        const tData = target.card_data || target;
        const race = (tData.race || '').toString().toLowerCase();
        const type = (tData.type || '').toString().toLowerCase();
        const req = "spellcaster";
        return race === req || race.includes(req) || type.includes(req);
    },

    // 2. Validador de activación: ¿Existe al menos 1 monstruo compatible boca arriba en el campo?
    canActivate({ duelState, playerKey, opponentKey }) {
        const p1Monsters = duelState[playerKey]?.monsters || [];
        const p2Monsters = duelState[opponentKey]?.monsters || [];
        const allMonsters = [...p1Monsters, ...p2Monsters];
        const hasValidMonster = allMonsters.some(m => m && !m.faceDown && this.canEquip(m.card_data || m));
        if (!hasValidMonster) {
            return {
                canActivate: false,
                reason: "No hay ningún monstruo de Tipo SPELLCASTER boca arriba en el campo para equipar \"Book of Secret Arts\"."
            };
        }
        return { canActivate: true };
    },

    // 3. Retorna las casillas elegibles en ambos campos
    getValidTargets({ duelState, playerKey, opponentKey }) {
        const valid = [];
        [playerKey, opponentKey].forEach(pKey => {
            (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                if (m && !m.faceDown && this.canEquip(m.card_data || m)) {
                    valid.push({ playerKey: pKey, slotIndex: idx });
                }
            });
        });
        return valid;
    },

    // 4. Activación y equipamiento en monstruo propio o rival
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const tPlayerKey = targetData?.target_player || playerKey;
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
        const tPlayer = duelState[tPlayerKey];
        const targetMonster = (targetSlot !== undefined && tPlayer && tPlayer.monsters) ? tPlayer.monsters[targetSlot] : null;

        if (!targetMonster || targetMonster.faceDown) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [${this.name}] Objetivo inválido o boca abajo.`, 'spell');
            return { success: false, reason: "Objetivo inválido." };
        }

        if (!this.canEquip(targetMonster.card_data || targetMonster)) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [${this.name}] "${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}" no es de Tipo SPELLCASTER.`, 'spell');
            return { success: false, reason: "Monstruo no compatible." };
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
            `🗡️✨ [${this.name}] Equipado con éxito a "${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}"${ownerNotice} (+${this.atkDelta} ATK / +${this.defDelta} DEF).`,
            'spell'
        );
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
