module.exports = {
    id: 64599569,
    name: "Chimeratech Overdragon",
    type: "FUSION_MONSTER",
    onFusionSummonWithMaterials: (duelState, monster, materialsCount, playerKey, utils) => {
        const count = materialsCount || 3;
        monster.originalAtk = count * 800;
        monster.atk = count * 800;
        monster.originalDef = count * 800;
        monster.def = count * 800;
        monster.maxAttacksPerTurn = count;
        // Send all other cards on player's field to GY
        const p = duelState[playerKey];
        for (let i = 0; i < 5; i++) {
            if (p.monsters[i] && p.monsters[i] !== monster) {
                p.graveyard.push(p.monsters[i]);
                p.monsters[i] = null;
            }
            if (p.spells[i]) {
                p.graveyard.push(p.spells[i]);
                p.spells[i] = null;
            }
        }
        utils.emitDuelLog(duelState.roomId, `🐉⚡ [Chimeratech Overdragon] ¡Fusión de ${count} máquinas! ATK: ${monster.atk}, ${count} ataques por turno!`);
    }
};