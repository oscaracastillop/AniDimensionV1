/**
 * [Passcode: 50913601] Mountain (Montaña)
 * Tipo: Field Spell | Expansión: LOB
 * Descripción Oficial:
 * All Dragon, Winged Beast, and Thunder monsters on the field gain 200 ATK/DEF.
 */
module.exports = {
    id: 50913601,
    name: "Mountain",
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

        // Dragon (0x2000), Winged Beast (0x200), Thunder (0x1000)
        const isCompatible = (raceCode & (0x2000 | 0x200 | 0x1000)) !== 0 ||
            race.includes('DRAGON') || race.includes('WINGED BEAST') || race.includes('THUNDER') ||
            race.includes('DRAGÓN') || race.includes('BESTIA ALADA') || race.includes('TRUENO');

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
