/**
 * [Passcode: 22702055] Umi (Umi)
 * Tipo: Field Spell | Expansión: LOB
 * Descripción Oficial:
 * All Fish, Sea Serpent, Thunder, and Aqua monsters on the field gain 200 ATK/DEF.
 * All Machine and Pyro monsters on the field lose 200 ATK/DEF.
 */
module.exports = {
    id: 22702055,
    name: "Umi",
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

        // Fish (0x20000), Sea Serpent (0x40000), Thunder (0x1000), Aqua (0x40)
        const isBuff = (raceCode & (0x20000 | 0x40000 | 0x1000 | 0x40)) !== 0 ||
            race.includes('FISH') || race.includes('SEA SERPENT') || race.includes('THUNDER') || race.includes('AQUA') ||
            race.includes('PEZ') || race.includes('SERPIENTE MARINA') || race.includes('TRUENO');

        if (isBuff) {
            return { atk: 200, def: 200 };
        }

        // Machine (0x20), Pyro (0x80)
        const isDebuff = (raceCode & (0x20 | 0x80)) !== 0 ||
            race.includes('MACHINE') || race.includes('PYRO') ||
            race.includes('MÁQUINA') || race.includes('MAQUINA') || race.includes('PIRO');

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
