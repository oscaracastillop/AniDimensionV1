const { getPool, sql } = require('../config/db');
const { ocgCardReader } = require('../data/sql-card-reader');

let subastaIo = null;

function setSubastaIo(ioInstance) {
    subastaIo = ioInstance;
}

/**
 * Obtener subastas activas (soporta múltiples subastas en paralelo)
 */
async function getActiveAuctions(req, res) {
    try {
        const pool = await getPool();
        const requestedId = parseInt(req.query.subastaId, 10);

        // 1. Obtener todas las subastas activas
        const activeQuery = await pool.request().query(`
            SELECT 
                Id, CardCode, CardName, CardRarity, CardType, ImageUrl,
                InitialPrice, MinBidIncrement, CurrentPrice,
                HighestBidderId, HighestBidderUsername, Status,
                StartsAt, EndsAt, CreatedAt, CreatedBy, WinnerClaimed,
                DATEDIFF(SECOND, GETDATE(), EndsAt) AS SecondsRemaining,
                (SELECT COUNT(*) FROM dbo.SubastaPujas WHERE SubastaId = EventosSubasta.Id) AS TotalBids
            FROM dbo.EventosSubasta
            WHERE Status = 'ACTIVE'
            ORDER BY Id DESC
        `);

        const activeList = activeQuery.recordset || [];

        // 2. Determinar la subasta seleccionada (siempre priorizar una subasta ACTIVA)
        let targetAuction = null;
        if (requestedId) {
            targetAuction = activeList.find(a => a.Id === requestedId);
        }

        if (!targetAuction && activeList.length > 0) {
            targetAuction = activeList[0];
        }

        // Si no hay subastas activas, traer la última finalizada para mostrar histórico
        if (!targetAuction && activeList.length === 0) {
            const lastFinQuery = await pool.request().query(`
                SELECT TOP 1 
                    Id, CardCode, CardName, CardRarity, CardType, ImageUrl,
                    InitialPrice, MinBidIncrement, CurrentPrice,
                    HighestBidderId, HighestBidderUsername, Status,
                    StartsAt, EndsAt, CreatedAt, CreatedBy, WinnerClaimed,
                    0 AS SecondsRemaining,
                    (SELECT COUNT(*) FROM dbo.SubastaPujas WHERE SubastaId = EventosSubasta.Id) AS TotalBids
                FROM dbo.EventosSubasta
                WHERE Status IN ('FINISHED', 'CANCELLED')
                ORDER BY Id DESC
            `);
            targetAuction = lastFinQuery.recordset[0] || null;
        }

        // 3. Traer pujas de la subasta seleccionada
        let bids = [];
        if (targetAuction) {
            const bidsQuery = await pool.request()
                .input('SubastaId', sql.Int, targetAuction.Id)
                .query(`
                    SELECT TOP 50 Id, SubastaId, UsuarioId, Username, BidAmount, Status, PlacedAt
                    FROM dbo.SubastaPujas
                    WHERE SubastaId = @SubastaId
                    ORDER BY Id DESC
                `);
            bids = bidsQuery.recordset || [];
        }

        // 4. Normalizar SecondsRemaining y EndsAtMs inmune a zonas horarias
        activeList.forEach(a => {
            const secs = Math.max(0, parseInt(a.SecondsRemaining != null ? a.SecondsRemaining : 0, 10));
            a.SecondsRemaining = secs;
            a.EndsAtMs = Date.now() + (secs * 1000);
        });

        if (targetAuction) {
            const secs = Math.max(0, parseInt(targetAuction.SecondsRemaining != null ? targetAuction.SecondsRemaining : 0, 10));
            targetAuction.SecondsRemaining = secs;
            targetAuction.EndsAtMs = Date.now() + (secs * 1000);
        }

        return res.json({
            success: true,
            hasActive: activeList.length > 0,
            activeCount: activeList.length,
            auctions: activeList,
            auction: targetAuction,
            bids: bids
        });
    } catch (err) {
        console.error('[API /api/subastas/active ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al consultar subastas activas: ' + err.message });
    }
}

