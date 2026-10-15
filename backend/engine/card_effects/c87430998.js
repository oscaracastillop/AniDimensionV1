/**
 * [Passcode: 87430998] Forest (Bosque)
 * Tipo: Field Spell | Expansión: LOB
 * Descripción Oficial:
 * All Insect, Beast, Plant, and Beast-Warrior monsters on the field gain 200 ATK/DEF.
 */
module.exports = {
    id: 87430998,
    name: "Forest",
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

        // Insect (0x800), Beast (0x4000), Plant (0x400), Beast-Warrior (0x8000)
        const isCompatible = (raceCode & (0x800 | 0x4000 | 0x400 | 0x8000)) !== 0 ||
            race.includes('INSECT') || race.includes('BEAST') || race.includes('PLANT') || race.includes('BEAST-WARRIOR') ||
            race.includes('INSECTO') || race.includes('BESTIA') || race.includes('PLANTA');

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

        // Recalcular estadísticas de todos los monstruos en ambos campos
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
