/**
 * [Passcode: 63519819] Thousand-Eyes Restrict
 * Tipo: Fusion Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 63519819,
    name: "Thousand-Eyes Restrict",
    type: "Fusion Effect Monster",
    atk: 0,
    def: 0,
    level: 1,
    race: "Spellcaster",
    attribute: "DARK",
    isFusion: true,
    fusionMaterials: [64631466,27125110],

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const hasOppMon = (duelState[oppKey]?.monsters || []).some(m => m);
            if (!hasOppMon) return { canActivate: false, reason: "El rival no tiene monstruos para absorber." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const p = duelState[playerKey];
            const tSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (opp.monsters || []).findIndex(m => m);
            const targetMon = opp.monsters?.[tSlot];

            if (!targetMon) return { success: false, reason: "Monstruo rival no encontrado." };

            opp.monsters[tSlot] = null;
            const stolenAtk = targetMon.currentAtk !== undefined ? targetMon.currentAtk : (targetMon.card_data?.atk || targetMon.atk || 0);
            const stolenDef = targetMon.currentDef !== undefined ? targetMon.currentDef : (targetMon.card_data?.def || targetMon.def || 0);

            // Buscar este Thousand-Eyes Restrict en el campo
            const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 63519819);
            if (selfSlot !== -1 && p.monsters[selfSlot]) {
                const self = p.monsters[selfSlot];
                self.equippedMonster = targetMon;
                self.currentAtk = stolenAtk;
                self.currentDef = stolenDef;
            }

            effectUtils.emitDuelLog(duelState.roomId, `👁️✨ [Thousand-Eyes Restrict] ¡Absorbe a "${targetMon.card_data?.name || 'Monstruo'}"! Copia su ATK (${stolenAtk}) y DEF (${stolenDef}). Otros monstruos no pueden atacar ni cambiar su posición.`, 'monster');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
