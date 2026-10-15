module.exports = {
    id: 42945701,
    name: "Spiritual Fire Art - Kurenai",
    type: "NORMAL_TRAP",
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const p = duelState[playerKey];
        const opp = duelState[opponentKey];
        const fireIdx = p.monsters.findIndex(m => m && (m.attribute === 'FIRE' || (m.type && m.type.toLowerCase().includes('fire'))));
        if (fireIdx !== -1) {
            const tribute = p.monsters[fireIdx];
            p.graveyard.push(tribute);
            p.monsters[fireIdx] = null;
            const dmg = tribute.originalAtk || tribute.atk || 0;
            opp.lp = Math.max(0, (opp.lp || 8000) - dmg);
            utils.emitDuelLog(duelState.roomId, `🔥 [Spiritual Fire Art - Kurenai] Sacrifica a ${tribute.name} e inflige ${dmg} de daño directo al oponente!`);
        }
    }
};