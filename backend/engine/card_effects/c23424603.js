/**
 * [Passcode: 23424603] Wasteland (Yermo)
 * Tipo: Field Spell | Expansión: LOB
 * Descripción Oficial:
 * All Dinosaur, Zombie, and Rock monsters on the field gain 200 ATK/DEF.
 */
module.exports = {
    id: 23424603,
    name: "Wasteland",
    type: "Field Spell",
    race: "Spell",
    isField: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        return { canActivate: true };
    },

    calculateFieldBonus(monster, duelState, controllerKey) {
        if (!monster || monster.faceDown) return null;
        const mData = monster.card_data || monster;
        const race = (mData.race || monster.race || '').toString().toUpperCase();
        const raceCode = Number(mData.raceCode || monster.raceCode || 0);

        // Dinosaur (0x10000), Zombie (0x10), Rock (0x100)
        const isCompatible = (raceCode & (0x10000 | 0x10 | 0x100)) !== 0 ||
            race.includes('DINOSAUR') || race.includes('ZOMBIE') || race.includes('ROCK') ||
            race.includes('DINOSAURIO') || race.includes('ROCA');

        if (isCompatible) {
            return { atk: 200, def: 200 };
        }
        return null;
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey];
        if (player.fieldSpell && Number(player.fieldSpell.card_id || player.fieldSpell.id) !== this.id) {
            effectUtils.sendCardToGraveyard(duelState, player.fieldSpell, playerKey);
        }
        player.fieldSpell = {
            card_id: this.id,
            id: this.id,
            name: this.name,
            card_data: { id: this.id, name: this.name, type: "Field Spell", race: "Spell" }
        };

        [playerKey, opponentKey].forEach(pk => {
            (duelState[pk]?.monsters || []).forEach(m => {
                if (m) effectUtils.calculateMonsterCurrentStats(m, duelState, pk);
            });
        });

        effectUtils.emitDuelLog(duelState.roomId, `🌌 [${this.name}] ¡El Campo Mágico "${this.name}" se despliega en todo el terreno de duelo!`, 'field');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
