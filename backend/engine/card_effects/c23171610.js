/**
 * [Passcode: 23171610] Limiter Removal
 * Tipo: Quick-Play Spell | Expansión: PSV
 */
module.exports = {
    id: 23171610,
    name: "Limiter Removal",
    type: "Quick-Play Spell",
    race: "Spell",
    isQuickPlay: true,

    canActivate({ duelState, playerKey }) {
            const hasMachine = (duelState[playerKey]?.monsters || []).some(m => {
                if (!m || m.faceDown) return false;
                const r = (m.card_data?.race || m.race || '').toLowerCase();
                return r.includes('machine') || r.includes('máquina');
            });
            if (!hasMachine) return { canActivate: false, reason: "No controlas ningún monstruo de Tipo Máquina boca arriba." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const machines = [];
            (duelState[playerKey]?.monsters || []).forEach((m, idx) => {
                if (m && !m.faceDown) {
                    const r = (m.card_data?.race || m.race || '').toLowerCase();
                    if (r.includes('machine') || r.includes('máquina')) {
                        const curAtk = m.currentAtk !== undefined ? m.currentAtk : (m.card_data?.atk || 0);
                        m.currentAtk = curAtk * 2;
                        m.limiterRemovalBoosted = true;
                        machines.push({ monster: m, slotIndex: idx });
                    }
                }
            });

            effectUtils.emitDuelLog(duelState.roomId, `⚡🤖 [Limiter Removal] ¡Duplica el ATK de ${machines.length} monstruo(s) Máquina! Serán destruidos en la End Phase.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
