/**
 * [Passcode: 14644902] Summoner of Illusions
 * Tipo: Flip Effect Monster | Expansión: LON
 */
module.exports = {
    id: 14644902,
    name: "Summoner of Illusions",
    type: "Flip Effect Monster",
    atk: 800,
    def: 900,
    level: 3,
    race: "Spellcaster",
    attribute: "LIGHT",
    isFlip: true,

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const otherMonsters = (p?.monsters || []).filter(m => m && Number(m.card_id || m.card_data?.id) !== 14644902);
            if (otherMonsters.length === 0) return { canActivate: false, reason: "No hay otro monstruo para ofrecer como tributo." };
            if (!p.extraDeck || p.extraDeck.length === 0) return { canActivate: false, reason: "No hay monstruos en el Deck Extra." };
            return { canActivate: true };
        },

    async onFlip(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            const tIndex = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) !== 14644902);
            if (tIndex !== -1) {
                const tMon = p.monsters[tIndex];
                effectUtils.sendCardToGraveyard(duelState, tMon, playerKey);
                p.monsters[tIndex] = null;
            }

            // Invocar 1 monstruo de Fusión del Extra Deck
            const fusionIdx = (p.extraDeck || []).findIndex(c => (c.type || '').toLowerCase().includes('fusion') || c.isFusion);
            if (fusionIdx !== -1) {
                const fusionMon = p.extraDeck.splice(fusionIdx, 1)[0];
                const emptySlot = p.monsters.findIndex(m => !m);
                if (emptySlot !== -1) {
                    fusionMon.position = 'face-up-attack';
                    fusionMon.currentAtk = fusionMon.atk || fusionMon.card_data?.atk || 0;
                    fusionMon.currentDef = fusionMon.def || fusionMon.card_data?.def || 0;
                    fusionMon.destroyAtEndPhase = true;
                    p.monsters[emptySlot] = fusionMon;
                    effectUtils.emitDuelLog(duelState.roomId, `✨ [Summoner of Illusions] ¡VOLTEO! Ofrece un monstruo e Invoca de Modo Especial a "${fusionMon.name || fusionMon.card_data?.name}" desde el Extra Deck. Se destruirá en la End Phase.`, 'flip');
                }
            }
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
