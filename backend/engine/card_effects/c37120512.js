/**
 * [Passcode: 37120512] Sword of Dark Destruction (LOB-096)
 * A DARK monster equipped with this card increases its ATK by 400 points and decreases its DEF by 200 points.
 */
module.exports = {
    id: 37120512,
    name: "Sword of Dark Destruction",

    async execute(context) {
        const { roomId, duelState, player, playerKey, targetData, emitDuelLog, calculateMonsterCurrentStats } = context;
        if (!duelState || !player) return false;

        let targetSlot = targetData?.slot_index ?? targetData?.target_slot;
        if (targetSlot === undefined || !player.monsters[targetSlot]) {
            targetSlot = player.monsters.findIndex(m => m && !m.faceDown);
        }

        if (targetSlot !== -1 && player.monsters[targetSlot]) {
            const targetMon = player.monsters[targetSlot];
            targetMon.attachedEffects = targetMon.attachedEffects || [];
            targetMon.attachedEffects.push({
                card_id: 37120512,
                effect_type: 'EQUIP',
                atkDelta: 400,
                defDelta: -200,
                name: "Sword of Dark Destruction"
            });
            calculateMonsterCurrentStats(targetMon, duelState);
            emitDuelLog(roomId, `🗡️✨ [Sword of Dark Destruction] ¡Equipado a "${targetMon.card_data ? targetMon.card_data.name : 'Monstruo'}" (+400 ATK / -200 DEF)!`, 'spell');
            return true;
        }
        return false;
    }
};
