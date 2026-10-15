/**
 * ANI-DIMENSION: GESTOR DE AUDIO REDIRIGIDO A CORE SOUND MANAGER
 */
(function(window) {
    if (window.SoundManager && window.SoundManager.bgmTracks) {
        return; // Ya está cargada la versión moderna
    }
    // Si aún no está cargada, cargar dinámicamente o delegar
    const script = document.createElement('script');
    script.src = window.location.pathname.includes('/views/') 
        ? '../../../js/core/sound-manager.js'
        : '/js/core/sound-manager.js';
    document.head.appendChild(script);
})(window);