/**
 * Obtener todas las subastas para el panel de administración (Tabla completa)
 */
async function getAllAuctionsAdmin(req, res) {
    try {
        const pool = await getPool();
        const allQuery = await pool.request().query(`
            SELECT 
                Id, CardCode, CardName, CardRarity, CardType, ImageUrl,
                InitialPrice, MinBidIncrement, CurrentPrice,
                HighestBidderId, HighestBidderUsername, Status,
                StartsAt, EndsAt, CreatedAt, CreatedBy, WinnerClaimed,
                CASE WHEN Status = 'ACTIVE' AND EndsAt > GETDATE() THEN DATEDIFF(SECOND, GETDATE(), EndsAt) ELSE 0 END AS SecondsRemaining,
                (SELECT COUNT(*) FROM dbo.SubastaPujas WHERE SubastaId = EventosSubasta.Id) AS TotalBids
            FROM dbo.EventosSubasta
            ORDER BY 
                CASE WHEN Status = 'ACTIVE' THEN 0 ELSE 1 END,
                Id DESC
        `);

        const allList = allQuery.recordset || [];
        allList.forEach(a => {
            const secs = Math.max(0, parseInt(a.SecondsRemaining != null ? a.SecondsRemaining : 0, 10));
            a.SecondsRemaining = secs;
            a.EndsAtMs = Date.now() + (secs * 1000);
        });

        return res.json({
            success: true,
            auctions: allList
        });
    } catch (err) {
        console.error('[API /api/subastas/all ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al consultar catálogo de subastas: ' + err.message });
    }
}

/**
 * Obtener historial de subastas finalizadas
 */
async function getAuctionHistory(req, res) {
    try {
        const pool = await getPool();
        const historyQuery = await pool.request().query(`
            SELECT TOP 40 
                Id, CardCode, CardName, CardRarity, CardType, ImageUrl,
                InitialPrice, MinBidIncrement, CurrentPrice,
                HighestBidderId, HighestBidderUsername, Status,
                StartsAt, EndsAt, CreatedAt, CreatedBy,
                (SELECT COUNT(*) FROM dbo.SubastaPujas WHERE SubastaId = EventosSubasta.Id) AS TotalBids
            FROM dbo.EventosSubasta
            WHERE Status IN ('FINISHED', 'CANCELLED')
            ORDER BY Id DESC
        `);

        return res.json({
            success: true,
            history: historyQuery.recordset || []
        });
    } catch (err) {
        console.error('[API /api/subastas/history ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al consultar historial: ' + err.message });
    }
}

/**
 * Crear nueva subasta (Solo Administrador)
 */
async function createAuction(req, res) {
    try {
        const { cardCode, cardName, cardRarity, cardType, imageUrl, initialPrice, minBidIncrement, durationMinutes, createdBy } = req.body;
        
        const cCode = parseInt(cardCode, 10);
        const initP = parseInt(initialPrice, 10) || 100;
        const minInc = parseInt(minBidIncrement, 10) || 50;
        const durMin = parseInt(durationMinutes, 10) || 30;

        if (!cCode) {
            return res.status(400).json({ success: false, message: 'Código de carta requerido.' });
        }

        let cName = cardName;
        let cRarity = cardRarity || 'ULTRA_RARE';
        let cType = cardType || 'Monster';
        let imgUrl = imageUrl || `https://images.ygoprodeck.com/images/cards_small/${cCode}.jpg`;

        if (!cName) {
            const ocg = ocgCardReader(cCode);
            if (ocg) {
                cName = ocg.name;
                cType = ocg.type_name || ocg.type || 'Monster';
                cRarity = ocg.rarity || 'ULTRA_RARE';
            } else {
                cName = `Carta #${cCode}`;
            }
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('CardCode', sql.Int, cCode)
            .input('CardName', sql.NVarChar(255), cName)
            .input('CardRarity', sql.NVarChar(50), cRarity)
            .input('CardType', sql.NVarChar(100), cType)
            .input('ImageUrl', sql.NVarChar(500), imgUrl)
            .input('InitialPrice', sql.Int, initP)
            .input('MinBidIncrement', sql.Int, minInc)
            .input('DurationMinutes', sql.Int, durMin)
            .input('CreatedBy', sql.NVarChar(100), createdBy || 'Admin')
            .execute('dbo.sp_CrearSubasta');

        const data = result.recordset && result.recordset[0] ? result.recordset[0] : {};

        if (subastaIo) {
            subastaIo.emit('SUBASTA_NUEVA_CREADA', {
                subastaId: data.SubastaId,
                cardCode: cCode,
                cardName: cName,
                cardRarity: cRarity,
                initialPrice: initP,
                minBidIncrement: minInc,
                durationMinutes: durMin
            });
        }

        return res.json({
            success: true,
            subastaId: data.SubastaId,
            message: '¡Subasta creada y publicada en vivo!'
        });
    } catch (err) {
        console.error('[API /api/subastas/create ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al crear la subasta: ' + err.message });
    }
}

