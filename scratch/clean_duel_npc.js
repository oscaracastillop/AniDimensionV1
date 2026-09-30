const fs = require('fs');

const path = 'c:/Users/oscar.castillo/Videos/Ani Dimension/frontend/views/duels/npc/duel-npc.html';
const raw = fs.readFileSync(path, 'utf8');

// Lines 1 to 614 contain the entire clean HTML
const lines = raw.split('\n');
const htmlLines = lines.slice(0, 614);

// Remove scripts in <head> if present
let headSection = htmlLines.slice(0, 25).join('\n');
headSection = headSection.replace(/<script src="\/socket\.io\/socket\.io\.js"><\/script>\r?\n?/g, '');
headSection = headSection.replace(/<script src="\.\.\/\.\.\/\.\.\/js\/core\/session\.js"><\/script>\r?\n?/g, '');
headSection = headSection.replace(/<script src="\.\.\/\.\.\/\.\.\/js\/core\/socket\.js"><\/script>\r?\n?/g, '');

const bodySection = htmlLines.slice(25).join('\n');

const scriptsBottom = `
    <!-- SCRIPTS MODULARES REGLAMENTARIOS -->
    <script src="/socket.io/socket.io.js"></script>
    <script src="../../../js/core/session.js"></script>
    <script src="../../../js/core/socket.js"></script>
    <script>
        // Garantizar que la referencia socket exista globalmente antes de cargar los controladores
        window.socket = window.getSocket ? window.getSocket() : (window.socket || (typeof io !== 'undefined' ? io() : null));
        var socket = window.socket;
    </script>
    <script src="../../../js/duel/duel-state-client.js"></script>
    <script src="../../../js/duel/duel-ui.js"></script>
    <script src="../../../js/duel/duel-actions.js"></script>
    <script src="../../../js/duel/duel-chains.js"></script>
    <script src="../../../js/views/duel-npc.js"></script>
</body>
</html>
`;

const finalCleanHtml = headSection + '\n' + bodySection + scriptsBottom;
fs.writeFileSync(path, finalCleanHtml, 'utf8');

console.log('Saved clean duel-npc.html. Total lines:', finalCleanHtml.split('\n').length);
