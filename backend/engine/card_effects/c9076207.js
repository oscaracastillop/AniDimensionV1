/**
 * [Passcode: 9076207] Armed Ninja (Ninja Armado)
 * Tipo: Flip Effect Monster | Expansión: LOB
 * Descripción Oficial: FLIP: Target 1 Spell Card on the field; destroy that target. (If the target is Set, reveal it, then destroy it if it is a Spell Card. Otherwise, return it to its original position.)
 */
module.exports = {
    id: 9076207,
    name: "Armed Ninja",
    type: "Flip Effect Monster",
    atk: 300,
    def: 300,
    level: 1,
    race: "Warrior",
    isFlip: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        return { canActivate: false, reason: "Los efectos de Volteo se activan automáticamente al voltear la carta boca arriba." };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const opp = duelState[oppKey];
        if (!opp || !opp.spells) return { success: true };

        let destroyed = false;
        // Priorizar destruir campo mágico rival o magia en zona
        if (opp.fieldSpell) {
            effectUtils.sendCardToGraveyard(duelState, opp.fieldSpell, oppKey);
            opp.fieldSpell = null;
            destroyed = true;
            effectUtils.emitDuelLog(duelState.roomId, `🥷💥 [Armed Ninja] ¡Ninja Armado destruye el Campo Mágico rival!`, 'flip');
        } else {
            for (let i = 0; i < 5; i++) {
                const s = opp.spells[i];
                if (s) {
                    const cd = s.card_data || s;
                    const t = (cd.type || s.type || '').toLowerCase();
                    const isSpell = t.includes('spell') || t.includes('mágica') || (Number(cd.typeCode || 0) & 0x2);
                    if (isSpell) {
                        effectUtils.sendCardToGraveyard(duelState, s, oppKey);
                        opp.spells[i] = null;
                        destroyed = true;
                        effectUtils.emitDuelLog(duelState.roomId, `🥷💥 [Armed Ninja] ¡Ninja Armado corta y destruye "${cd.name || 'Carta Mágica'}"!`, 'flip');
                        break;
                    }
                }
            }
        }

        if (!destroyed) {
            effectUtils.emitDuelLog(duelState.roomId, `🥷 [Armed Ninja] No se encontró ninguna Carta Mágica para destruir.`, 'flip');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
