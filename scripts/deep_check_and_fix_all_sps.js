/**
 * ============================================================================
 * ANI-DIMENSION: DIAGNÓSTICO PROFUNDO DE PROCEDIMIENTOS ALMACENADOS EN SQL SERVER
 * ============================================================================
 */
const { getPool, sql } = require('../backend/config/db');

async function inspectAllProcedures() {
    console.log('⚡ Conectando a SQL Server para auditoría completa de Stored Procedures...');
    const pool = await getPool();

    // 1. Listar todos los SPs en la base de datos
    const spRes = await pool.request().query(`
        SELECT 
            p.name AS ProcedureName,
            p.create_date,
            p.modify_date
        FROM sys.procedures p
        ORDER BY p.name ASC
    `);

    console.log(`\n📋 TOTAL STORED PROCEDURES ENCONTRADOS: ${spRes.recordset.length}`);
    for (const sp of spRes.recordset) {
        // Obtener parámetros de cada SP
        const paramRes = await pool.request()
            .input('spName', sql.VarChar(128), sp.ProcedureName)
            .query(`
                SELECT 
                    param.name AS ParameterName,
                    t.name AS DataType,
                    param.max_length,
                    param.precision,
                    param.scale,
                    param.is_output
                FROM sys.parameters param
                JOIN sys.types t ON param.user_type_id = t.user_type_id
                WHERE param.object_id = OBJECT_ID(@spName)
                ORDER BY param.parameter_id ASC
            `);

        const paramsList = paramRes.recordset.map(pr => `${pr.ParameterName} (${pr.DataType})`).join(', ');
        console.log(`▶ [${sp.ProcedureName}] -> Parámetros: [ ${paramsList || 'NINGUNO'} ]`);
    }

    // 2. Verificar específicamente sp_ComprarCosmetico
    console.log('\n--- VERIFICACIÓN ESPECÍFICA: dbo.sp_ComprarCosmetico ---');
    const cosmeticoParams = await pool.request()
        .input('spName', sql.VarChar(128), 'dbo.sp_ComprarCosmetico')
        .query(`
            SELECT param.name, t.name AS type
            FROM sys.parameters param
            JOIN sys.types t ON param.user_type_id = t.user_type_id
            WHERE param.object_id = OBJECT_ID('dbo.sp_ComprarCosmetico')
            ORDER BY param.parameter_id ASC
        `);
    console.log('Parámetros actuales de dbo.sp_ComprarCosmetico en BD:', cosmeticoParams.recordset);

    // 3. Probar ejecución directa de compra de cosmético con usuario 1
    console.log('\n--- PRUEBA REAL DE COMPRA DE COSMÉTICO EN BD ---');
    try {
        const testBuy = await pool.request()
            .input('UserId', sql.Int, 1)
            .input('ItemType', sql.VarChar(20), 'AVATAR')
            .input('ItemCode', sql.VarChar(50), 'AVA-003')
            .input('CostStarships', sql.Int, 0)
            .input('ExpBoost', sql.Decimal(5, 2), 5.0)
            .input('StarshipsBoost', sql.Decimal(5, 2), 5.0)
            .input('LuckBoost', sql.Decimal(5, 2), 1.0)
            .execute('dbo.sp_ComprarCosmetico');
        console.log('✅ Resultado compra cosmético en SQL:', testBuy.recordset);
    } catch (e) {
        console.error('❌ Error en prueba compra cosmético:', e.message);
    }

    // 4. Probar buzón de regalos
    console.log('\n--- PRUEBA DE REGALOS Y BUZÓN EN BD ---');
    const mailboxGifts = await pool.request().query(`
        SELECT TOP 5 Id, UsuarioId, GiftType, Title, Description, PayloadJson, IsClaimed 
        FROM dbo.UserMailbox
        ORDER BY Id DESC
    `);
    console.log('Regalos en dbo.UserMailbox:', mailboxGifts.recordset);

    process.exit(0);
}

inspectAllProcedures().catch(e => {
    console.error(e);
    process.exit(1);
});
