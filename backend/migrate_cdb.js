/**
 * Ani-Dimension: Script de Migración Oficial de cards.cdb a Microsoft SQL Server (AniDimensionDB)
 */
const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'Oscar1982',
    server: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    database: process.env.DB_NAME || 'AniDimensionDB',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        requestTimeout: 180000
    }
};

async function migrate() {
    console.log('===========================================================');
    console.log('🚀 MIGRACIÓN OFICIAL: CARDS.CDB ➔ MICROSOFT SQL SERVER');
    console.log('===========================================================');
    console.log(`Conectando a SQL Server en ${config.server}:${config.port}/${config.database} como '${config.user}'...`);

    const pool = await sql.connect(config);
    console.log('✅ Conexión establecida con éxito con SQL Server.');

    // 1. Recrear tablas datas y texts con tipos seguros
    console.log('\n📦 Creando esquemas oficiales Konami datas y texts...');
    await pool.request().query(`
        IF OBJECT_ID('datas', 'U') IS NOT NULL DROP TABLE datas;
        IF OBJECT_ID('texts', 'U') IS NOT NULL DROP TABLE texts;

        CREATE TABLE datas (
            id INT PRIMARY KEY,
            ot INT NOT NULL DEFAULT 1,
            alias INT NOT NULL DEFAULT 0,
            setcode VARCHAR(64) NOT NULL DEFAULT '0',
            type BIGINT NOT NULL DEFAULT 0,
            atk INT NOT NULL DEFAULT 0,
            def INT NOT NULL DEFAULT 0,
            level BIGINT NOT NULL DEFAULT 0,
            race BIGINT NOT NULL DEFAULT 0,
            attribute INT NOT NULL DEFAULT 0,
            category BIGINT NOT NULL DEFAULT 0
        );

        CREATE TABLE texts (
            id INT PRIMARY KEY,
            name NVARCHAR(256),
            [desc] NVARCHAR(MAX),
            str1 NVARCHAR(256),
            str2 NVARCHAR(256),
            str3 NVARCHAR(256),
            str4 NVARCHAR(256),
            str5 NVARCHAR(256),
            str6 NVARCHAR(256),
            str7 NVARCHAR(256),
            str8 NVARCHAR(256),
            str9 NVARCHAR(256),
            str10 NVARCHAR(256),
            str11 NVARCHAR(256),
            str12 NVARCHAR(256),
            str13 NVARCHAR(256),
            str14 NVARCHAR(256),
            str15 NVARCHAR(256),
            str16 NVARCHAR(256)
        );
    `);
    console.log('✅ Tablas datas y texts creadas en SQL Server.');

    // 2. Cargar cartas desde cards_index.json
    const cdbIndexPath = path.resolve(__dirname, 'ocgcore/cdb/cards_index.json');
    const cardsMap = JSON.parse(fs.readFileSync(cdbIndexPath, 'utf-8'));
    const cardList = Object.values(cardsMap);
    console.log(`\n📊 Preparando ${cardList.length} cartas para migración...`);

    // 3. Inserción masiva en tabla datas usando Bulk Insert
    console.log('\n📥 Insertando lote masivo en tabla [datas]...');
    const datasTable = new sql.Table('datas');
    datasTable.create = false;
    datasTable.columns.add('id', sql.Int, { nullable: false, primary: true });
    datasTable.columns.add('ot', sql.Int, { nullable: false });
    datasTable.columns.add('alias', sql.Int, { nullable: false });
    datasTable.columns.add('setcode', sql.VarChar(64), { nullable: false });
    datasTable.columns.add('type', sql.BigInt, { nullable: false });
    datasTable.columns.add('atk', sql.Int, { nullable: false });
    datasTable.columns.add('def', sql.Int, { nullable: false });
    datasTable.columns.add('level', sql.BigInt, { nullable: false });
    datasTable.columns.add('race', sql.BigInt, { nullable: false });
    datasTable.columns.add('attribute', sql.Int, { nullable: false });
    datasTable.columns.add('category', sql.BigInt, { nullable: false });

    for (const c of cardList) {
        datasTable.rows.add(
            parseInt(c.id, 10),
            parseInt(c.ot, 10) || 1,
            parseInt(c.alias, 10) || 0,
            String(c.setcode || '0'),
            Number(c.type || 0),
            c.atk !== null && c.atk !== undefined ? parseInt(c.atk, 10) : 0,
            c.def !== null && c.def !== undefined ? parseInt(c.def, 10) : 0,
            Number(c.level || 0),
            Number(c.race || 0),
            parseInt(c.attribute, 10) || 0,
            Number(c.category || 0)
        );
    }

    const datasResult = await pool.request().bulk(datasTable);
    console.log(`✅ [datas] Insertadas ${datasResult.rowsAffected} filas en SQL Server.`);

    // 4. Inserción masiva en tabla texts usando Bulk Insert
    console.log('\n📥 Insertando lote masivo en tabla [texts]...');
    const textsTable = new sql.Table('texts');
    textsTable.create = false;
    textsTable.columns.add('id', sql.Int, { nullable: false, primary: true });
    textsTable.columns.add('name', sql.NVarChar(256), { nullable: true });
    textsTable.columns.add('desc', sql.NVarChar(sql.MAX), { nullable: true });
    textsTable.columns.add('str1', sql.NVarChar(256), { nullable: true });
    textsTable.columns.add('str2', sql.NVarChar(256), { nullable: true });
    textsTable.columns.add('str3', sql.NVarChar(256), { nullable: true });
    textsTable.columns.add('str4', sql.NVarChar(256), { nullable: true });
    textsTable.columns.add('str5', sql.NVarChar(256), { nullable: true });
    textsTable.columns.add('str6', sql.NVarChar(256), { nullable: true });
    textsTable.columns.add('str7', sql.NVarChar(256), { nullable: true });
    textsTable.columns.add('str8', sql.NVarChar(256), { nullable: true });
    textsTable.columns.add('str9', sql.NVarChar(256), { nullable: true });
    textsTable.columns.add('str10', sql.NVarChar(256), { nullable: true });
    textsTable.columns.add('str11', sql.NVarChar(256), { nullable: true });
    textsTable.columns.add('str12', sql.NVarChar(256), { nullable: true });
    textsTable.columns.add('str13', sql.NVarChar(256), { nullable: true });
    textsTable.columns.add('str14', sql.NVarChar(256), { nullable: true });
    textsTable.columns.add('str15', sql.NVarChar(256), { nullable: true });
    textsTable.columns.add('str16', sql.NVarChar(256), { nullable: true });

    for (const c of cardList) {
        textsTable.rows.add(
            parseInt(c.id, 10),
            (c.name || '').slice(0, 256),
            c.desc || '',
            null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null
        );
    }

    const textsResult = await pool.request().bulk(textsTable);
    console.log(`✅ [texts] Insertadas ${textsResult.rowsAffected} filas en SQL Server.`);

    // 5. Verificación final de integridad
    const countCheck = await pool.request().query(`
        SELECT 
            (SELECT COUNT(*) FROM datas) AS total_datas,
            (SELECT COUNT(*) FROM texts) AS total_texts;
    `);
    console.log('\n===========================================================');
    console.log('🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE:');
    console.log(`   - Registros en datas: ${countCheck.recordset[0].total_datas}`);
    console.log(`   - Registros en texts: ${countCheck.recordset[0].total_texts}`);
    console.log('===========================================================');

    await pool.close();
}

migrate().catch(err => {
    console.error('❌ Error fatal en la migración:', err);
    process.exit(1);
});
