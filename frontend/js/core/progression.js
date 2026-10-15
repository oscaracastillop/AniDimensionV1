/**
 * ============================================================================
 * ANI-DIMENSION: MOTOR CLIENTE DE PROGRESIÓN (NIVEL 1 A 500 & ECONOMÍA STARSHIPS)
 * ============================================================================
 */
(function(window) {
    const MAX_LEVEL = 500;

    const ProgressionClient = {
        MAX_LEVEL: MAX_LEVEL,

        /**
         * EXP requerida para subir del nivel actual al siguiente
         */
        getExpRequiredForNextLevel: function(level) {
            const lvl = Math.max(1, Math.min(MAX_LEVEL, parseInt(level, 10) || 1));
            if (lvl >= MAX_LEVEL) return 0;
            return Math.floor(180 * Math.pow(lvl, 1.38) + (70 * lvl));
        },

        /**
         * Calcula el progreso porcentual dentro del nivel actual
         */
        getProgressPercent: function(level, currentExp) {
            const lvl = Math.max(1, Math.min(MAX_LEVEL, parseInt(level, 10) || 1));
            if (lvl >= MAX_LEVEL) return 100;
            const req = this.getExpRequiredForNextLevel(lvl);
            if (req <= 0) return 100;
            const exp = Math.max(0, parseInt(currentExp, 10) || 0);
            return Math.min(100, Math.round((exp / req) * 100));
        },

        /**
         * Estima recompensas de duelo para vista previa en UI
         */
        estimateDuelRewards: function(playerLevel, rivalLevel, isPvP) {
            const pLvl = Math.max(1, Math.min(MAX_LEVEL, parseInt(playerLevel || 1, 10)));
            const rLvl = Math.max(1, Math.min(MAX_LEVEL, parseInt(rivalLevel || 1, 10)));
            const diff = rLvl - pLvl;
            
            // EXP
            const baseExpCalc = Math.floor(250 + (120 * Math.pow(pLvl, 1.08)) + (60 * Math.pow(rLvl, 1.05)));
            let expMult = 1.0;
            if (diff > 0) {
                expMult = 1.0 + Math.min(1.5, (diff / (pLvl + 10)) * 1.2);
            }
            const pvpExp = isPvP ? 1.50 : 1.0;
            const estExp = Math.max(50, Math.round(baseExpCalc * expMult * pvpExp));

            // StarShips
            const baseStCalc = Math.floor(60 + (12 * Math.pow(pLvl, 0.92)) + (6 * Math.pow(rLvl, 0.90)));
            let stMult = 1.0;
            if (diff > 0) {
                stMult = 1.0 + Math.min(1.0, (diff / (pLvl + 12)) * 1.0);
            }
            const pvpSt = isPvP ? 1.50 : 1.0;
            const estSt = Math.max(20, Math.round(baseStCalc * stMult * pvpSt));

            return {
                estimatedExp: estExp,
                estimatedStarships: estSt
            };
        }
    };

    window.ProgressionClient = ProgressionClient;
})(window);
