/**
 * ERA 01: Inicios en Ciudad Domino (NPCs 1 al 6)
 * Yu-Gi-Oh! Clásico / Arcos Iniciales Manga & Anime (100% Canónico)
 */
const { CANON_NPCS } = require('../canonical-adventure-catalog');

module.exports = CANON_NPCS.filter(n => n.eraId === 1);
