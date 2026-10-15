const { getPool, sql } = require('../config/db');
const { ocgCardReader } = require('../data/sql-card-reader');
const { getEligiblePackOpeningPool } = require('../services/packs-catalog.service');

let PACK_CARD_POOLS = {};
try {
    PACK_CARD_POOLS = require('../data/pack-pools.json');
} catch (e) {
    PACK_CARD_POOLS = {
        'LOB': [39111158, 89631139, 46986414, 13039848, 44519536, 70781052, 33396948, 83764718, 55144522, 66889139]
    };
}

function hydrateCard(cardId, quantity = 1, foilType = 'NORMAL') {
    const id = parseInt(typeof cardId === 'object' ? (cardId.card_id || cardId.id || cardId.CardCode) : cardId, 10);
    const ocg = ocgCardReader(id) || {};
    return {
        card_id: id,
        name: ocg.name || `Carta #${id}`,
        type: ocg.type_name || ocg.type || 'Normal Monster',
        atk: ocg.atk !== undefined ? ocg.atk : null,
        def: ocg.def !== undefined ? ocg.def : null,
        level: ocg.level || 0,
        attribute: ocg.attribute_name || ocg.attribute || '',
        race: ocg.race_name || ocg.race || '',
        desc: ocg.desc || '',
        rarity: ocg.rarity || 'COMMON',
        quantity: quantity,
        ownedCount: quantity,
        image_url: `https://images.ygoprodeck.com/images/cards_small/${id}.jpg`,
        image_large: `https://images.ygoprodeck.com/images/cards/${id}.jpg`
    };
}

/**
 * Obtener Mazo Activo e Inventario Oficial de Cartas desde SQL Server
 */
