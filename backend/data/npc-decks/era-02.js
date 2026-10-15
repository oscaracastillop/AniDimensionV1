/**
 * ERA 02: El Reino de los Duelistas (NPCs 7 al 17)
 * Maximillion Pegasus & Ojo Milenario (100% Canónico)
 */
const { CANON_NPCS } = require('../canonical-adventure-catalog');

module.exports = CANON_NPCS.filter(n => n.eraId === 2);