/**
 * Editar subasta existente (Solo Administrador)
 */
async function editAuction(req, res) {
    try {
        const { subastaId, cardCode, cardName, cardRarity, cardType, imageUrl, initialPrice, minBidIncrement, extendMinutes } = req.body;
        const sId = parseInt(subastaId, 10);
        const cCode = parseInt(cardCode, 10);
        const initP = parseInt(initialPrice, 10);
        const minInc = parseInt(minBidIncrement, 10);
        const extMin = parseInt(extendMinutes, 10) || 0;

        if (!sId || !cCode || !initP || !minInc) {
            return res.status(400).json({ success: false, message: 'Parámetros de edición requeridos incompletos.' });
        }

        const pool = await getPool();
        await pool.request()
            .input('SubastaId', sql.Int, sId)
            .input('CardCode', sql.Int, cCode)
            .input('CardName', sql.NVarChar(255), cardName || `Carta #${cCode}`)
            .input('CardRarity', sql.NVarChar(50), cardRarity || 'ULTRA_RARE')
            .input('CardType', sql.NVarChar(100), cardType || 'Monster')
            .input('ImageUrl', sql.NVarChar(500), imageUrl || `https://images.ygoprodeck.com/images/cards_small/${cCode}.jpg`)
            .input('InitialPrice', sql.Int, initP)
            .input('MinBidIncrement', sql.Int, minInc)
            .input('ExtendMinutes', sql.Int, extMin)
            .execute('dbo.sp_EditarSubasta');

        if (subastaIo) {
            subastaIo.emit('SUBASTA_UPDATED', { subastaId: sId });
        }

        return res.json({
            success: true,
            message: 'Subasta actualizada correctamente.'
        });
    } catch (err) {
        console.error('[API /api/subastas/edit ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al editar subasta: ' + err.message });
    }
}

/**
 * Realizar puja en una subasta activa
 */
