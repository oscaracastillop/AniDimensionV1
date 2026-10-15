/**
 * ============================================================================
 * ANI-DIMENSION: SERVICIO DE EVENTOS Y BONIFICACIONES DE SALAS PVP
 * ============================================================================
 */
const { getPool, sql } = require('../config/db');

class PvPBonusService {
    constructor() {
        this.cache = {
            activeBonus: null,
            lastChecked: 0
        };
        this.initTable();
    }

    /**
     * Asegura la creación de la tabla dbo.PvPBonusEvents en SQL Server
     */
    async initTable() {
        try {
            const pool = await getPool();
            if (!pool) return;

            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PvPBonusEvents')
                BEGIN
                    CREATE TABLE dbo.PvPBonusEvents (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        Title NVARCHAR(100) NOT NULL,
                        Description NVARCHAR(255) NULL,
                        IsActive BIT NOT NULL DEFAULT 1,
                        StartDate DATETIME NOT NULL,
                        EndDate DATETIME NOT NULL,
                        ExpBonusPct DECIMAL(6,2) NOT NULL DEFAULT 50.0,
                        StarshipsBonusPct DECIMAL(6,2) NOT NULL DEFAULT 50.0,
                        SpecialRoomStyle NVARCHAR(50) NOT NULL DEFAULT 'fire_glow',
                        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                        UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
                    );

                    INSERT INTO dbo.PvPBonusEvents (Title, Description, IsActive, StartDate, EndDate, ExpBonusPct, StarshipsBonusPct, SpecialRoomStyle)
                    VALUES ('Fiebre de Duelos PvP', 'Bonus especial en todas las salas de combate PvP', 1, GETDATE(), DATEADD(DAY, 7, GETDATE()), 50.0, 50.0, 'fire_glow');
                    
                    PRINT '[PVP BONUS SERVICE] Tabla dbo.PvPBonusEvents creada y sembrada.';
                END
            `);

            await this.refreshActiveBonus();
        } catch (err) {
            console.error('[PVP BONUS SERVICE INIT ERROR]', err.message);
        }
    }

    /**
     * Consulta y refresca en memoria la bonificación activa en el rango de fecha/hora actual
     */
    async refreshActiveBonus() {
        try {
            const pool = await getPool();
            if (!pool) return null;

            const res = await pool.request().query(`
                SELECT TOP 1 
                    Id, Title, Description, IsActive, StartDate, EndDate, 
                    ExpBonusPct, StarshipsBonusPct, SpecialRoomStyle
                FROM dbo.PvPBonusEvents
                WHERE IsActive = 1 
                  AND GETDATE() >= StartDate 
                  AND GETDATE() <= EndDate
                ORDER BY Id DESC
            `);

            if (res.recordset && res.recordset.length > 0) {
                const row = res.recordset[0];
                this.cache.activeBonus = {
                    id: row.Id,
                    title: row.Title,
                    description: row.Description,
                    isActive: Boolean(row.IsActive),
                    startDate: row.StartDate,
                    endDate: row.EndDate,
                    expBonusPct: parseFloat(row.ExpBonusPct) || 0,
                    starshipsBonusPct: parseFloat(row.StarshipsBonusPct) || 0,
                    specialRoomStyle: row.SpecialRoomStyle || 'fire_glow'
                };
            } else {
                this.cache.activeBonus = null;
            }

            this.cache.lastChecked = Date.now();
            return this.cache.activeBonus;
        } catch (err) {
            console.warn('[PVP BONUS REFRESH ERROR]', err.message);
            return this.cache.activeBonus;
        }
    }

    /**
     * Obtiene la bonificación activa actualmente (con cache de 5 segundos)
     */
    async getActiveBonus() {
        if (Date.now() - this.cache.lastChecked > 5000) {
            await this.refreshActiveBonus();
        }
        return this.cache.activeBonus;
    }

    /**
     * Obtiene de forma sincrónica el estado actual en caché para broadcasts rápidos
     */
    getActiveBonusSync() {
        return this.cache.activeBonus;
    }

    /**
     * Obtiene todos los eventos de bonificación configurados (para panel de administración)
     */
    async getAllBonusEvents() {
        try {
            const pool = await getPool();
            if (!pool) return [];

            const res = await pool.request().query(`
                SELECT 
                    Id, Title, Description, IsActive, StartDate, EndDate, 
                    ExpBonusPct, StarshipsBonusPct, SpecialRoomStyle, CreatedAt, UpdatedAt
                FROM dbo.PvPBonusEvents
                ORDER BY Id DESC
            `);

            return res.recordset || [];
        } catch (err) {
            console.error('[GET ALL PVP BONUS ERROR]', err.message);
            return [];
        }
    }

    /**
     * Guarda o actualiza un evento de bonificación
     */
    async saveBonusEvent(data) {
        try {
            const pool = await getPool();
            if (!pool) throw new Error('Base de datos no disponible');

            const id = data.id ? parseInt(data.id, 10) : 0;
            const title = (data.title || 'Bonus Especial PvP').trim().slice(0, 100);
            const description = (data.description || '').trim().slice(0, 255);
            const isActive = data.isActive ? 1 : 0;
            const startDate = new Date(data.startDate);
            const endDate = new Date(data.endDate);
            const expBonusPct = Math.max(0, Math.min(1000, parseFloat(data.expBonusPct || 0)));
            const starshipsBonusPct = Math.max(0, Math.min(1000, parseFloat(data.starshipsBonusPct || 0)));
            const style = (data.specialRoomStyle || 'fire_glow').trim().slice(0, 50);

            if (id > 0) {
                await pool.request()
                    .input('Id', sql.Int, id)
                    .input('Title', sql.NVarChar(100), title)
                    .input('Description', sql.NVarChar(255), description)
                    .input('IsActive', sql.Bit, isActive)
                    .input('StartDate', sql.DateTime, startDate)
                    .input('EndDate', sql.DateTime, endDate)
                    .input('ExpBonusPct', sql.Decimal(6, 2), expBonusPct)
                    .input('StarshipsBonusPct', sql.Decimal(6, 2), starshipsBonusPct)
                    .input('Style', sql.NVarChar(50), style)
                    .query(`
                        UPDATE dbo.PvPBonusEvents
                        SET Title = @Title,
                            Description = @Description,
                            IsActive = @IsActive,
                            StartDate = @StartDate,
                            EndDate = @EndDate,
                            ExpBonusPct = @ExpBonusPct,
                            StarshipsBonusPct = @StarshipsBonusPct,
                            SpecialRoomStyle = @Style,
                            UpdatedAt = GETDATE()
                        WHERE Id = @Id
                    `);
            } else {
                await pool.request()
                    .input('Title', sql.NVarChar(100), title)
                    .input('Description', sql.NVarChar(255), description)
                    .input('IsActive', sql.Bit, isActive)
                    .input('StartDate', sql.DateTime, startDate)
                    .input('EndDate', sql.DateTime, endDate)
                    .input('ExpBonusPct', sql.Decimal(6, 2), expBonusPct)
                    .input('StarshipsBonusPct', sql.Decimal(6, 2), starshipsBonusPct)
                    .input('Style', sql.NVarChar(50), style)
                    .query(`
                        INSERT INTO dbo.PvPBonusEvents (Title, Description, IsActive, StartDate, EndDate, ExpBonusPct, StarshipsBonusPct, SpecialRoomStyle)
                        VALUES (@Title, @Description, @IsActive, @StartDate, @EndDate, @ExpBonusPct, @StarshipsBonusPct, @Style)
                    `);
            }

            await this.refreshActiveBonus();
            return { success: true, activeBonus: this.cache.activeBonus };
        } catch (err) {
            console.error('[SAVE PVP BONUS ERROR]', err.message);
            throw err;
        }
    }

    /**
     * Alterna rápidamente el estado activo/inactivo
     */
    async toggleBonusEvent(id, isActive) {
        try {
            const pool = await getPool();
            if (!pool) throw new Error('Base de datos no disponible');

            await pool.request()
                .input('Id', sql.Int, parseInt(id, 10))
                .input('IsActive', sql.Bit, isActive ? 1 : 0)
                .query(`
                    UPDATE dbo.PvPBonusEvents
                    SET IsActive = @IsActive, UpdatedAt = GETDATE()
                    WHERE Id = @Id
                `);

            await this.refreshActiveBonus();
            return { success: true, activeBonus: this.cache.activeBonus };
        } catch (err) {
            console.error('[TOGGLE PVP BONUS ERROR]', err.message);
            throw err;
        }
    }
}

const pvpBonusService = new PvPBonusService();

module.exports = {
    pvpBonusService
};
