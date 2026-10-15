/**
 * [Passcode: 83039729] Grandmaster of the Six Samurai
 * Tipo: Effect Monster (Level 5 / Earth / Warrior / 2100 ATK / 800 DEF)
 * Invocación Especial si controlas un Six Samurai.
 * Al ser destruido por efecto del adversario: Recupera 1 Six Samurai de GY a la mano.
 */
module.exports = {
    id: 83039729,
    name: "Grandmaster of the Six Samurai",
    type: "Effect Monster",
    atk: 2100,
    def: 800,
    level: 5,
    race: "Warrior",
    attribute: "EARTH",
    canSpecialSummonSelf: true,

    canSpecialSummon({ duelState, playerKey }) {
        const player = duelState[playerKey] || {};
        const monsters = player.monsters || [];
        const hasSixSam = monsters.some(m => m && !m.faceDown && ((m.card_data?.name || m.name || '').toLowerCase().includes('six samurai') || (m.card_data?.name || m.name || '').toLowerCase().includes('seis samur')));
        const alreadyHas = monsters.some(m => m && !m.faceDown && Number(m.card_id || m.card_data?.id) === 83039729);
        if (hasSixSam && !alreadyHas) return { canSummon: true };
        return { canSummon: false, reason: 'Solo puedes invocarlo si controlas un Six Samurai y no controlas otro Grandmaster.' };
    },
    isIgnition: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return { success: true };
    }
};