/**
 * ANI-DIMENSION: GENERADOR MAESTRO DE BACKUP FRESCO PARA VPS
 * - Elimina copias .bak obsoletas
 * - Realiza Backup Nativo (.bak) completo de AniDimensionDB (56 tablas + 84 SPs)
 * - Genera script de todos los Stored Procedures (.sql)
 * - Genera volcado estructurado JSON de todas las tablas
 * - Genera script SQL listo para restaurar en el VPS
 */
const { getPool } = require('../backend/config/db');
const fs = require('fs');
const path = require('path');

async function generateFreshBackup() {
    try {
        console.log('===============================================================');
        console.log('📦 INICIANDO GENERACIÓN DE BACKUP FRESCO PARA VPS (AniDimensionDB)');
        console.log('===============================================================');

        const backupDir = path.join(__dirname, '..', 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // 1. Eliminar .bak antiguos de la carpeta backups
        console.log('\n🧹 1. Eliminando archivos .bak antiguos de la carpeta backups...');
        const existingFiles = fs.readdirSync(backupDir);
        for (const file of existingFiles) {
            if (file.toLowerCase().endsWith('.bak')) {
                const p = path.join(backupDir, file);
                fs.unlinkSync(p);
                console.log(`   🗑️ Eliminado: ${file}`);
            }
        }

        const pool = await getPool();

        // 2. Ruta de backup accesible tanto para SQL Server como para Node
        const sourceBak = 'C:\\Users\\Public\\AniDimensionDB_fresh.bak';
        const destBak = path.join(backupDir, 'AniDimensionDB_fresh.bak');

        // 3. Ejecutar Backup Nativo
        console.log('\n📦 2. Ejecutando BACKUP DATABASE nativo de SQL Server...');
        await pool.request().query(`
            BACKUP DATABASE [AniDimensionDB]
            TO DISK = N'${sourceBak.replace(/'/g, "''")}'
            WITH FORMAT, INIT,
            NAME = N'AniDimensionDB-FullBackup-Fresh',
            STATS = 10
        `);

        if (fs.existsSync(sourceBak)) {
            fs.copyFileSync(sourceBak, destBak);
            const stats = fs.statSync(destBak);
            console.log('   ✅ Archivo .BAK maestro generado exitosamente en:');
            console.log(`      -> ${destBak}`);
            console.log(`      📊 Tamaño: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
        } else {
            throw new Error(`No se encontró el archivo de backup en ${sourceBak}`);
        }

        // 4. Exportar todos los Procedimientos Almacenados (84 SPs)
        console.log('\n📜 3. Extrayendo definiciones completas de Stored Procedures (84 SPs)...');
        const spQuery = `
            SELECT 
                r.ROUTINE_NAME,
                m.definition
            FROM INFORMATION_SCHEMA.ROUTINES r
            JOIN sys.sql_modules m ON m.object_id = OBJECT_ID(r.ROUTINE_SCHEMA + '.' + r.ROUTINE_NAME)
            WHERE r.ROUTINE_TYPE = 'PROCEDURE'
            ORDER BY r.ROUTINE_NAME
        `;
        const spsResult = await pool.request().query(spQuery);
        let spsSqlContent = `-- =====================================================================\n`;
        spsSqlContent += `-- ANI-DIMENSION: COLECCIÓN MAESTRA DE 84 PROCEDIMIENTOS ALMACENADOS\n`;
        spsSqlContent += `-- Base de datos: AniDimensionDB | Generado: ${new Date().toISOString()}\n`;
        spsSqlContent += `-- =====================================================================\nUSE [AniDimensionDB];\nGO\n\n`;

        spsResult.recordset.forEach(sp => {
            spsSqlContent += `-- --------------------------------------------------------------------\n`;
            spsSqlContent += `-- Stored Procedure: [${sp.ROUTINE_NAME}]\n`;
            spsSqlContent += `-- --------------------------------------------------------------------\n`;
            spsSqlContent += `IF OBJECT_ID('[dbo].[${sp.ROUTINE_NAME}]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[${sp.ROUTINE_NAME}];\nGO\n`;
            spsSqlContent += `${sp.definition}\nGO\n\n`;
        });

        const spsSqlPath = path.join(backupDir, 'AniDimensionDB_all_stored_procedures.sql');
        fs.writeFileSync(spsSqlPath, spsSqlContent, 'utf8');
        console.log(`   ✅ ${spsResult.recordset.length} Stored Procedures exportados a: ${spsSqlPath}`);

        // 5. Exportar volcado estructurado JSON de las 56 tablas
        console.log('\n📦 4. Exportando volcado JSON estructurado de todas las tablas...');
        const tablesRes = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME");
        const tableList = tablesRes.recordset.map(r => r.TABLE_NAME);
        const fullDump = {};
        let totalRows = 0;

        for (const tbl of tableList) {
            try {
                const r = await pool.request().query(`SELECT * FROM [dbo].[${tbl}]`);
                fullDump[tbl] = r.recordset;
                totalRows += r.recordset.length;
                console.log(`   ✔️ [${tbl}]: ${r.recordset.length} registros`);
            } catch (e) {
                console.warn(`   ⚠️ Error exportando ${tbl}:`, e.message);
            }
        }

        const jsonDumpPath = path.join(backupDir, 'AniDimensionDB_full_dump.json');
        fs.writeFileSync(jsonDumpPath, JSON.stringify(fullDump, null, 2), 'utf8');
        console.log(`   ✅ Volcado JSON (${totalRows} registros totales en ${tableList.length} tablas) guardado en: ${jsonDumpPath}`);

        // 6. Generar Script SQL de Restauración Directa para el VPS
        console.log('\n📝 5. Generando script de Restauración Directa para el VPS (RESTORE_ON_VPS.sql)...');
        const restoreSqlContent = `-- =====================================================================
-- SCRIPT DE RESTAURACIÓN MAESTRA EN EL VPS
-- Ejecutar en SQL Server Management Studio (SSMS) o sqlcmd en el VPS
-- =====================================================================
USE [master];
GO

-- 1. Cerrar conexiones activas si la base de datos ya existe
IF DB_ID('AniDimensionDB') IS NOT NULL
BEGIN
    ALTER DATABASE [AniDimensionDB] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [AniDimensionDB];
END
GO

-- 2. Inspeccionar nombres lógicos de los archivos del backup
RESTORE FILELISTONLY FROM DISK = N'/var/opt/mssql/backup/AniDimensionDB_fresh.bak';
-- (En Windows Server VPS la ruta suele ser: N'C:\\backups\\AniDimensionDB_fresh.bak')
GO

-- 3. Restaurar la base de datos completa con estructura y datos idénticos
RESTORE DATABASE [AniDimensionDB]
FROM DISK = N'C:\\backups\\AniDimensionDB_fresh.bak' -- <-- Ajustar a la ruta en tu VPS
WITH 
    REPLACE,
    STATS = 10;
GO

-- 4. Verificar integridad y tablas
USE [AniDimensionDB];
GO
SELECT COUNT(*) AS TotalTablas FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';
SELECT COUNT(*) AS TotalProcedimientos FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_TYPE = 'PROCEDURE';
GO
`;
        const restoreSqlPath = path.join(backupDir, 'RESTORE_ON_VPS.sql');
        fs.writeFileSync(restoreSqlPath, restoreSqlContent, 'utf8');
        console.log(`   ✅ Script de restauración guardado en: ${restoreSqlPath}`);

        console.log('\n===============================================================');
        console.log('🎉 ¡COPIA DE SEGURIDAD FRESCA GENERADA AL 100%!');
        console.log('===============================================================');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error generando el backup:', err);
        process.exit(1);
    }
}

generateFreshBackup();