async function placeBid(req, res) {
    try {
        const { subastaId, userId, username, bidAmount } = req.body;
        const sId = parseInt(subastaId, 10);
        const uId = parseInt(userId, 10);
        const amount = parseInt(bidAmount, 10);
        const uName = (username || '').trim();

        if (!sId || !uId || !amount || !uName) {
            return res.status(400).json({ success: false, message: 'Parámetros de puja incompletos.' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('SubastaId', sql.Int, sId)
            .input('UsuarioId', sql.Int, uId)
            .input('Username', sql.NVarChar(100), uName)
            .input('BidAmount', sql.Int, amount)
            .execute('dbo.sp_RealizarPujaSubasta');

        const data = result.recordset && result.recordset[0] ? result.recordset[0] : {};

        if (subastaIo) {
            subastaIo.emit('SUBASTA_NUEVA_PUJA', {
                subastaId: sId,
                bidAmount: amount,
                username: uName,
                userId: uId,
                placedAt: new Date().toISOString()
            });
        }

        return res.json({
            success: true,
            currentPrice: data.CurrentPrice,
            newBalance: data.NewBalance,
            highestBidderUsername: data.HighestBidderUsername,
            message: data.Message || 'Puja registrada con éxito.'
        });
    } catch (err) {
        console.error('[API /api/subastas/bid ERROR]', err);
        return res.status(400).json({ success: false, message: err.message });
    }
}

/**
 * Finalizar subasta manualmente (Admin)
 */
async function finalizeAuction(req, res) {
    try {
        const { subastaId } = req.body;
        const sId = parseInt(subastaId, 10);
        if (!sId) {
            return res.status(400).json({ success: false, message: 'ID de subasta requerido.' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('SubastaId', sql.Int, sId)
            .input('Forced', sql.Bit, 1)
            .execute('dbo.sp_FinalizarSubasta');

        const data = result.recordset && result.recordset[0] ? result.recordset[0] : {};

        if (subastaIo) {
            subastaIo.emit('SUBASTA_FINALIZADA', {
                subastaId: sId,
                winnerId: data.WinnerId,
                winnerUsername: data.WinnerUsername,
                winningPrice: data.WinningPrice,
                cardCode: data.CardCode,
                cardName: data.CardName
            });
        }

        return res.json({
            success: true,
            data: data,
            message: 'Subasta finalizada correctamente. Carta enviada al Buzón del ganador.'
        });
    } catch (err) {
        console.error('[API /api/subastas/finalize ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al finalizar subasta: ' + err.message });
    }
}

/**
 * Cancelar subasta y devolver estrellas retenidas (Admin)
 */
async function cancelAuction(req, res) {
    try {
        const { subastaId } = req.body;
        const sId = parseInt(subastaId, 10);
        if (!sId) {
            return res.status(400).json({ success: false, message: 'ID de subasta requerido.' });
        }

        const pool = await getPool();
        await pool.request()
            .input('SubastaId', sql.Int, sId)
            .execute('dbo.sp_CancelarSubasta');

        if (subastaIo) {
            subastaIo.emit('SUBASTA_CANCELLED', { subastaId: sId });
        }

        return res.json({
            success: true,
            message: 'Subasta cancelada exitosamente y estrellas retenidas devueltas.'
        });
    } catch (err) {
        console.error('[API /api/subastas/cancel ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al cancelar subasta: ' + err.message });
    }
}

// Bucle en segundo plano para verificar periódicamente subastas expiradas por tiempo real
setInterval(async () => {
    try {
        const pool = await getPool();
        const checkQuery = await pool.request().query(`
            SELECT Id, DATEDIFF(SECOND, GETDATE(), EndsAt) AS Secs 
            FROM dbo.EventosSubasta 
            WHERE Status = 'ACTIVE' AND GETDATE() >= EndsAt
        `);

        if (checkQuery.recordset && checkQuery.recordset.length > 0) {
            for (const sub of checkQuery.recordset) {
                const finRes = await pool.request()
                    .input('SubastaId', sql.Int, sub.Id)
                    .input('Forced', sql.Bit, 0)
                    .execute('dbo.sp_FinalizarSubasta');

                if (finRes.recordset && finRes.recordset[0] && subastaIo) {
                    const finData = finRes.recordset[0];
                    subastaIo.emit('SUBASTA_FINALIZADA', {
                        subastaId: sub.Id,
                        winnerId: finData.WinnerId,
                        winnerUsername: finData.WinnerUsername,
                        winningPrice: finData.WinningPrice,
                        cardCode: finData.CardCode,
                        cardName: finData.CardName
                    });
                }
            }
        }
    } catch (e) {
        // Silencioso en fondo
    }
}, 3000);

module.exports = {
    setSubastaIo,
    getActiveAuctions,
    getActiveAuction: getActiveAuctions,
    getAllAuctionsAdmin,
    getAuctionHistory,
    createAuction,
    editAuction,
    placeBid,
    finalizeAuction,
    cancelAuction
};
