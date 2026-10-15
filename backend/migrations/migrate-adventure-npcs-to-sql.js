/**
 * ============================================================================
 * ANI-DIMENSION: MIGRACIÓN DE CATÁLOGO Y MAZOS CANÓNICOS A SQL SERVER
 * Centraliza 100% de los datos y mazos de Modo Aventura (125 NPCs) en SQL Server
 * ============================================================================
 */
const { rebuildCanonicalAdventure } = require('./rebuild-clean-canonical-adventure');

async function migrateAdventureNpcsToSql() {
    console.log('⚡ Ejecutando reconstrucción canónica de Modo Aventura (125 NPCs)...');
    return await rebuildCanonicalAdventure();
}

if (require.main === module) {
    migrateAdventureNpcsToSql()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('❌ Error en migración de NPCs a SQL:', err);
            process.exit(1);
        });
}

module.exports = { migrateAdventureNpcsToSql };
