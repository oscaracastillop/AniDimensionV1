/**
 * [Passcode: 40703393] The Puppet Magic of Dark Ruler
 * Tipo: Normal Spell | Expansión: LOD
 */
module.exports = {
    id: 40703393,
    name: "The Puppet Magic of Dark Ruler",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasFiendInGY = (p?.graveyard || []).some(c => (c.race || c.card_data?.race || '').toLowerCase() === 'fiend');
            const hasFieldMonsters = (p?.monsters || []).some(m => m);
            if (!hasFiendInGY || !hasFieldMonsters) return { canActivate: false, reason: "Se requiere tributar monstruos en campo e invocar un Demonio del Cementerio." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const gyFiendIdx = (p.graveyard || []).findIndex(c => (c.race || c.card_data?.race || '').toLowerCase() === 'fiend');
            if (gyFiendIdx !== -1) {
                const targetFiend = p.graveyard.splice(gyFiendIdx, 1)[0];
                const emptySlot = (p.monsters || []).findIndex(m => !m);
                if (emptySlot !== -1) {
                    targetFiend.position = 'face-up-attack';
                    p.monsters[emptySlot] = targetFiend;
                    effectUtils.emitDuelLog(duelState.roomId, `🎭👑 [The Puppet Magic of Dark Ruler] Invoca de Modo Especial a "${targetFiend.name || targetFiend.card_data?.name}" desde el Cementerio.`, 'spell');
                }
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
