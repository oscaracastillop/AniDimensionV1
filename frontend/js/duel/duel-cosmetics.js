/**
 * Ani-Dimension: Sistema de Cosméticos de Duelo en Tiempo Real (Tapetes & Fundas)
 * Renderiza el tapete del jugador en la mitad inferior (#player-mat-field) y el del rival en la mitad superior (#rival-mat-field).
 * Aplica fundas personalizadas en barajas, extra deck y cartas boca abajo adaptadas al 100%.
 */
(function(window) {
    const DuelCosmetics = {
        initCosmetics: function(playerData = {}, rivalData = {}) {
            this.applyPlayerCosmetics(playerData);
            this.applyRivalCosmetics(rivalData);
        },

        applyPlayerCosmetics: function(playerData = {}) {
            // 1. Tapete del Jugador (Mitad Inferior)
            const playerMatEl = document.getElementById('player-mat-field');
            let activeMatCode = playerData.matActivoId || playerData.activePlaymatCode || '';
            
            if (!activeMatCode && window.PlaymatsManager) {
                activeMatCode = window.PlaymatsManager.getActivePlaymatCode();
            }
            if (!activeMatCode && window.Session) {
                const u = window.Session.getUser();
                if (u && u.matActivoId) activeMatCode = u.matActivoId;
            }

            let playerMat = null;
            if (activeMatCode && window.PlaymatsManager) {
                playerMat = window.PlaymatsManager.getPlaymatByCode(activeMatCode);
            }

            if (playerMatEl) {
                if (playerMat && playerMat.image && playerMat.active !== false) {
                    playerMatEl.style.backgroundImage = `url('${playerMat.image}')`;
                    playerMatEl.style.backgroundSize = '100% 100%';
                    playerMatEl.style.backgroundPosition = 'center center';
                    playerMatEl.style.backgroundRepeat = 'no-repeat';
                    playerMatEl.classList.add('has-mat');
                } else {
                    playerMatEl.style.backgroundImage = 'none';
                    playerMatEl.classList.remove('has-mat');
                }
            }

            // 2. Funda del Jugador (Reverso de Cartas P1)
            let activeSleeveCode = playerData.fundaActivaId || playerData.activeSleeveCode || '';
            if (!activeSleeveCode && window.SleevesManager) {
                activeSleeveCode = window.SleevesManager.getActiveSleeveCode();
            }
            if (!activeSleeveCode && window.Session) {
                const u = window.Session.getUser();
                if (u && u.fundaActivaId) activeSleeveCode = u.fundaActivaId;
            }

            let playerSleeve = null;
            if (activeSleeveCode && window.SleevesManager) {
                playerSleeve = window.SleevesManager.getSleeveByCode(activeSleeveCode);
            }

            if (playerSleeve && playerSleeve.image && playerSleeve.active !== false) {
                document.documentElement.style.setProperty('--player-sleeve-img', `url('${playerSleeve.image}')`);
            } else {
                document.documentElement.style.setProperty('--player-sleeve-img', `url('/assets/card_back.jpg')`);
            }
        },

        applyRivalCosmetics: function(rivalData = {}) {
            // 1. Tapete del Rival (Mitad Superior)
            const rivalMatEl = document.getElementById('rival-mat-field');
            let activeRivalMatCode = rivalData.matActivoId || rivalData.activePlaymatCode || '';
            let rivalMat = null;

            if (activeRivalMatCode && window.PlaymatsManager) {
                rivalMat = window.PlaymatsManager.getPlaymatByCode(activeRivalMatCode);
            }

            if (rivalMatEl) {
                if (rivalMat && rivalMat.image && rivalMat.active !== false) {
                    rivalMatEl.style.backgroundImage = `url('${rivalMat.image}')`;
                    rivalMatEl.style.backgroundSize = '100% 100%';
                    rivalMatEl.style.backgroundPosition = 'center center';
                    rivalMatEl.style.backgroundRepeat = 'no-repeat';
                    rivalMatEl.classList.add('has-mat');
                } else {
                    rivalMatEl.style.backgroundImage = 'none';
                    rivalMatEl.classList.remove('has-mat');
                }
            }

            // 2. Funda del Rival (Reverso de Cartas P2 / NPC)
            let activeRivalSleeveCode = rivalData.fundaActivaId || rivalData.activeSleeveCode || '';
            let rivalSleeve = null;
            if (activeRivalSleeveCode && window.SleevesManager) {
                rivalSleeve = window.SleevesManager.getSleeveByCode(activeRivalSleeveCode);
            }

            if (rivalSleeve && rivalSleeve.image && rivalSleeve.active !== false) {
                document.documentElement.style.setProperty('--rival-sleeve-img', `url('${rivalSleeve.image}')`);
            } else {
                document.documentElement.style.setProperty('--rival-sleeve-img', `url('/assets/card_back.jpg')`);
            }
        }
    };

    window.DuelCosmetics = DuelCosmetics;

    document.addEventListener('DOMContentLoaded', () => {
        DuelCosmetics.initCosmetics();
    });
})(window);
