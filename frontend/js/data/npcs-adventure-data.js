/**
 * ============================================================================
 * ANI-DIMENSION: 12 ERAS DEL ANIME OFICIALES (125 DUELISTAS & 125 MEDALLAS)
 * 100% RESPALDADO EN SQL SERVER (dbo.AdventureEras, dbo.NPCs, dbo.NpcDeckCards, dbo.AdventureMedals)
 * CERO CONFIGURACIONES NI MAZOS HARDCODEADOS EN ARCHIVOS JS
 * ============================================================================
 */

(function(exports) {
    'use strict';

    let ERAS_DATA = [];
    let NPCS_DATA = [];
    let MEDALS_DATA = [];
    let _syncPromise = null;

    /**
     * Sincroniza catálogo completo de Aventura directamente desde SQL Server
     */
    function syncFromServer() {
        if (_syncPromise) return _syncPromise;

        if (typeof fetch !== 'undefined') {
            _syncPromise = fetch('/api/adventure/catalog')
                .then(res => res.json())
                .then(data => {
                    if (data && data.success) {
                        ERAS_DATA = data.eras || [];
                        NPCS_DATA = data.npcs || [];
                        MEDALS_DATA = data.medals || [];
                        exports.ERAS = ERAS_DATA;
                        exports.NPCS = NPCS_DATA;
                        exports.MEDALS = MEDALS_DATA;

                        if (typeof window !== 'undefined') {
                            if (window.AdventureMap && typeof window.AdventureMap.renderErasCarousel === 'function') {
                                window.AdventureMap.renderErasCarousel();
                                window.AdventureMap.renderEraMap(window.AdventureMap.activeEraId || 1);
                            }
                            if (typeof window.renderHeaderStats === 'function') {
                                window.renderHeaderStats();
                            }
                            if (typeof window.renderChapterTabs === 'function') {
                                window.renderChapterTabs();
                            }
                            if (typeof window.renderNpcsList === 'function') {
                                window.renderNpcsList();
                            }
                        }
                    }
                })
                .catch(err => {
                    console.warn('[ADVENTURE SQL SYNC NOTICE]', err.message);
                });
        }
        return _syncPromise;
    }

    function getNpcById(id) {
        const npcId = parseInt(id, 10);
        return NPCS_DATA.find(n => (n.id === npcId || n.Id === npcId)) || null;
    }

    function getNpcsByEra(eraId) {
        const eid = parseInt(eraId, 10);
        return NPCS_DATA.filter(n => (n.eraId === eid || n.EraId === eid));
    }

    function getNpcsByChapter(chapterNum) {
        return getNpcsByEra(chapterNum);
    }

    function getEraById(eraId) {
        const eid = parseInt(eraId, 10);
        return ERAS_DATA.find(e => (e.id === eid || e.Id === eid)) || null;
    }

    function getMedalByNpcId(npcId) {
        const id = parseInt(npcId, 10);
        return MEDALS_DATA.find(m => m.NpcId === id || m.npcId === id) || null;
    }

    function getMedalById(medalId) {
        return MEDALS_DATA.find(m => m.id === medalId || m.MedalCode === medalId || m.Id === medalId) || null;
    }

    exports.ERAS = ERAS_DATA;
    exports.NPCS = NPCS_DATA;
    exports.MEDALS = MEDALS_DATA;
    exports.getNpcById = getNpcById;
    exports.getNpcsByEra = getNpcsByEra;
    exports.getNpcsByChapter = getNpcsByChapter;
    exports.getEraById = getEraById;
    exports.getMedalByNpcId = getMedalByNpcId;
    exports.getMedalById = getMedalById;
    exports.syncFromServer = syncFromServer;

    // Iniciar sincronización automática en navegadores
    if (typeof window !== 'undefined') {
        syncFromServer();
    }

})(typeof module !== 'undefined' && module.exports ? module.exports : (window.AdventureData = {}));
