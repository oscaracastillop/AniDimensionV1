const path = require('path');
const sql = require('mssql');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'mscg2022*',
    server: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    database: process.env.DB_NAME || 'AniDimensionDB',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        connectTimeout: 15000,
        requestTimeout: 15000
    },
    pool: {
        max: 20,
        min: 2,
        idleTimeoutMillis: 30000
    }
};

let pool = null;

async function getPool() {
    if (!pool) {
        try {
            pool = await new sql.ConnectionPool(dbConfig).connect();
            console.log('[DB] Conectado exitosamente a SQL Server (AniDimensionDB)');
            pool.on('error', err => {
                console.error('[DB] Error inesperado en pool de SQL Server:', err);
                pool = null;
            });
        } catch (err) {
            console.error('[DB ERROR] Error al conectar a SQL Server:', err.message);
            pool = null;
            throw err;
        }
    }
    return pool;
}

module.exports = {
    sql,
    getPool,
    dbConfig
};
