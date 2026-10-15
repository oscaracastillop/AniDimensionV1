/**
 * Ani-Dimension: Resolvedor de Bonificadores del Avatar Activo
 * Obtiene estricta y únicamente los potenciadores del avatar actualmente equipado/activo del jugador.
 * No suma avatares inactivos del inventario.
 */

function getActiveAvatarBoosts(avatarCode, customStats = null) {
    const code = (avatarCode || 'AVA-002').toUpperCase().trim();

    // 1. Si existen estadísticas personalizadas explícitas para este avatar activo
    if (customStats && (customStats.BonusExp !== undefined || customStats.BonusStarships !== undefined || customStats.BonusSuerte !== undefined)) {
        return {
            code,
            expPct: Math.max(0, parseFloat(customStats.BonusExp || 0)),
            starshipsPct: Math.max(0, parseFloat(customStats.BonusStarships || 0)),
            luckPct: Math.max(0, parseFloat(customStats.BonusSuerte || 0))
        };
    }

    // 2. Avatar Default Inicial (AVA-002: 0.0% en todo)
    if (code === 'AVA-002') {
        return { code: 'AVA-002', expPct: 0.0, starshipsPct: 0.0, luckPct: 0.0 };
    }

    // 3. Avatar Admin (AVA-001)
    if (code === 'AVA-001') {
        return { code: 'AVA-001', expPct: 5.0, starshipsPct: 5.0, luckPct: 3.0 };
    }

    // 4. Avatares Prémium Especiales (AVA-346 a AVA-350)
    const premiumMap = {
        'AVA-346': { expPct: 25.0, starshipsPct: 25.0, luckPct: 8.0 },
        'AVA-347': { expPct: 60.0, starshipsPct: 60.0, luckPct: 18.0 },
        'AVA-348': { expPct: 120.0, starshipsPct: 120.0, luckPct: 35.0 },
        'AVA-349': { expPct: 200.0, starshipsPct: 200.0, luckPct: 60.0 },
        'AVA-350': { expPct: 300.0, starshipsPct: 300.0, luckPct: 100.0 }
    };

    if (premiumMap[code]) {
        return { code, ...premiumMap[code] };
    }

    // 5. Avatares Estándar (AVA-003 a AVA-345)
    const num = parseInt(code.replace('AVA-', ''), 10);
    if (!isNaN(num) && num >= 3 && num <= 345) {
        return { code, expPct: 3.0, starshipsPct: 2.0, luckPct: 1.0 };
    }

    return { code, expPct: 0.0, starshipsPct: 0.0, luckPct: 0.0 };
}

module.exports = { getActiveAvatarBoosts };
