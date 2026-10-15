/**
 * Redirige el sembrado de mazos canónicos a la migración oficial de 125 duelistas
 */
const { rebuildCanonicalAdventure } = require('../migrations/rebuild-clean-canonical-adventure');

if (require.main === module) {
    rebuildCanonicalAdventure().catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { rebuildCanonicalAdventure };
