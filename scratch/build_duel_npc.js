const fs = require('fs');
const path = require('path');

const pvpPath = 'c:/Users/oscar.castillo/Videos/Ani Dimension/frontend/views/duels/pvp/duel-pvp.html';
const npcPath = 'c:/Users/oscar.castillo/Videos/Ani Dimension/frontend/views/duels/npc/duel-npc.html';

let content = fs.readFileSync(pvpPath, 'utf8');

// 1. Cambiar título
content = content.replace(
    '<title>Ani-Dimension Online - Duelo PvP Online</title>',
    '<title>Ani-Dimension Online - Duelo vs NPC (Yugi Muto)</title>'
);

// 2. Ocultar #duel-app por defecto e iniciar #dice-roll-modal en display:flex
content = content.replace(
    '<div id="dice-roll-modal">',
    '<div id="dice-roll-modal" style="display:flex;">'
);

content = content.replace(
    '<div id="duel-app" style="display:flex;',
    '<div id="duel-app" style="display:none;'
);

// 3. Agregar funciones de dados e inicializador NPC dentro del script en línea
const scriptAnchor = 'let currentNpcOpponent = \'NPC Yugi Muto\';';
const npcScriptBlock = `
        let currentNpcOpponent = 'NPC Yugi Muto';
        let diceRollInterval = null;
        let lastDiceWinner = null;

        function initNpcDuelArena() {
            if (window.Session && !window.Session.isLoggedIn()) {
                window.Session.saveUser({ id: 999, username: 'Admin', role: 'admin' });
            }

            const user = window.Session ? window.Session.getUser() : null;
            const playerName = user ? user.username : 'Admin';

            const pNameEl = document.getElementById('player-name-val');
            if (pNameEl) pNameEl.textContent = playerName;

            const urlParams = new URLSearchParams(window.location.search);
            const selectedLevel = urlParams.get('level') || '5';
            currentNpcOpponent = selectedLevel === '100' ? 'Yami Yugi (Nv. 100)' : \`Yugi Muto (Nv. \${selectedLevel})\`;

            const rNameEl = document.getElementById('rival-name-val');
            if (rNameEl) rNameEl.textContent = currentNpcOpponent;

            openDiceRollModal(currentNpcOpponent);
        }

        function openDiceRollModal(opponentName = 'NPC Yugi Muto') {
            currentNpcOpponent = opponentName;
            const duelApp = document.getElementById('duel-app');
            if (duelApp) duelApp.style.display = 'none';

            const modal = document.getElementById('dice-roll-modal');
            const pCube = document.getElementById('die-player-cube');
            const nCube = document.getElementById('die-npc-cube');
            const msg = document.getElementById('dice-status-message');
            const actions = document.getElementById('dice-actions-container');
            const choices = document.getElementById('dice-choice-container');
            const btnRoll = document.getElementById('btn-roll-dice');
            const nLabel = document.getElementById('dice-npc-label');

            if (nLabel) nLabel.textContent = opponentName.toUpperCase();
            if (btnRoll) btnRoll.disabled = false;
            if (pCube) { pCube.textContent = '?'; pCube.classList.remove('die-rolling'); }
            if (nCube) { nCube.textContent = '?'; nCube.classList.remove('die-rolling'); }
            if (msg) msg.textContent = 'Presiona "Lanzar Dados" para determinar el orden de inicio.';
            if (actions) actions.style.display = 'block';
            if (choices) choices.style.display = 'none';

            if (modal) modal.style.display = 'flex';
        }

        function closeDiceRollModal() {
            if (typeof diceRollInterval !== 'undefined' && diceRollInterval) clearInterval(diceRollInterval);
            const modal = document.getElementById('dice-roll-modal');
            if (modal) modal.style.display = 'none';
        }

        function rollDice() {
            const pCube = document.getElementById('die-player-cube');
            const nCube = document.getElementById('die-npc-cube');
            const msg = document.getElementById('dice-status-message');
            const btnRoll = document.getElementById('btn-roll-dice');
            const actions = document.getElementById('dice-actions-container');
            const choices = document.getElementById('dice-choice-container');

            if (btnRoll) btnRoll.disabled = true;
            if (pCube) pCube.classList.add('die-rolling');
            if (nCube) nCube.classList.add('die-rolling');
            if (msg) msg.textContent = '🎲 Lanzando los dados...';

            let counter = 0;

            diceRollInterval = setInterval(() => {
                counter++;
                const rnd1 = Math.floor(Math.random() * 6) + 1;
                const rnd2 = Math.floor(Math.random() * 6) + 1;
                if (pCube) pCube.textContent = rnd1;
                if (nCube) nCube.textContent = rnd2;

                if (counter > 15) {
                    clearInterval(diceRollInterval);
                    if (pCube) pCube.classList.remove('die-rolling');
                    if (nCube) nCube.classList.remove('die-rolling');

                    let pFinal = Math.floor(Math.random() * 6) + 1;
                    let nFinal = Math.floor(Math.random() * 6) + 1;

                    while (pFinal === nFinal) {
                        nFinal = Math.floor(Math.random() * 6) + 1;
                    }

                    if (pCube) pCube.textContent = pFinal;
                    if (nCube) nCube.textContent = nFinal;

                    if (pFinal > nFinal) {
                        lastDiceWinner = 'player1';
                        if (msg) msg.innerHTML = \`🎉 <b style="color:var(--accent-cyan);">¡Has ganado la tirada! (\${pFinal} vs \${nFinal})</b><br>Elige si deseas ir de Primeras o de Segundas:\`;
                        if (actions) actions.style.display = 'none';
                        if (choices) choices.style.display = 'flex';
                    } else {
                        lastDiceWinner = 'player2';
                        if (msg) msg.innerHTML = \`🤖 <b style="color:#ff6b81;">El NPC obtuvo mayor puntaje (\${nFinal} vs \${pFinal})</b><br>\${currentNpcOpponent} ha elegido <b style="color:var(--accent-gold);">IR DE PRIMERAS</b>. Entrando al duelo...\`;
                        if (actions) actions.style.display = 'none';

                        setTimeout(() => {
                            startDuelWithOrder('player2');
                        }, 2200);
                    }
                }
            }, 80);
        }

        function confirmOrderChoice(chosenFirstPlayer) {
            startDuelWithOrder(chosenFirstPlayer);
        }

        function startDuelWithOrder(firstPlayer) {
            closeDiceRollModal();
            cleanDuelFieldUI();

            const duelApp = document.getElementById('duel-app');
            if (duelApp) duelApp.style.display = 'flex';

            const myNick = (currentUser && currentUser.username) ? currentUser.username : (window.Session && window.Session.getUser() ? window.Session.getUser().username : 'Admin');

            if (socket) {
                socket.emit('DUEL_START', {
                    room_id: 'ROOM_DEMO',
                    opponent_name: currentNpcOpponent || 'NPC Yugi Muto',
                    player_name: myNick,
                    first_player: firstPlayer
                });
            }

            try {
                history.pushState({ inDuel: true }, document.title, window.location.href);
            } catch (e) {}
        }

        function cleanDuelFieldUI() {
            const pHand = document.getElementById('player-hand');
            if (pHand) pHand.innerHTML = '';
            const rHand = document.getElementById('rival-hand');
            if (rHand) rHand.innerHTML = '';

            for (let i = 0; i < 5; i++) {
                const pm = document.getElementById(\`p-m\${i}\`);
                if (pm) pm.innerHTML = '';
                const ps = document.getElementById(\`p-s\${i}\`);
                if (ps) ps.innerHTML = '';
                const rm = document.getElementById(\`r-m\${i}\`);
                if (rm) rm.innerHTML = '';
                const rs = document.getElementById(\`r-s\${i}\`);
                if (rs) rs.innerHTML = '';
            }
        }

        function returnToDuelMenu() {
            window.location.href = '/views/duels/npc/select-npc.html';
        }

        function returnToLobby() {
            window.location.href = '/views/lobby/lobby.html';
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initNpcDuelArena);
        } else {
            initNpcDuelArena();
        }
`;

if (content.includes(scriptAnchor)) {
    content = content.replace(scriptAnchor, npcScriptBlock);
} else {
    // Si no encuentra anchor, insertarlo después de <script>
    content = content.replace('<script>', '<script>\n' + npcScriptBlock);
}

// 4. Asegurar que las referencias de rendición redirijan a select-npc.html
content = content.replace(/window\.location\.href\s*=\s*'[^']*select-npc[^']*'/g, "window.location.href = '/views/duels/npc/select-npc.html'");

fs.writeFileSync(npcPath, content, 'utf8');
console.log('SUCCESSFULLY REBUILT duel-npc.html WITH 100% SELF-CONTAINED NPC DICE ROLL LOGIC!');
