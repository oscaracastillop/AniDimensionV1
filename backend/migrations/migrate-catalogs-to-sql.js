const { getPool, sql } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function migrateCatalogsToSql() {
    try {
        console.log('[MIGRATION] Conectando a SQL Server para migrar catálogos a base de datos...');
        const pool = await getPool();

        // 1. Crear tabla dbo.CartasSinglesCatalog
        console.log('[MIGRATION] Creando tabla dbo.CartasSinglesCatalog...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CartasSinglesCatalog')
            BEGIN
                CREATE TABLE dbo.CartasSinglesCatalog (
                    Code NVARCHAR(50) NOT NULL CONSTRAINT PK_CartasSinglesCatalog PRIMARY KEY,
                    CardId INT NULL,
                    Name NVARCHAR(150) NOT NULL,
                    PackCode NVARCHAR(50) NULL DEFAULT 'LOB',
                    Rarity NVARCHAR(50) NULL DEFAULT 'ULTRA RARE',
                    Type NVARCHAR(50) NULL DEFAULT 'SINGLE',
                    CardsList NVARCHAR(MAX) NULL,
                    Price DECIMAL(10, 2) NOT NULL DEFAULT 1.99,
                    Currency NVARCHAR(10) NOT NULL DEFAULT 'USD',
                    OfferText NVARCHAR(100) NULL,
                    Image NVARCHAR(500) NULL,
                    Description NVARCHAR(MAX) NULL,
                    IsActive BIT NOT NULL DEFAULT 1,
                    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
                );
                PRINT '✅ Tabla dbo.CartasSinglesCatalog creada.';
            END
        `);

        // 2. Crear tabla dbo.PlaymatsCatalog
        console.log('[MIGRATION] Creando tabla dbo.PlaymatsCatalog...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PlaymatsCatalog')
            BEGIN
                CREATE TABLE dbo.PlaymatsCatalog (
                    Code NVARCHAR(50) NOT NULL CONSTRAINT PK_PlaymatsCatalog PRIMARY KEY,
                    Name NVARCHAR(150) NOT NULL,
                    Description NVARCHAR(MAX) NULL,
                    Price INT NOT NULL DEFAULT 50000,
                    Currency NVARCHAR(20) NOT NULL DEFAULT 'STARSHIPS',
                    Image NVARCHAR(500) NULL,
                    OfferText NVARCHAR(100) NULL,
                    IsActive BIT NOT NULL DEFAULT 1,
                    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
                );
                PRINT '✅ Tabla dbo.PlaymatsCatalog creada.';
            END
        `);

        // 3. Crear tabla dbo.SleevesCatalog
        console.log('[MIGRATION] Creando tabla dbo.SleevesCatalog...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SleevesCatalog')
            BEGIN
                CREATE TABLE dbo.SleevesCatalog (
                    Code NVARCHAR(50) NOT NULL CONSTRAINT PK_SleevesCatalog PRIMARY KEY,
                    Name NVARCHAR(150) NOT NULL,
                    Description NVARCHAR(MAX) NULL,
                    Price INT NOT NULL DEFAULT 30000,
                    Currency NVARCHAR(20) NOT NULL DEFAULT 'STARSHIPS',
                    Image NVARCHAR(500) NULL,
                    OfferText NVARCHAR(100) NULL,
                    IsActive BIT NOT NULL DEFAULT 1,
                    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
                );
                PRINT '✅ Tabla dbo.SleevesCatalog creada.';
            END
        `);

        // 4. Crear tabla dbo.EstrellasPackagesCatalog
        console.log('[MIGRATION] Creando tabla dbo.EstrellasPackagesCatalog...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EstrellasPackagesCatalog')
            BEGIN
                CREATE TABLE dbo.EstrellasPackagesCatalog (
                    Code NVARCHAR(50) NOT NULL CONSTRAINT PK_EstrellasPackagesCatalog PRIMARY KEY,
                    Name NVARCHAR(150) NOT NULL,
                    Icon NVARCHAR(10) NULL DEFAULT '⭐',
                    StarshipsBase INT NOT NULL DEFAULT 10000,
                    StarshipsBonus INT NOT NULL DEFAULT 0,
                    Price DECIMAL(10, 2) NOT NULL DEFAULT 0.99,
                    Currency NVARCHAR(10) NOT NULL DEFAULT 'USD',
                    BannerTag NVARCHAR(50) NULL,
                    Description NVARCHAR(MAX) NULL,
                    IsActive BIT NOT NULL DEFAULT 1,
                    UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
                );
                PRINT '✅ Tabla dbo.EstrellasPackagesCatalog creada.';
            END
        `);

        // 5. Poblar CartasSinglesCatalog desde JSON existente si está vacía
        const countSingles = await pool.request().query('SELECT COUNT(*) AS total FROM dbo.CartasSinglesCatalog');
        if (countSingles.recordset[0].total === 0) {
            const singlesPath = path.resolve(__dirname, '../data/cartas_singles_db.json');
            if (fs.existsSync(singlesPath)) {
                const list = JSON.parse(fs.readFileSync(singlesPath, 'utf8') || '[]');
                for (const item of list) {
                    const code = item.code || item.codigo;
                    if (!code) continue;
                    await pool.request()
                        .input('Code', sql.NVarChar(50), code)
                        .input('CardId', sql.Int, item.cardId || item.card_id || null)
                        .input('Name', sql.NVarChar(150), (item.name || item.nombre || code).trim())
                        .input('PackCode', sql.NVarChar(50), (item.packCode || 'LOB').trim())
                        .input('Rarity', sql.NVarChar(50), (item.rarity || item.rareza || 'ULTRA RARE').trim().toUpperCase())
                        .input('Type', sql.NVarChar(50), (item.type || item.tipo || 'SINGLE').trim().toUpperCase())
                        .input('CardsList', sql.NVarChar(sql.MAX), item.cardsList ? JSON.stringify(item.cardsList) : null)
                        .input('Price', sql.Decimal(10, 2), parseFloat(item.price || item.precio_usd || 1.99))
                        .input('Currency', sql.NVarChar(10), (item.currency || 'USD').trim().toUpperCase())
                        .input('OfferText', sql.NVarChar(100), item.offer_text ? item.offer_text.trim() : null)
                        .input('Image', sql.NVarChar(500), item.image || null)
                        .input('Description', sql.NVarChar(sql.MAX), item.description || item.descripcion || null)
                        .input('IsActive', sql.Bit, item.active !== false && item.activo !== 0 ? 1 : 0)
                        .query(`
                            INSERT INTO dbo.CartasSinglesCatalog 
                                (Code, CardId, Name, PackCode, Rarity, Type, CardsList, Price, Currency, OfferText, Image, Description, IsActive, UpdatedAt)
                            VALUES 
                                (@Code, @CardId, @Name, @PackCode, @Rarity, @Type, @CardsList, @Price, @Currency, @OfferText, @Image, @Description, @IsActive, GETDATE());
                        `);
                }
                console.log(`[MIGRATION] ${list.length} cartas/bundles insertados en dbo.CartasSinglesCatalog.`);
            }
        }

        // 6. Poblar PlaymatsCatalog desde JSON existente si está vacía
        const countMats = await pool.request().query('SELECT COUNT(*) AS total FROM dbo.PlaymatsCatalog');
        if (countMats.recordset[0].total === 0) {
            const matsPath = path.resolve(__dirname, '../data/playmats_db.json');
            if (fs.existsSync(matsPath)) {
                const list = JSON.parse(fs.readFileSync(matsPath, 'utf8') || '[]');
                for (const item of list) {
                    await pool.request()
                        .input('Code', sql.NVarChar(50), item.code)
                        .input('Name', sql.NVarChar(150), item.name)
                        .input('Description', sql.NVarChar(sql.MAX), item.description || null)
                        .input('Price', sql.Int, parseInt(item.price || 50000, 10))
                        .input('Currency', sql.NVarChar(20), (item.currency || 'STARSHIPS').trim().toUpperCase())
                        .input('Image', sql.NVarChar(500), item.image || null)
                        .input('OfferText', sql.NVarChar(100), item.offer_text || null)
                        .input('IsActive', sql.Bit, item.active !== false ? 1 : 0)
                        .query(`
                            INSERT INTO dbo.PlaymatsCatalog 
                                (Code, Name, Description, Price, Currency, Image, OfferText, IsActive, UpdatedAt)
                            VALUES 
                                (@Code, @Name, @Description, @Price, @Currency, @Image, @OfferText, @IsActive, GETDATE());
                        `);
                }
                console.log(`[MIGRATION] ${list.length} tapetes insertados en dbo.PlaymatsCatalog.`);
            }
        }

        // 7. Poblar SleevesCatalog desde JSON existente si está vacía
        const countSleeves = await pool.request().query('SELECT COUNT(*) AS total FROM dbo.SleevesCatalog');
        if (countSleeves.recordset[0].total === 0) {
            const sleevesPath = path.resolve(__dirname, '../data/sleeves_db.json');
            if (fs.existsSync(sleevesPath)) {
                const list = JSON.parse(fs.readFileSync(sleevesPath, 'utf8') || '[]');
                for (const item of list) {
                    await pool.request()
                        .input('Code', sql.NVarChar(50), item.code)
                        .input('Name', sql.NVarChar(150), item.name)
                        .input('Description', sql.NVarChar(sql.MAX), item.description || null)
                        .input('Price', sql.Int, parseInt(item.price || 30000, 10))
                        .input('Currency', sql.NVarChar(20), (item.currency || 'STARSHIPS').trim().toUpperCase())
                        .input('Image', sql.NVarChar(500), item.image || null)
                        .input('OfferText', sql.NVarChar(100), item.offer_text || null)
                        .input('IsActive', sql.Bit, item.active !== false ? 1 : 0)
                        .query(`
                            INSERT INTO dbo.SleevesCatalog 
                                (Code, Name, Description, Price, Currency, Image, OfferText, IsActive, UpdatedAt)
                            VALUES 
                                (@Code, @Name, @Description, @Price, @Currency, @Image, @OfferText, @IsActive, GETDATE());
                        `);
                }
                console.log(`[MIGRATION] ${list.length} fundas insertadas en dbo.SleevesCatalog.`);
            }
        }

        // 8. Poblar EstrellasPackagesCatalog desde JSON existente si está vacía
        const countStars = await pool.request().query('SELECT COUNT(*) AS total FROM dbo.EstrellasPackagesCatalog');
        if (countStars.recordset[0].total === 0) {
            const starsPath = path.resolve(__dirname, '../data/estrellas_db.json');
            if (fs.existsSync(starsPath)) {
                const list = JSON.parse(fs.readFileSync(starsPath, 'utf8') || '[]');
                for (const item of list) {
                    await pool.request()
                        .input('Code', sql.NVarChar(50), item.codigo || item.code)
                        .input('Name', sql.NVarChar(150), item.nombre || item.name)
                        .input('Icon', sql.NVarChar(10), item.icono || '⭐')
                        .input('StarshipsBase', sql.Int, parseInt(item.estrellas_base || 10000, 10))
                        .input('StarshipsBonus', sql.Int, parseInt(item.estrellas_bonus || 0, 10))
                        .input('Price', sql.Decimal(10, 2), parseFloat(item.precio_usd || 0.99))
                        .input('Currency', sql.NVarChar(10), 'USD')
                        .input('BannerTag', sql.NVarChar(50), item.banner_tag || null)
                        .input('Description', sql.NVarChar(sql.MAX), item.descripcion || null)
                        .input('IsActive', sql.Bit, item.activo !== 0 && item.active !== false ? 1 : 0)
                        .query(`
                            INSERT INTO dbo.EstrellasPackagesCatalog 
                                (Code, Name, Icon, StarshipsBase, StarshipsBonus, Price, Currency, BannerTag, Description, IsActive, UpdatedAt)
                            VALUES 
                                (@Code, @Name, @Icon, @StarshipsBase, @StarshipsBonus, @Price, @Currency, @BannerTag, @Description, @IsActive, GETDATE());
                        `);
                }
                console.log(`[MIGRATION] ${list.length} paquetes de estrellas insertados en dbo.EstrellasPackagesCatalog.`);
            }
        }

        console.log('[MIGRATION] ✅ Migración de catálogos a SQL Server completada con éxito.');
        process.exit(0);
    } catch (err) {
        console.error('[MIGRATION ERROR]', err);
        process.exit(1);
    }
}

migrateCatalogsToSql();
