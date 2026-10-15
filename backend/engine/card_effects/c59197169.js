/**
 * [Passcode: 59197169] Yami (Yami)
 * Tipo: Field Spell | Expansión: LOB
 * Descripción Oficial:
 * All Spellcaster and Fiend monsters on the field gain 200 ATK/DEF.
 * All Fairy monsters on the field lose 200 ATK/DEF.
 */
module.exports = {
    id: 59197169,
    name: "Yami",
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

        // Spellcaster (0x2), Fiend (0x8)
        const isBuff = (raceCode & (0x2 | 0x8)) !== 0 ||
            race.includes('SPELLCASTER') || race.includes('FIEND') ||
            race.includes('LANZADOR DE CONJUROS') || race.includes('DEMONIO');

        if (isBuff) {
            return { atk: 200, def: 200 };
        }

        // Fairy (0x4)
        const isDebuff = (raceCode & 0x4) !== 0 || race.includes('FAIRY') || race.includes('HADA');

        if (isDebuff) {
            return { atk: -200, def: -200 };
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
