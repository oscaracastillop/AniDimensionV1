/**
 * ============================================================================
 * ANI-DIMENSION: SINCRONIZADOR MAESTRO DE PROCEDIMIENTOS Y BASE DE DATOS (VPS)
 * Ejecuta todas las migraciones necesarias para dejar la BD 100% al día
 * ============================================================================
 */
const path = require('path');
const { execSync } = require('child_process');

function runScript(scriptName) {
    console.log(`\n⚡ Ejecutando: ${scriptName}...`);
    try {
        const fullPath = path.resolve(__dirname, scriptName);
        execSync(`node "${fullPath}"`, { stdio: 'inherit' });
        console.log(`✅ ${scriptName} finalizado exitosamente.`);
    } catch (e) {
        console.error(`❌ Error al ejecutar ${scriptName}:`, e.message);
    }
}

async function main() {
    console.log('===============================================================');
    console.log('🚀 ANI-DIMENSION: SINCRONIZACIÓN MAESTRA DE BASE DE DATOS (VPS)');
    console.log('===============================================================');

    // 1. Procedimientos Maestros de Seguridad y Compras
    runScript('migrate-master-security-stored-procedures.js');

    // 2. Procedimientos de Tienda y Rompecabezas
    runScript('migrate-shop-and-puzzle-stored-procedures.js');

    // 3. Procedimiento de Potenciadores con Buzón Oficial
    runScript('update-sp-comprar-potenciador.js');

    // 4. Codificación UTF-8 de Países
    runScript('fix-countries-encoding.js');

    // 5. Catálogo Canónico de 12 Eras y 125 NPCs con Mazos en SQL Server
    runScript('migrate-adventure-npcs-to-sql.js');

    // 6. Procedimiento Almacenado de Métricas y Ranking para la Landing Page
    runScript('migrate-landing-stored-procedures.js');

    console.log('\n===============================================================');
    console.log('🎉 ¡BASE DE DATOS 100% ACTUALIZADA Y LISTA EN SQL SERVER!');
    console.log('===============================================================');
}

main();
