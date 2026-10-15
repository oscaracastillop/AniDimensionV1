/**
 * [Passcode: 72049318 / 71544954] Megarock Dragon (Dragón Megaroca)
 * Tipo: EFFECT_MONSTER
 * ATK: ? / DEF: ?
 * Efecto: Cannot be Normal Summoned/Set. Must be Special Summoned (from your hand) by banishing any number of Rock monsters from your GY. This card's original ATK/DEF become 700 x the number of Rock monsters banished for its Special Summon.
 */

module.exports = {
    id: 72049318,
    aliasIds: [71544954],
    name: "Megarock Dragon",
    set: "TLM",
    type: "EFFECT_MONSTER",
    atk: 0,
    def: 0,
    level: 7,
    race: "Rock",
    attribute: "EARTH",
    desc: "Cannot be Normal Summoned/Set. Must be Special Summoned (from your hand) by banishing any number of Rock monsters from your GY. This card's original ATK/DEF become the number of Rock monsters banished for its Special Summon x 700.",

    onSpecialSummonFromHand: (duelState, monster, slotIndex, playerKey, utils) => {
        const player = duelState[playerKey];
        if (!player || !player.graveyard) return;

        const isRock = (c) => c && c.card_data && (c.card_data.race === 'Rock' || (c.card_data.type && c.card_data.type.includes('MONSTER') && (c.card_data.desc || '').toLowerCase().includes('rock')));
        let rockCount = 0;
        const nonRock = [];

        player.graveyard.forEach(c => {
            if (isRock(c)) {
                rockCount++;
                utils.sendCardToBanished(duelState, c, playerKey);
            } else {
                nonRock.push(c);
            }
        });
        player.graveyard = nonRock;

        const finalStat = Math.max(700, rockCount * 700);
        monster.atk = finalStat;
        monster.def = finalStat;

        utils.emitDuelLog(duelState.roomId, `🪨🐉💥 [Dragón Megaroca] ¡Emerge del suelo desterrando ${rockCount} monstruos Roca! Su ATK/DEF se fijan en ${finalStat}/${finalStat}.`, 'summon');
    }
};
