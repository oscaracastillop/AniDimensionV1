const fs = require('fs');

const npcPath = 'c:/Users/oscar.castillo/Videos/Ani Dimension/frontend/views/duels/npc/duel-npc.html';
let content = fs.readFileSync(npcPath, 'utf8');

// 1. Limpiar duplicados de rollDice y funciones de dados
// Encontrar todos los bloques de `function rollDice`
const firstRollIdx = content.indexOf('function rollDice()');
const secondRollIdx = content.lastIndexOf('function rollDice()');

console.log('firstRollIdx:', firstRollIdx, 'secondRollIdx:', secondRollIdx);

// Reconstruir un único bloque limpio en <script>
const scriptStartIdx = content.indexOf('<script>');
if (scriptStartIdx !== -1) {
    // Reemplazar todo el inicio de <script> por las variables globales y funciones de dados limpias
    const cleanHeader = `<script>
        var socket = typeof io !== 'undefined' ? io() : null;
        var currentNpcOpponent = 'NPC Yugi Muto';
        var diceRollInterval = null;
        var lastDiceWinner = null;

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
            currentNpcOpponent = selectedLevel === '100' ? 'Yami Yugi (Nv. 100)' : ('Yugi Muto (Nv. ' + selectedLevel + ')');

            const rNameEl = document.getElementById('rival-name-val');
            if (rNameEl) rNameEl.textContent = currentNpcOpponent;

            openDiceRollModal(currentNpcOpponent);
        }

        function openDiceRollModal(opponentName) {
            if (opponentName) currentNpcOpponent = opponentName;
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

            if (nLabel) nLabel.textContent = (currentNpcOpponent || 'NPC YUGI').toUpperCase();
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
            console.log('[DICE ROLL] Iniciando tirada de dados...');
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
            if (typeof diceRollInterval !== 'undefined' && diceRollInterval) clearInterval(diceRollInterval);

            diceRollInterval = setInterval(function() {
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
                        if (msg) msg.innerHTML = '🎉 <b style="color:var(--accent-cyan);">¡Has ganado la tirada! (' + pFinal + ' vs ' + nFinal + ')</b><br>Elige si deseas ir de Primeras o de Segundas:';
                        if (actions) actions.style.display = 'none';
                        if (choices) choices.style.display = 'flex';
                    } else {
                        lastDiceWinner = 'player2';
                        if (msg) msg.innerHTML = '🤖 <b style="color:#ff6b81;">El NPC obtuvo mayor puntaje (' + nFinal + ' vs ' + pFinal + ')</b><br>' + currentNpcOpponent + ' ha elegido <b style="color:var(--accent-gold);">IR DE PRIMERAS</b>. Entrando al duelo...';
                        if (actions) actions.style.display = 'none';

                        setTimeout(function() {
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
            const duelApp = document.getElementById('duel-app');
            if (duelApp) duelApp.style.display = 'flex';

            const user = window.Session ? window.Session.getUser() : null;
            const myNick = user ? user.username : 'Admin';

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

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initNpcDuelArena);
        } else {
            initNpcDuelArena();
        }
`;

    // Eliminar las funciones antiguas de dados duplicadas en el resto del archivo
    let oldCode = content.substring(scriptStartIdx + 8);
    
    // Remover duplicados viejos
    oldCode = oldCode.replace(/function openDiceRollModal[\s\S]*?function openEditNickModal/g, 'function openEditNickModal');
    oldCode = oldCode.replace(/function rollDice[\s\S]*?function confirmOrderChoice/g, '');
    oldCode = oldCode.replace(/function confirmOrderChoice[\s\S]*?function startDuelWithOrder/g, '');

    const finalHtml = content.substring(0, scriptStartIdx) + cleanHeader + oldCode;
    fs.writeFileSync(npcPath, finalHtml, 'utf8');
    console.log('CLEANED DUPLICATE ROLLDICE FUNCTIONS SUCCESSFULLY!');
}
