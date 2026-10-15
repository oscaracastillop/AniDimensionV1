/**
 * ============================================================================
 * ANI-DIMENSION: SOUND MANAGER (AUDIO ENGINE OFICIAL / MASTER DUEL & DUEL LINKS)
 * Motor centralizado de reproducción de música de fondo (BGM) y efectos (SFX).
 * ============================================================================
 */

(function (window) {
    'use strict';

    function resolveAssetUrl(relativePath) {
        if (!relativePath) return '';
        if (relativePath.startsWith('http://') || relativePath.startsWith('https://') || relativePath.startsWith('blob:')) {
            return relativePath;
        }

        // Limpiar leading slash si es necesario
        const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;

        // 1. Consultar si el recurso está descargado localmente en IndexedDB vía ResourceDownloader
        if (typeof window !== 'undefined' && window.ResourceDownloader && typeof window.ResourceDownloader.getAudioUrl === 'function') {
            const cachedBlobUrl = window.ResourceDownloader.getAudioUrl(cleanPath);
            if (cachedBlobUrl) {
                return cachedBlobUrl;
            }
        }
        
        // 2. Detectar ruta relativa según profundidad
        let prefix = '/';
        if (typeof window !== 'undefined' && window.location) {
            const depth = (window.location.pathname.match(/\//g) || []).length;
            if (window.location.protocol === 'file:' || !window.location.origin) {
                // Modo local/Capacitor
                if (depth >= 4) prefix = '../../../../';
                else if (depth === 3) prefix = '../../../';
                else if (depth === 2) prefix = '../../';
                else if (depth === 1) prefix = '../';
                else prefix = './';
            } else {
                prefix = '/';
            }
        }

        return prefix + cleanPath;
    }

    // Carga automática garantizada del Gestor de Recursos bajo demanda en todas las páginas
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        if (!window.ResourceDownloader && !document.querySelector('script[src*="resource-downloader.js"]')) {
            const resScript = document.createElement('script');
            resScript.src = resolveAssetUrl('js/core/resource-downloader.js');
            document.head.appendChild(resScript);
        }
    }

    class SoundManager {
        constructor() {
            this.bgmAudio = null;
            this.currentBgmKey = null;
            this.baseDuelBgmKey = null;
            this.isClimaxPlaying = false;
            this.masterVolume = 0.85;
            this.sfxVolume = 0.85;
            this.bgmVolume = 0.65;
            this.isMuted = false;
            this.isUnlocked = false;

            // Pistas de Música de Fondo (BGM) con estilo anime auténtico
            this.bgmTracks = {
                // Menús y Tienda
                login: 'assets/audio/bgm/bgm_login.wav',
                menu: 'assets/audio/bgm/bgm_menu.mp3',
                shop: 'assets/audio/bgm/bgm_shop.wav',
                events: 'assets/audio/bgm/bgm_events.wav',
                deck: 'assets/audio/bgm/bgm_deck_builder.mp3',
                profile: 'assets/audio/bgm/bgm_profile.mp3',

                // Duelos Estándar y Temáticos
                duel_standard: 'assets/audio/bgm/bgm_duel_standard.mp3',
                duel_joey_rock: 'assets/audio/bgm/bgm_duel_joey_rock.mp3',
                duel_yugi_roses: 'assets/audio/bgm/bgm_duel_yugi_roses.mp3',
                duel_marik_darkness: 'assets/audio/bgm/bgm_duel_marik_darkness.mp3',
                duel_zane_cyber: 'assets/audio/bgm/bgm_duel_zane_cyber.mp3',
                duel_turbo_synchro: 'assets/audio/bgm/bgm_duel_turbo_synchro.mp3',
                duel_kalin_rock: 'assets/audio/bgm/bgm_duel_kalin_rock.mp3',
                duel_speed_world: 'assets/audio/bgm/bgm_duel_speed_world.mp3',
                duel_boss_kaiba: 'assets/audio/bgm/bgm_duel_boss_kaiba.mp3',
                duel_legendary_gods: 'assets/audio/bgm/bgm_duel_legendary_gods.mp3',
                duel_finals: 'assets/audio/bgm/bgm_duel_tournament_finals.mp3',

                // Boss Themes Épicos Exclusivos por Era (12 Eras)
                duel_pegasus_toon: 'assets/audio/bgm/bgm_duel_pegasus_toon.wav',
                duel_virtual_noah: 'assets/audio/bgm/bgm_duel_virtual_noah.wav',
                duel_orichalcos_dartz: 'assets/audio/bgm/bgm_duel_orichalcos_dartz.wav',
                duel_zorc_egypt: 'assets/audio/bgm/bgm_duel_zorc_egypt.wav',
                duel_society_light: 'assets/audio/bgm/bgm_duel_society_light.wav',
                duel_supreme_king: 'assets/audio/bgm/bgm_duel_supreme_king.wav',
                duel_dark_signers: 'assets/audio/bgm/bgm_duel_dark_signers.wav',
                duel_zone_apocalypse: 'assets/audio/bgm/bgm_duel_zone_apocalypse.wav',

                // Momentos Críticos Dinámicos de Partida
                climax_advantage: 'assets/audio/bgm/bgm_climax_advantage.mp3',
                climax_disadvantage: 'assets/audio/bgm/bgm_climax_disadvantage.mp3',

                // Cierre de Duelo
                victory: 'assets/audio/bgm/bgm_victory.mp3',
                defeat: 'assets/audio/bgm/bgm_defeat.mp3'
            };

            // Efectos de Sonido Reales (SFX)
            this.sfxTracks = {
                duel_start: 'assets/audio/sfx/sfx_duel_start.wav',
                summon_normal: 'assets/audio/sfx/sfx_summon_normal.wav',
                summon_special: 'assets/audio/sfx/sfx_summon_special.wav',
                summon_fusion: 'assets/audio/sfx/sfx_fusion_summon.wav',
                summon_synchro: 'assets/audio/sfx/sfx_synchro_summon.wav',
                activate: 'assets/audio/sfx/sfx_card_activate.wav',
                set_card: 'assets/audio/sfx/sfx_card_set.wav',
                flip: 'assets/audio/sfx/sfx_card_flip.wav',
                attack: 'assets/audio/sfx/sfx_attack.wav',
                direct_attack: 'assets/audio/sfx/sfx_direct_attack.wav',
                damage: 'assets/audio/sfx/sfx_lp_damage.wav',
                heal: 'assets/audio/sfx/sfx_lp_heal.wav',
                destroy: 'assets/audio/sfx/sfx_card_destroy.wav',
                draw: 'assets/audio/sfx/sfx_card_draw.wav',
                shuffle: 'assets/audio/sfx/sfx_shuffle.wav',
                chain: 'assets/audio/sfx/sfx_chain.wav',
                turn_change: 'assets/audio/sfx/sfx_turn_change.wav',
                equip: 'assets/audio/sfx/sfx_equip.wav',
                banish: 'assets/audio/sfx/sfx_banish.wav',
                card_pick: 'assets/audio/sfx/sfx_card_pick.wav',
                card_drop: 'assets/audio/sfx/sfx_card_drop.wav',
                button: 'assets/audio/sfx/sfx_button.wav',
                ui_click: 'assets/audio/sfx/sfx_button.wav',
                coinflip: 'assets/audio/sfx/sfx_coinflip.wav',
                dice_roll: 'assets/audio/sfx/sfx_coinflip.wav',
                pack_open: 'assets/audio/sfx/sfx_pack_open.wav',
                shop_buy: 'assets/audio/sfx/sfx_shop_buy.wav',
                login_success: 'assets/audio/sfx/sfx_login_success.wav',
                login_hover: 'assets/audio/sfx/sfx_login_hover.wav',
                login_error: 'assets/audio/sfx/sfx_login_error.wav',
                boss_intro: 'assets/audio/sfx/sfx_boss_intro.wav',
                exodia_win: 'assets/audio/sfx/sfx_exodia_win.wav'
            };

            this.init();
        }

        init() {
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem('ad_audio_muted');
                    localStorage.removeItem('ad_bgm_volume');
                    localStorage.removeItem('ad_sfx_volume');
                }
                const savedMute = sessionStorage.getItem('ad_audio_muted');
                if (savedMute !== null) this.isMuted = (savedMute === 'true');

                const savedBgmVol = sessionStorage.getItem('ad_bgm_volume');
                if (savedBgmVol !== null) this.bgmVolume = parseFloat(savedBgmVol);

                const savedSfxVol = sessionStorage.getItem('ad_sfx_volume');
                if (savedSfxVol !== null) this.sfxVolume = parseFloat(savedSfxVol);
            } catch (e) {}

            this.setupUnlockOnInteraction();
        }

        /**
         * Desbloquea el audio en navegadores con políticas de autoplay estrictas
         */
        setupUnlockOnInteraction() {
            if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;

            const unlock = () => {
                this.isUnlocked = true;
                if (this.bgmAudio && this.bgmAudio.paused && !this.isMuted) {
                    this.bgmAudio.play().catch(() => {});
                }
            };

            ['click', 'touchstart', 'pointerdown', 'keydown'].forEach(evt => {
                window.addEventListener(evt, unlock, { capture: true });
            });
        }

        /**
         * Selecciona automáticamente la música adecuada para el NPC según su catálogo oficial y Era
         */
        getBgmForNpc(npcId, npcName = '') {
            const id = parseInt(npcId, 10) || 1;
            const name = (npcName || '').toLowerCase();

            // 1. Si existe en AdventureData, usar su BGM explícito si está definido
            let eraId = 1;
            let isBoss = false;
            if (window.AdventureData && typeof window.AdventureData.getNpcById === 'function') {
                const npc = window.AdventureData.getNpcById(id);
                if (npc) {
                    eraId = npc.eraId || eraId;
                    isBoss = !!npc.isBoss;
                    if (npc.bgm && this.bgmTracks[npc.bgm]) {
                        return npc.bgm;
                    }
                }
            }

            // 2. Mapeo específico por Jefes Legendarios de las 12 Eras (Canónicos 223 NPCs)
            if (name.includes('z-one') || name.includes('zone') || id === 223) return 'duel_zone_apocalypse';
            if (name.includes('rex goodwin') || name.includes('roman goodwin') || id === 202) return 'duel_dark_signers';
            if (name.includes('rey supremo') || name.includes('haou') || name.includes('yubel') || id === 184) return 'duel_supreme_king';
            if (name.includes('sartorius') || name.includes('saiou') || id === 159) return 'duel_society_light';
            if (name.includes('kagemaru') || id === 132) return 'duel_supreme_king';
            if (name.includes('zorc') || name.includes('bakura') || id === 107) return 'duel_zorc_egypt';
            if (name.includes('dartz') || name.includes('leviathan') || name.includes('orichalcos') || id === 90) return 'duel_orichalcos_dartz';
            if (name.includes('marik') || id === 46 || id === 73) return 'duel_marik_darkness';
            if (name.includes('noah') || name.includes('gozaburo') || id === 68 || id === 69) return 'duel_virtual_noah';
            if (name.includes('pegasus') || id === 23) return 'duel_pegasus_toon';
            if (name.includes('kaiba')) return 'duel_boss_kaiba';
            if (name.includes('atem') || name.includes('yugi')) return 'duel_yugi_roses';
            if (name.includes('paradox') || name.includes('aporia') || id === 221 || id === 222) return 'duel_speed_world';
            if (name.includes('kalin') || name.includes('kiryu') || id === 199) return 'duel_kalin_rock';
            if (name.includes('jack atlas') || name.includes('yusei') || name.includes('crow') || name.includes('bruno')) return 'duel_turbo_synchro';
            if (name.includes('zane') || name.includes('jaden') || name.includes('aster') || name.includes('chazz')) return 'duel_zane_cyber';
            if (name.includes('joey') || name.includes('jono')) return 'duel_joey_rock';

            // 3. Mapeo temático por Era de Aventura (1 al 12 canónicas con 223 duelistas)
            if (id <= 6) return 'duel_standard';                   // Era 1: Inicios en Domino (1-6)
            if (id <= 23) return 'duel_joey_rock';                 // Era 2: Reino de Duelistas (7-23)
            if (id <= 46) return 'duel_standard';                  // Era 3: Ciudad Batallas Preliminares (24-46)
            if (id <= 69) return 'duel_virtual_noah';              // Era 4: Dirigible Kaiba & Mundo Virtual (47-69)
            if (id <= 73) return 'duel_legendary_gods';            // Era 5: Torre KaibaCorp Finales (70-73)
            if (id <= 90) return 'duel_orichalcos_dartz';          // Era 6: El Despertar del Orichalcos (74-90)
            if (id <= 107) return 'duel_zorc_egypt';               // Era 7: Memorias del Faraón / Antiguo Egipto (91-107)
            if (id <= 132) return 'duel_zane_cyber';               // Era 8: Academia de Duelos Año 1 (108-132)
            if (id <= 159) return 'duel_society_light';            // Era 9: Sociedad de la Luz (133-159)
            if (id <= 184) return 'duel_supreme_king';             // Era 10: Dimensión Oscura & Rey Supremo (160-184)
            if (id <= 202) return 'duel_dark_signers';             // Era 11: Neo Domino & Portadores Oscuros (185-202)
            return 'duel_turbo_synchro';                           // Era 12: Grand Prix WRGP & Abismo Z-ONE (203-223)
        }

        playBGM(key, loop = true) {
            if (this.isMuted) return;
            const rawPath = this.bgmTracks[key] || key;
            if (!rawPath) return;

            const resolvedUrl = resolveAssetUrl(rawPath);

            // Si ya está sonando la misma pista, no reiniciar
            if (this.bgmAudio && this.currentBgmKey === key && !this.bgmAudio.paused) {
                return;
            }

            this.stopBGM();

            if (!key.startsWith('climax_')) {
                this.baseDuelBgmKey = key;
                this.isClimaxPlaying = false;
            }

            try {
                this.bgmAudio = new Audio(resolvedUrl);
                this.bgmAudio.loop = loop;
                this.bgmAudio.volume = Math.max(0, Math.min(1, this.bgmVolume * this.masterVolume));
                this.currentBgmKey = key;

                this.bgmAudio.onerror = () => {
                    this.bgmAudio = null;
                    this.currentBgmKey = null;
                };

                const playPromise = this.bgmAudio.play();
                if (playPromise !== undefined) {
                    playPromise.catch((err) => {
                        const resumeOnGesture = () => {
                            if (this.bgmAudio && this.bgmAudio.paused && !this.isMuted) {
                                this.bgmAudio.play().catch(() => {});
                            }
                        };
                        ['click', 'touchstart', 'pointerdown', 'keydown'].forEach(evt => {
                            window.addEventListener(evt, resumeOnGesture, { once: true, capture: true });
                        });
                    });
                }
            } catch (e) {
                this.bgmAudio = null;
                this.currentBgmKey = null;
            }
        }

        stopBGM() {
            if (this.bgmAudio) {
                try {
                    this.bgmAudio.pause();
                    this.bgmAudio.currentTime = 0;
                } catch (e) {}
                this.bgmAudio = null;
                this.currentBgmKey = null;
            }
        }

        /**
         * Control dinámico de música de clímax según los LP de ambos duelistas
         */
        checkDuelClimax(playerLp, rivalLp) {
            if (!this.baseDuelBgmKey || this.isMuted) return;

            const pLp = parseInt(playerLp, 10);
            const rLp = parseInt(rivalLp, 10);

            if (isNaN(pLp) || isNaN(rLp)) return;

            // Situación crítica: Jugador en peligro (LP <= 2000 y rival con más vida)
            if (pLp > 0 && pLp <= 2000 && rLp > pLp) {
                if (this.currentBgmKey !== 'climax_disadvantage') {
                    this.isClimaxPlaying = true;
                    this.playBGM('climax_disadvantage', true);
                }
            }
            // Situación de ventaja letal: Rival en peligro (LP <= 2000 y jugador con ventaja)
            else if (rLp > 0 && rLp <= 2000 && pLp > rLp) {
                if (this.currentBgmKey !== 'climax_advantage') {
                    this.isClimaxPlaying = true;
                    this.playBGM('climax_advantage', true);
                }
            }
            // Estado neutral o recuperado: Volver a la música base del NPC/Duelo
            else if (this.isClimaxPlaying) {
                this.isClimaxPlaying = false;
                if (this.baseDuelBgmKey && this.currentBgmKey !== this.baseDuelBgmKey) {
                    this.playBGM(this.baseDuelBgmKey, true);
                }
            }
        }

        playSFX(key) {
            if (this.isMuted) return;
            const rawPath = this.sfxTracks[key] || key;
            if (!rawPath) return;

            const resolvedUrl = resolveAssetUrl(rawPath);

            try {
                const audio = new Audio(resolvedUrl);
                audio.onerror = () => {};
                audio.volume = Math.max(0, Math.min(1, this.sfxVolume * this.masterVolume));
                const p = audio.play();
                if (p !== undefined) {
                    p.catch(() => {});
                }
            } catch (e) {
                // Silencio garantizado sin interrumpir jugabilidad
            }
        }

        setBgmVolume(vol) {
            this.bgmVolume = Math.max(0, Math.min(1, vol));
            if (this.bgmAudio) {
                this.bgmAudio.volume = this.bgmVolume * this.masterVolume;
            }
            try { sessionStorage.setItem('ad_bgm_volume', this.bgmVolume.toString()); } catch (e) {}
        }

        setSfxVolume(vol) {
            this.sfxVolume = Math.max(0, Math.min(1, vol));
            try { sessionStorage.setItem('ad_sfx_volume', this.sfxVolume.toString()); } catch (e) {}
        }

        setMuted(mute) {
            this.isMuted = !!mute;
            if (this.isMuted && this.bgmAudio) {
                this.bgmAudio.pause();
            } else if (!this.isMuted && this.bgmAudio) {
                this.bgmAudio.play().catch(() => {});
            }
            try { sessionStorage.setItem('ad_audio_muted', this.isMuted.toString()); } catch (e) {}
        }
    }

    const soundManagerInstance = new SoundManager();
    if (typeof window !== 'undefined') {
        window.SoundManager = soundManagerInstance;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = soundManagerInstance;
    }

})(typeof window !== 'undefined' ? window : global);