async function getDeckAndInventory(req, res) {
    try {
        const userId = parseInt(req.query.userId || req.headers['x-user-id'] || req.body.userId, 10);
        if (!userId) {
            return res.status(400).json({ success: false, message: 'ID de usuario requerido.' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .execute('dbo.sp_ObtenerDeckEInventario');

        const activeDeckRecord = result.recordsets[0] && result.recordsets[0][0] ? result.recordsets[0][0] : null;
        const rawInventory = result.recordsets[1] || [];

        // Parsear Decks
        let mainDeck = [];
        let extraDeck = [];
        let sideDeck = [];

        if (activeDeckRecord) {
            try { mainDeck = JSON.parse(activeDeckRecord.MainDeckJson || '[]'); } catch(e) {}
            try { extraDeck = JSON.parse(activeDeckRecord.ExtraDeckJson || '[]'); } catch(e) {}
            try { sideDeck = JSON.parse(activeDeckRecord.SideDeckJson || '[]'); } catch(e) {}
        }

        const hydratedMain = mainDeck.map(c => hydrateCard(c));
        const hydratedExtra = extraDeck.map(c => hydrateCard(c));
        const hydratedSide = sideDeck.map(c => hydrateCard(c));
        const hydratedInventory = rawInventory.map(item => hydrateCard(item.CardCode, item.Quantity, item.FoilType));

        return res.json({
            success: true,
            deck: {
                id: activeDeckRecord ? activeDeckRecord.Id : null,
                name: activeDeckRecord ? activeDeckRecord.Nombre : 'Mazo Principal',
                mainDeck: hydratedMain,
                extraDeck: hydratedExtra,
                sideDeck: hydratedSide
            },
            inventory: hydratedInventory
        });
    } catch (err) {
        console.error('[API /api/game/deck-inventory ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al consultar deck e inventario: ' + err.message });
    }
}

/**
 * Guardar Mazo Oficial en SQL Server
 */
async function saveDeck(req, res) {
    try {
        const { userId, name, mainDeck, extraDeck, sideDeck } = req.body;
        const uid = parseInt(userId || req.headers['x-user-id'], 10);

        if (!uid) {
            return res.status(400).json({ success: false, message: 'ID de usuario requerido.' });
        }

        const mainArr = Array.isArray(mainDeck) ? mainDeck : [];
        const extraArr = Array.isArray(extraDeck) ? extraDeck : [];
        const sideArr = Array.isArray(sideDeck) ? sideDeck : [];

        if (mainArr.length < 40 || mainArr.length > 60) {
            return res.status(400).json({ success: false, message: `El Main Deck debe contener entre 40 y 60 cartas reglamentarias (actualmente: ${mainArr.length}).` });
        }

        if (extraArr.length > 15) {
            return res.status(400).json({ success: false, message: `El Extra Deck no puede superar las 15 cartas (actualmente: ${extraArr.length}).` });
        }

        const pool = await getPool();

        // Validar contra el inventario real en SQL Server
        const invCheck = await pool.request()
            .input('UserId', sql.Int, uid)
            .query('SELECT CardCode, Quantity FROM dbo.UserCardsSql WHERE UsuarioId = @UserId');

        const invMap = new Map(invCheck.recordset.map(r => [r.CardCode, r.Quantity]));
        const countMap = new Map();

        for (const card of [...mainArr, ...extraArr, ...sideArr]) {
            const cardId = parseInt(typeof card === 'object' ? (card.card_id || card.id) : card, 10);
            countMap.set(cardId, (countMap.get(cardId) || 0) + 1);

            if (countMap.get(cardId) > 3) {
                return res.status(400).json({ success: false, message: `La carta #${cardId} excede el límite máximo reglamentario de 3 copias por mazo.` });
            }

            const owned = invMap.get(cardId) || 0;
            if (countMap.get(cardId) > owned) {
                return res.status(400).json({ success: false, message: `No posees suficientes copias de la carta #${cardId} en tu inventario oficial (En Mazo: ${countMap.get(cardId)}, Poseídas: ${owned}).` });
            }
        }

        // Ejecutar Stored Procedure de Guardado
        const result = await pool.request()
            .input('UserId', sql.Int, uid)
            .input('Nombre', sql.VarChar(100), (name || 'Mazo Principal').trim())
            .input('MainDeckJson', sql.NVarChar(sql.MAX), JSON.stringify(mainArr.map(c => typeof c === 'object' ? (c.card_id || c.id) : c)))
            .input('ExtraDeckJson', sql.NVarChar(sql.MAX), JSON.stringify(extraArr.map(c => typeof c === 'object' ? (c.card_id || c.id) : c)))
            .input('SideDeckJson', sql.NVarChar(sql.MAX), JSON.stringify(sideArr.map(c => typeof c === 'object' ? (c.card_id || c.id) : c)))
            .execute('dbo.sp_GuardarDeckUsuario');

        return res.json({ success: true, message: '¡Mazo guardado exitosamente en la base de datos!' });
    } catch (err) {
        console.error('[API /api/game/deck/save ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al guardar mazo: ' + err.message });
    }
}

/**
 * Comprar y Abrir Sobre Oficial en SQL Server (Valida dbo.BoosterPacks y dbo.PackCardOverrides)
 */
async function buyAndOpenPack(req, res) {
    try {
        const { userId, packId, isBox } = req.body;
        const uid = parseInt(userId || req.headers['x-user-id'], 10);
        const pid = (packId || 'LOB').toUpperCase();

        if (!uid) {
            return res.status(400).json({ success: false, message: 'ID de usuario requerido.' });
        }

        const pool = await getPool();

        // 1. Obtener sobre y grupo de cartas estrictamente elegibles desde SQL Server
        const { dbPack, eligibleCards, isPackActive } = await getEligiblePackOpeningPool(pool, pid);

        if (!isPackActive || !dbPack) {
            return res.status(400).json({
                success: false,
                message: `El sobre '${pid}' no está disponible para compra o se encuentra desactivado por administración.`
            });
        }

        if (!eligibleCards || eligibleCards.length === 0) {
            return res.status(400).json({
                success: false,
                message: `No hay cartas habilitadas para drop en el sobre '${pid}'. Verifique la configuración en el Panel Administrador.`
            });
        }

        // 2. Costo y cantidad de cartas calculadas desde dbo.BoosterPacks
        const isBoxOpening = !!isBox;
        const basePrice = parseInt(dbPack.Price, 10) || 500;
        const costStarships = isBoxOpening ? Math.round(basePrice * 9) : basePrice;
        const cardsPerPack = parseInt(dbPack.CardsPerPack, 10) || 3;
        const packsToOpen = isBoxOpening ? 10 : 1;

        // 3. Selección de cartas respetando rarezas del sobre y exclusiones de SQL Server
        const commons = eligibleCards.filter(c => (c.rarity === 'COMMON' || !c.rarity));
        const rares = eligibleCards.filter(c => (c.rarity && c.rarity !== 'COMMON'));

        function pickRandom(list) {
            return list[Math.floor(Math.random() * list.length)];
        }

        const drawnCards = [];
        for (let p = 0; p < packsToOpen; p++) {
            for (let slot = 0; slot < cardsPerPack; slot++) {
                const isLastSlot = (slot === cardsPerPack - 1);
                let chosen;
                if (isLastSlot && rares.length > 0) {
                    chosen = pickRandom(rares);
                } else if (commons.length > 0) {
                    chosen = pickRandom(commons);
                } else {
                    chosen = pickRandom(eligibleCards);
                }

                const cardId = parseInt(chosen.card_id || chosen.id, 10);
                const ocg = ocgCardReader(cardId) || {};
                drawnCards.push({
                    card_id: cardId,
                    name: ocg.name || chosen.name || `Carta #${cardId}`,
                    rarity: chosen.rarity || ocg.rarity || 'COMMON',
                    image: `https://images.ygoprodeck.com/images/cards_small/${cardId}.jpg`,
                    image_large: `https://images.ygoprodeck.com/images/cards/${cardId}.jpg`
                });
            }
        }

        // 4. Ejecutar Stored Procedure Transaccional de Seguridad
        const spResult = await pool.request()
            .input('UsuarioId', sql.Int, uid)
            .input('PackId', sql.NVarChar(50), pid)
            .input('Costo', sql.Int, costStarships)
            .input('CardsJson', sql.NVarChar(sql.MAX), JSON.stringify(drawnCards))
            .execute('dbo.sp_ComprarYGuardarSobre');

        const spRow = spResult.recordset && spResult.recordset[0] ? spResult.recordset[0] : {};

        return res.json({
            success: true,
            newStarshipsBalance: spRow.NewStarships,
            openedCards: drawnCards,
            message: spRow.Message || (isBoxOpening
                ? `¡Caja x10 de ${dbPack.Name} abierta! ${drawnCards.length} cartas añadidas y registradas en tu colección.`
                : `¡Sobre de ${dbPack.Name} abierto! ${drawnCards.length} cartas añadidas y registradas en tu colección.`)
        });
    } catch (err) {
        console.error('[API /api/game/shop/open-pack ERROR]', err);
        return res.status(400).json({ success: false, message: err.message });
    }
}

/**
 * Obtener Cosméticos Oficiales del Usuario (Avatares, Tapetes, Fundas)
 */
async function getUserCosmetics(req, res) {
    try {
        const userId = parseInt(req.query.userId || req.headers['x-user-id'] || req.body.userId, 10);
        if (!userId) {
            return res.status(400).json({ success: false, message: 'ID de usuario requerido.' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .execute('dbo.sp_ObtenerCosmeticosUsuario');

        const avatars = result.recordsets[0] || [];
        const playmats = result.recordsets[1] || [];
        const sleeves = result.recordsets[2] || [];
        const vipPasses = result.recordsets[3] || [];

        const userRow = await pool.request()
            .input('UserId', sql.Int, userId)
            .query('SELECT AvatarActivoId, MatActivoId, FundaActivaId FROM dbo.Usuarios WHERE Id = @UserId');
        const userCos = (userRow.recordset && userRow.recordset[0]) ? userRow.recordset[0] : {};

        return res.json({
            success: true,
            avatars: avatars.map(a => a.AvatarCode),
            playmats: playmats.map(p => p.PlaymatCode),
            sleeves: sleeves.map(s => s.SleeveCode),
            vipPasses: vipPasses,
            activeAvatar: userCos.AvatarActivoId || 'AVA-002',
            activePlaymat: userCos.MatActivoId || null,
            activeSleeve: userCos.FundaActivaId || null
        });
    } catch (err) {
        console.error('[API /api/game/cosmetics ERROR]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * Comprar Cosmético Oficial en SQL Server
 */
async function buyCosmetic(req, res) {
    try {
        const { userId, itemType, itemCode, costStarships, expBoost, starshipsBoost, luckBoost } = req.body;
        const uid = parseInt(userId || req.headers['x-user-id'], 10);

        if (!uid || !itemType || !itemCode) {
            return res.status(400).json({ success: false, message: 'Parámetros incompletos.' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('UserId', sql.Int, uid)
            .input('ItemType', sql.VarChar(20), itemType.toUpperCase())
            .input('ItemCode', sql.VarChar(50), itemCode.trim())
            .input('CostStarships', sql.Int, parseInt(costStarships || 0, 10))
            .input('ExpBoost', sql.Decimal(5, 2), expBoost !== undefined && expBoost !== null ? parseFloat(expBoost) : null)
            .input('StarshipsBoost', sql.Decimal(5, 2), starshipsBoost !== undefined && starshipsBoost !== null ? parseFloat(starshipsBoost) : null)
            .input('LuckBoost', sql.Decimal(5, 2), luckBoost !== undefined && luckBoost !== null ? parseFloat(luckBoost) : null)
            .execute('dbo.sp_ComprarCosmetico');

        const row = result.recordset && result.recordset[0] ? result.recordset[0] : {};
        return res.json({ success: true, newStarshipsBalance: row.NewStarshipsBalance, message: 'Artículo desbloqueado y guardado en la base de datos exitosamente.' });
    } catch (err) {
        console.error('[API /api/game/cosmetics/buy ERROR]', err);
        return res.status(400).json({ success: false, message: err.message });
    }
}

/**
 * Equipar Cosmético Oficial en SQL Server
 */
async function equipCosmetic(req, res) {
    try {
        const { userId, itemType, itemCode } = req.body;
        const uid = parseInt(userId || req.headers['x-user-id'], 10);

        if (!uid || !itemType) {
            return res.status(400).json({ success: false, message: 'Parámetros incompletos.' });
        }

        const codeToEquip = (!itemCode || itemCode === 'NONE' || itemCode === 'DEFAULT' || itemCode === 'null' || itemCode === 'EMPTY') ? 'NONE' : itemCode.trim();

        const pool = await getPool();
        const result = await pool.request()
            .input('UserId', sql.Int, uid)
            .input('ItemType', sql.VarChar(20), itemType.toUpperCase())
            .input('ItemCode', sql.VarChar(50), codeToEquip)
            .execute('dbo.sp_EquiparCosmetico');

        const row = result.recordset && result.recordset[0] ? result.recordset[0] : {};
        if (row.Success === 0) {
            return res.status(400).json({ success: false, message: row.Message });
        }

        return res.json({ success: true, message: row.Message || 'Artículo equipado con éxito.' });
    } catch (err) {
        console.error('[API /api/game/cosmetics/equip ERROR]', err);
        return res.status(400).json({ success: false, message: err.message });
    }
}

/**
 * Obtener Buzón y Estadísticas de Avatar Oficiales
 */
async function getMailboxAndStats(req, res) {
    try {
        const userId = parseInt(req.query.userId || req.headers['x-user-id'] || req.body.userId, 10);
        if (!userId) {
            return res.status(400).json({ success: false, message: 'ID de usuario requerido.' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .execute('dbo.sp_ObtenerBuzonYStats');

        const stats = result.recordsets[0] && result.recordsets[0][0] ? result.recordsets[0][0] : { BonusExp: 0, BonusStarships: 0, BonusSuerte: 0 };
        const mailbox = result.recordsets[1] || [];

        return res.json({
            success: true,
            stats: {
                bonusExp: parseFloat(stats.BonusExp || 0),
                bonusStarships: parseFloat(stats.BonusStarships || 0),
                bonusSuerte: parseFloat(stats.BonusSuerte || 0)
            },
            mailbox: mailbox
        });
    } catch (err) {
        console.error('[API /api/game/mailbox-stats ERROR]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * Comprar Potenciador Oficial
 */
async function buyPotenciador(req, res) {
    try {
        const { userId, itemCode, itemName, itemType, boostValue, costStarships } = req.body;
        const uid = parseInt(userId || req.headers['x-user-id'], 10);

        const pool = await getPool();
        const result = await pool.request()
            .input('UserId', sql.Int, uid)
            .input('ItemCode', sql.VarChar(50), itemCode)
            .input('ItemName', sql.NVarChar(150), itemName)
            .input('ItemType', sql.VarChar(50), itemType)
            .input('BoostValue', sql.Decimal(5, 2), parseFloat(boostValue || 0))
            .input('CostStarships', sql.Int, parseInt(costStarships || 0, 10))
            .execute('dbo.sp_ComprarPotenciador');

        const row = result.recordset && result.recordset[0] ? result.recordset[0] : {};
        return res.json({ success: true, newStarshipsBalance: row.NewStarshipsBalance, message: 'Potenciador adquirido y enviado a tu buzón oficial.' });
    } catch (err) {
        console.error('[API /api/game/potenciador/buy ERROR]', err);
        return res.status(400).json({ success: false, message: err.message });
    }
}

/**
 * Consumir Potenciador desde el Buzón en SQL Server
 */
async function consumePotenciador(req, res) {
    try {
        const { userId, buzonItemId } = req.body;
        const uid = parseInt(userId || req.headers['x-user-id'], 10);
        const itemId = parseInt(buzonItemId, 10);

        const pool = await getPool();
        const result = await pool.request()
            .input('UserId', sql.Int, uid)
            .input('BuzonItemId', sql.Int, itemId)
            .execute('dbo.sp_ConsumirPotenciadorBuzon');

        const row = result.recordset && result.recordset[0] ? result.recordset[0] : {};
        return res.json({
            success: true,
            stats: {
                bonusExp: parseFloat(row.BonusExp || 0),
                bonusStarships: parseFloat(row.BonusStarships || 0),
                bonusSuerte: parseFloat(row.BonusSuerte || 0)
            },
            message: 'Potenciador aplicado exitosamente a tus estadísticas en la base de datos.'
        });
    } catch (err) {
        console.error('[API /api/game/potenciador/consume ERROR]', err);
        return res.status(400).json({ success: false, message: err.message });
    }
}

/**
 * Finalizar Duelo y Asignar Recompensas Oficiales en SQL Server
 */
async function finishDuelRewards(req, res) {
    try {
        const { userId, rivalNombre, isPvp, isVictory, baseExp, baseStarships, cardDropCode } = req.body;
        const uid = parseInt(userId || req.headers['x-user-id'], 10);

        const pool = await getPool();
        const result = await pool.request()
            .input('UserId', sql.Int, uid)
            .input('RivalNombre', sql.NVarChar(100), rivalNombre || 'NPC')
            .input('EsPvp', sql.Bit, isPvp ? 1 : 0)
            .input('EsVictoria', sql.Bit, isVictory ? 1 : 0)
            .input('BaseExp', sql.Int, parseInt(baseExp || 100, 10))
            .input('BaseStarships', sql.Int, parseInt(baseStarships || 150, 10))
            .input('CardDropCode', sql.Int, cardDropCode || null)
            .execute('dbo.sp_FinalizarDueloRecompensas');

        const row = result.recordset && result.recordset[0] ? result.recordset[0] : {};
        return res.json({ success: true, rewards: row });
    } catch (err) {
        console.error('[API /api/game/duel/finish ERROR]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * Obtener Estadísticas e Historial Completo de Duelos (NPC y PvP) desde SQL Server
 * SP: dbo.sp_ObtenerEstadisticasDuelosUsuario
 */
async function getDuelStatsAndHistory(req, res) {
    try {
        const param = req.params.userIdOrName || req.query.userId || req.query.username;
        const uid = !isNaN(param) ? parseInt(param, 10) : null;
        const uName = isNaN(param) && param ? String(param).trim() : (req.query.username ? String(req.query.username).trim() : null);

        if (!uid && !uName) {
            return res.status(400).json({ success: false, message: 'ID o Nombre de usuario requerido.' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('UserId', sql.Int, uid)
            .input('Username', sql.NVarChar(50), uName)
            .execute('dbo.sp_ObtenerEstadisticasDuelosUsuario');

        const stats = result.recordsets[0] && result.recordsets[0][0] ? result.recordsets[0][0] : {};
        const history = result.recordsets[1] || [];

        return res.json({
            success: true,
            stats: {
                npc: {
                    totalDuels: stats.NpcDuels || 0,
                    wins: stats.NpcWins || 0,
                    losses: stats.NpcLosses || 0,
                    winrate: stats.NpcWinrate || 0
                },
                pvp: {
                    totalDuels: stats.PvpDuels || 0,
                    wins: stats.PvpWins || 0,
                    losses: stats.PvpLosses || 0,
                    winrate: stats.PvpWinrate || 0
                },
                totals: {
                    totalDuels: stats.TotalDuels || 0,
                    wins: stats.TotalWins || 0,
                    losses: stats.TotalLosses || 0,
                    winrate: stats.TotalWinrate || 0,
                    starshipsGanadas: stats.TotalStarshipsGanadas || 0,
                    expGanada: stats.TotalExpGanada || 0
                }
            },
            history: history
        });
    } catch (err) {
        console.error('[API /api/game/duel/stats ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al consultar estadísticas de duelos: ' + err.message });
    }
}

/**
 * Vender 1 copia repetida al sistema (ÚNICA Y EXCLUSIVAMENTE SI TIENE MÁS DE 3 COPIAS)
 */
async function sellExcessCard(req, res) {
    try {
        const { userId, cardCode } = req.body;
        const uid = parseInt(userId || req.headers['x-user-id'], 10);
        const cCode = parseInt(cardCode, 10);

        if (!uid || !cCode) {
            return res.status(400).json({ success: false, message: 'ID de usuario y código de carta requeridos.' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('UsuarioId', sql.Int, uid)
            .input('CardCode', sql.Int, cCode)
            .execute('dbo.sp_VenderCartaRepetida');

        const data = result.recordset && result.recordset[0] ? result.recordset[0] : {};

        return res.json({
            success: true,
            remainingQuantity: data.RemainingQuantity,
            newBalance: data.NewBalance,
            paidAmount: data.PaidAmount || 100,
            message: data.Message || 'Venta realizada exitosamente.'
        });
    } catch (err) {
        console.error('[API /api/game/cards/sell-excess ERROR]', err);
        return res.status(400).json({ success: false, message: err.message });
    }
}

/**
 * Reclamar Regalo del Buzón en SQL Server (dbo.sp_ReclamarRegaloBuzon)
 */
async function claimMailboxGift(req, res) {
    try {
        const { userId, mailboxId } = req.body;
        const uid = parseInt(userId || req.headers['x-user-id'], 10);
        const mid = parseInt(mailboxId, 10);

        if (!uid || !mid) {
            return res.status(400).json({ success: false, message: 'Usuario y ID de buzón requeridos.' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('UsuarioId', sql.Int, uid)
            .input('MailboxId', sql.Int, mid)
            .execute('dbo.sp_ReclamarRegaloBuzon');

        const row = result.recordset && result.recordset[0] ? result.recordset[0] : {};
        let payload = {};
        try { payload = JSON.parse(row.PayloadJson); } catch (e) {}

        return res.json({ 
            success: true, 
            message: row.Message || 'Recompensa reclamada exitosamente.',
            giftType: row.GiftType,
            payload: payload,
            newStarships: row.NewStarships,
            avatar: {
                code: row.ActiveAvatarCode,
                exp: row.AvatarExp !== null && row.AvatarExp !== undefined ? parseFloat(row.AvatarExp) : undefined,
                starships: row.AvatarStar !== null && row.AvatarStar !== undefined ? parseFloat(row.AvatarStar) : undefined,
                luck: row.AvatarLuck !== null && row.AvatarLuck !== undefined ? parseFloat(row.AvatarLuck) : undefined
            },
            stats: {
                bonusExp: row.BonusExp !== null && row.BonusExp !== undefined ? parseFloat(row.BonusExp) : undefined,
                bonusStarships: row.BonusStarships !== null && row.BonusStarships !== undefined ? parseFloat(row.BonusStarships) : undefined,
                bonusSuerte: row.BonusSuerte !== null && row.BonusSuerte !== undefined ? parseFloat(row.BonusSuerte) : undefined
            }
        });
    } catch (err) {
        console.error('[API /api/game/mailbox/claim ERROR]', err);
        return res.status(400).json({ success: false, message: err.message });
    }
}

/**
 * Comprar Pase VIP en SQL Server (dbo.sp_ComprarPaseVip)
 */
async function buyVipPass(req, res) {
    try {
        const { userId, passCode, durationDays, costStarships } = req.body;
        const uid = parseInt(userId || req.headers['x-user-id'], 10);

        if (!uid || !passCode) {
            return res.status(400).json({ success: false, message: 'Usuario y código de pase VIP requeridos.' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('UsuarioId', sql.Int, uid)
            .input('PassCode', sql.NVarChar(50), passCode.trim())
            .input('DurationDays', sql.Int, parseInt(durationDays || 30, 10))
            .input('CostoStarships', sql.Int, parseInt(costStarships || 20000, 10))
            .execute('dbo.sp_ComprarPaseVip');

        const row = result.recordset && result.recordset[0] ? result.recordset[0] : {};
        return res.json({
            success: true,
            vipUntil: row.VipUntil,
            newStarshipsBalance: row.NewStarships,
            message: row.Message || 'Pase VIP activado con éxito.'
        });
    } catch (err) {
        console.error('[API /api/game/vip/buy ERROR]', err);
        return res.status(400).json({ success: false, message: err.message });
    }
}

/**
 * Mejorar Avatar en SQL Server (dbo.sp_MejorarAvatar)
 */
async function upgradeAvatar(req, res) {
    try {
        const { userId, avatarCode, stat, costStarships } = req.body;
        const uid = parseInt(userId || req.headers['x-user-id'], 10);

        if (!uid || !avatarCode || !stat) {
            return res.status(400).json({ success: false, message: 'Parámetros incompletos.' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('UsuarioId', sql.Int, uid)
            .input('AvatarCode', sql.NVarChar(50), avatarCode.trim())
            .input('Stat', sql.NVarChar(50), stat.toUpperCase().trim())
            .input('CostStarships', sql.Int, parseInt(costStarships || 1000, 10))
            .execute('dbo.sp_MejorarAvatar');

        const row = result.recordset && result.recordset[0] ? result.recordset[0] : {};
        return res.json({
            success: true,
            avatar: row,
            message: row.Message || 'Avatar mejorado con éxito.'
        });
    } catch (err) {
        console.error('[API /api/game/avatar/upgrade ERROR]', err);
        return res.status(400).json({ success: false, message: err.message });
    }
}

/**
 * Comprar Carta Single Oficial en SQL Server (dbo.sp_ComprarCartaSingle)
 */
async function buySingleCard(req, res) {
    try {
        const { userId, cardCode, cardName, priceUsd, priceStarships, paymentMethod, foilType, quantity } = req.body;
        const uid = parseInt(userId || req.headers['x-user-id'], 10);
        const code = String(cardCode || '').trim();

        if (!uid || !code) {
            return res.status(400).json({ success: false, message: 'Usuario y código de carta requeridos.' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('UsuarioId', sql.Int, uid)
            .input('CardCode', sql.VarChar(50), code)
            .input('CardName', sql.NVarChar(150), cardName || `Carta #${code}`)
            .input('PriceUsd', sql.Decimal(10, 2), priceUsd !== undefined ? parseFloat(priceUsd) : 0.00)
            .input('PriceStarships', sql.Int, priceStarships !== undefined ? parseInt(priceStarships, 10) : 0)
            .input('PaymentMethod', sql.VarChar(50), (paymentMethod || 'STARSHIPS').toUpperCase())
            .input('FoilType', sql.VarChar(50), (foilType || 'NORMAL').toUpperCase())
            .input('Quantity', sql.Int, parseInt(quantity || 1, 10))
            .execute('dbo.sp_ComprarCartaSingle');

        const row = result.recordset && result.recordset[0] ? result.recordset[0] : {};
        if (row.Success === 0) {
            return res.status(400).json({ success: false, message: row.Message });
        }

        return res.json({
            success: true,
            newStarshipsBalance: row.NewStarshipsBalance,
            purchaseId: row.PurchaseId,
            message: row.Message || '¡Carta adquirida y registrada en tu inventario oficial!'
        });
    } catch (err) {
        console.error('[API /api/game/shop/buy-single ERROR]', err);
        return res.status(400).json({ success: false, message: err.message });
    }
}

/**
 * Obtener Historial de Auditoría de Compras de Cartas Singles (dbo.sp_ObtenerHistorialComprasSingles)
 */
async function getSingleCardPurchasesHistory(req, res) {
    try {
        const uid = parseInt(req.query.userId || req.headers['x-user-id'], 10) || null;
        const limit = parseInt(req.query.limit || 50, 10);

        const pool = await getPool();
        const result = await pool.request()
            .input('UsuarioId', sql.Int, uid)
            .input('Limit', sql.Int, limit)
            .execute('dbo.sp_ObtenerHistorialComprasSingles');

        return res.json({
            success: true,
            history: result.recordset || []
        });
    } catch (err) {
        console.error('[API /api/game/shop/singles/history ERROR]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * Catálogo Público de Cartas Singles desde SQL Server
 */
async function getShopSingles(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT * FROM dbo.CartasSinglesCatalog WHERE IsActive = 1 ORDER BY Price ASC');
        const singles = (result.recordset || []).map(r => ({
            code: r.Code,
            codigo: r.Code,
            cardId: r.CardId,
            card_id: r.CardId,
            name: r.Name,
            nombre: r.Name,
            packCode: r.PackCode,
            rarity: r.Rarity,
            rareza: r.Rarity,
            type: r.Type,
            tipo: r.Type,
            cardsList: r.CardsList ? JSON.parse(r.CardsList) : null,
            price: parseFloat(r.Price),
            precio_usd: parseFloat(r.Price),
            currency: r.Currency,
            offer_text: r.OfferText || '',
            image: r.Image,
            description: r.Description || '',
            descripcion: r.Description || '',
            active: Boolean(r.IsActive),
            activo: r.IsActive ? 1 : 0
        }));
        return res.json({ success: true, singles, cartas: singles });
    } catch (err) {
        console.error('[API /api/game/shop/singles ERROR]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * Catálogo Público de Tapetes (Playmats) desde SQL Server
 */
async function getShopPlaymats(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT * FROM dbo.PlaymatsCatalog WHERE IsActive = 1 ORDER BY Price ASC');
        const playmats = (result.recordset || []).map(r => ({
            code: r.Code,
            name: r.Name,
            description: r.Description || '',
            price: r.Price,
            currency: r.Currency,
            image: r.Image,
            offer_text: r.OfferText || '',
            active: Boolean(r.IsActive)
        }));
        return res.json({ success: true, playmats });
    } catch (err) {
        console.error('[API /api/game/shop/playmats ERROR]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * Catálogo Público de Fundas (Sleeves) desde SQL Server
 */
async function getShopSleeves(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT * FROM dbo.SleevesCatalog WHERE IsActive = 1 ORDER BY Price ASC');
        const sleeves = (result.recordset || []).map(r => ({
            code: r.Code,
            name: r.Name,
            description: r.Description || '',
            price: r.Price,
            currency: r.Currency,
            image: r.Image,
            offer_text: r.OfferText || '',
            active: Boolean(r.IsActive)
        }));
        return res.json({ success: true, sleeves });
    } catch (err) {
        console.error('[API /api/game/shop/sleeves ERROR]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * Catálogo Público de Paquetes de Estrellas (StarShips) desde SQL Server
 */
async function getShopEstrellas(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT * FROM dbo.EstrellasPackagesCatalog WHERE IsActive = 1 ORDER BY Price ASC');
        const packages = (result.recordset || []).map(r => ({
            codigo: r.Code,
            code: r.Code,
            nombre: r.Name,
            name: r.Name,
            icono: r.Icon || '⭐',
            estrellas_base: r.StarshipsBase,
            estrellas_bonus: r.StarshipsBonus,
            starships: r.StarshipsBase + r.StarshipsBonus,
            precio_usd: parseFloat(r.Price),
            price: parseFloat(r.Price),
            banner_tag: r.BannerTag || '',
            offer_text: r.BannerTag || '',
            descripcion: r.Description || '',
            description: r.Description || '',
            activo: r.IsActive ? 1 : 0,
            active: Boolean(r.IsActive)
        }));
        return res.json({ success: true, packages });
    } catch (err) {
        console.error('[API /api/game/shop/estrellas ERROR]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * Reclamar regalo del buzón de forma atómica en SQL Server
 */
async function claimMailboxGift(req, res) {
    try {
        const { giftId, userId, username } = req.body;
        const gid = parseInt(giftId, 10);
        let uid = parseInt(userId || req.headers['x-user-id'], 10);

        const pool = await getPool();

        if ((!uid || isNaN(uid)) && username) {
            const userLookup = await pool.request()
                .input('Username', sql.VarChar(50), username.trim())
                .query('SELECT Id FROM dbo.Usuarios WHERE Username = @Username');
            if (userLookup.recordset.length > 0) {
                uid = userLookup.recordset[0].Id;
            }
        }

        if (isNaN(gid) || isNaN(uid)) {
            return res.status(400).json({ success: false, message: 'Parámetros incompletos para reclamar regalo.' });
        }

        const result = await pool.request()
            .input('UsuarioId', sql.Int, uid)
            .input('MailboxId', sql.Int, gid)
            .execute('dbo.sp_ReclamarRegaloBuzon');

        const row = result.recordset && result.recordset[0] ? result.recordset[0] : {};
        let payload = {};
        try { payload = JSON.parse(row.PayloadJson); } catch (e) {}

        return res.json({
            success: true,
            message: row.Message || 'Recompensa reclamada exitosamente.',
            giftType: row.GiftType,
            payload: payload,
            newStarships: row.NewStarships
        });
    } catch (err) {
        console.error('[API /api/game/mailbox/claim ERROR]', err);
        return res.status(400).json({ success: false, message: err.message });
    }
}

/**
 * Catálogo Público de Avatares desde SQL Server
 */
async function getShopAvatars(req, res) {
    try {
        const userId = parseInt(req.query.userId || req.headers['x-user-id'] || 0, 10);
        const pool = await getPool();
        const result = await pool.request()
            .input('UserId', sql.Int, userId || null)
            .execute('dbo.sp_ObtenerCatalogoAvatares');

        const avatars = (result.recordset || []).map(r => ({
            code: r.Code,
            name: r.Name,
            image: r.ImageUrl,
            exp_boost: parseFloat(r.ExpBoost || 0),
            starships_boost: parseFloat(r.StarshipsBoost || 0),
            luck_boost: parseFloat(r.LuckBoost || 0),
            currency: r.Currency,
            price: r.Currency === 'USD' ? parseFloat(r.PriceUsd) : parseInt(r.PriceStarships, 10),
            price_usd: parseFloat(r.PriceUsd || 0),
            price_starships: parseInt(r.PriceStarships || 0, 10),
            offer_text: r.OfferText || '',
            is_vip_only: Boolean(r.IsVipOnly),
            active: Boolean(r.IsActive),
            is_owned: Boolean(r.IsOwned),
            is_current_active: Boolean(r.IsCurrentActive)
        }));
        return res.json({ success: true, avatars });
    } catch (err) {
        console.error('[API /api/game/shop/avatars ERROR]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * Catálogo Público de Potenciadores desde SQL Server
 */
async function getShopPotenciadores(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT * FROM dbo.PotenciadoresCatalog WHERE IsActive = 1 ORDER BY Id ASC');
        const potenciadores = (result.recordset || []).map(r => ({
            code: r.Code,
            name: r.Name,
            type: r.Type,
            boost_value: parseFloat(r.BoostValue || 0),
            currency: r.Currency,
            price: r.Currency === 'USD' ? parseFloat(r.PriceUsd) : parseInt(r.PriceStarships, 10),
            price_usd: parseFloat(r.PriceUsd || 0),
            price_starships: parseInt(r.PriceStarships || 0, 10),
            offer_text: r.OfferText || '',
            description: r.Description || '',
            active: Boolean(r.IsActive)
        }));
        return res.json({ success: true, potenciadores });
    } catch (err) {
        console.error('[API /api/game/shop/potenciadores ERROR]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * Catálogo Público de Pases VIP desde SQL Server
 */
async function getShopVipPasses(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT * FROM dbo.VipPassesCatalog WHERE IsActive = 1 ORDER BY Id ASC');
        const passes = (result.recordset || []).map(r => ({
            code: r.Code,
            name: r.Name,
            days: r.DurationDays,
            exp_boost: parseFloat(r.ExpBoost || 0),
            starships_boost: parseFloat(r.StarshipsBoost || 0),
            luck_boost: parseFloat(r.LuckBoost || 0),
            currency: r.Currency,
            price: r.Currency === 'USD' ? parseFloat(r.PriceUsd) : parseInt(r.PriceStarships, 10),
            price_usd: parseFloat(r.PriceUsd || 0),
            price_starships: parseInt(r.PriceStarships || 0, 10),
            offer_text: r.OfferText || '',
            active: Boolean(r.IsActive)
        }));
        return res.json({ success: true, passes });
    } catch (err) {
        console.error('[API /api/game/shop/vip ERROR]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * Aplicar Potenciador a un Avatar (dbo.sp_AplicarPotenciadorAvatar)
 * Guarda en tabla hija dbo.UserAvatarPotenciadores y actualiza estadísticas acumuladas
 */
async function applyAvatarPotenciador(req, res) {
    try {
        const { userId, avatarCode, potenciadorCode } = req.body;
        const uid = parseInt(userId || req.headers['x-user-id'], 10);
        const avCode = String(avatarCode || '').trim().toUpperCase();
        const potCode = String(potenciadorCode || '').trim().toUpperCase();

        if (!uid || !avCode || !potCode) {
            return res.status(400).json({ success: false, message: 'Usuario, avatar y potenciador son requeridos.' });
        }

        const pool = await getPool();
        const spResult = await pool.request()
            .input('UserId', sql.Int, uid)
            .input('AvatarCode', sql.VarChar(50), avCode)
            .input('PotenciadorCode', sql.VarChar(50), potCode)
            .execute('dbo.sp_AplicarPotenciadorAvatar');

        const row = spResult.recordset && spResult.recordset[0];
        if (!row || !row.Success) {
            return res.status(400).json({ success: false, message: (row && row.Message) || 'Error al aplicar potenciador.' });
        }

        return res.json({
            success: true,
            message: row.Message,
            avatarCode: row.AvatarCode,
            expBoost: row.ExpBoost,
            starshipsBoost: row.StarshipsBoost,
            luckBoost: row.LuckBoost,
            newStarshipsBalance: row.NewStarshipsBalance
        });
    } catch (err) {
        console.error('[API /api/game/avatar/apply-potenciador ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error en servidor: ' + err.message });
    }
}

/**
 * Obtener todos los avatares del usuario con su desglose de potenciadores aplicados
 */
async function getUserAvatars(req, res) {
    try {
        const userId = parseInt(req.query.userId || req.headers['x-user-id'], 10);
        if (!userId) {
            return res.status(400).json({ success: false, message: 'ID de usuario requerido.' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .execute('dbo.sp_ObtenerAvataresUsuario');

        const userAvatars = result.recordsets[0] || [];
        const appliedBoosters = result.recordsets[1] || [];

        // Agrupar potenciadores por avatar
        const boostersByAvatar = {};
        appliedBoosters.forEach(b => {
            if (!boostersByAvatar[b.AvatarCode]) boostersByAvatar[b.AvatarCode] = [];
            boostersByAvatar[b.AvatarCode].push(b);
        });

        const formatted = userAvatars.map(ua => ({
            id: ua.Id,
            code: ua.AvatarCode,
            name: ua.Name,
            image: ua.ImageUrl,
            exp_boost: parseFloat(ua.ExpBoost || 0),
            starships_boost: parseFloat(ua.StarshipsBoost || 0),
            luck_boost: parseFloat(ua.LuckBoost || 0),
            is_active: Boolean(ua.IsActive),
            acquired_at: ua.AcquiredAt,
            applied_potenciadores: boostersByAvatar[ua.AvatarCode] || []
        }));

        return res.json({ success: true, userAvatars: formatted });
    } catch (err) {
        console.error('[API /api/game/user/avatars ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error en servidor: ' + err.message });
    }
}

/**
 * Obtener Configuraciones Globales del Juego desde dbo.GameConfigurations
 */
async function getGameConfigurations(req, res) {
    try {
        const category = req.query.category || null;
        const pool = await getPool();
        const result = await pool.request()
            .input('Category', sql.VarChar(50), category)
            .execute('dbo.sp_ObtenerConfiguracionesJuego');

        const configs = {};
        (result.recordset || []).forEach(c => {
            let val = c.ConfigValue;
            if (c.DataType === 'INT') val = parseInt(val, 10);
            else if (c.DataType === 'FLOAT') val = parseFloat(val);
            else if (c.DataType === 'BOOLEAN') val = (val === 'true' || val === '1');
            else if (c.DataType === 'JSON') {
                try { val = JSON.parse(val); } catch(e){}
            }
            configs[c.ConfigKey] = val;
        });

        return res.json({ success: true, configs });
    } catch (err) {
        console.error('[API /api/game/config ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al consultar configuraciones: ' + err.message });
    }
}

module.exports = {
    getDeckAndInventory,
    saveDeck,
    buyAndOpenPack,
    getUserCosmetics,
    buyCosmetic,
    equipCosmetic,
    getMailboxAndStats,
    claimMailboxGift,
    buyPotenciador,
    consumePotenciador,
    buyVipPass,
    upgradeAvatar: applyAvatarPotenciador,
    applyAvatarPotenciador,
    getUserAvatars,
    getGameConfigurations,
    finishDuelRewards,
    getDuelStatsAndHistory,
    sellExcessCard,
    buySingleCard,
    getSingleCardPurchasesHistory,
    getShopSingles,
    getShopPlaymats,
    getShopSleeves,
    getShopEstrellas,
    getShopAvatars,
    getShopPotenciadores,
    getShopVipPasses
};



