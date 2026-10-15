/**
 * ANI-DIMENSION: GESTIÓN DE PAQUETES DE RECARGA DE STARSHIPS ($ USD)
 * SINGLE SOURCE OF TRUTH PARA RECARGAS DE DIVISAS
 */
(function (window) {
    let _cachedPackages = [];
    let _syncPromise = null;

    async function syncFromServer(force = false) {
        if (_syncPromise && !force) return _syncPromise;
        _syncPromise = (async () => {
            try {
                const res = await fetch('/api/game/shop/estrellas');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.success && Array.isArray(data.packages) && data.packages.length > 0) {
                        _cachedPackages = data.packages;
                        return _cachedPackages;
                    }
                }
            } catch (e) {
                console.warn('[EstrellasData] Error consultando paquetes desde SQL Server:', e.message);
            }
            return _cachedPackages;
        })();
        return _syncPromise;
    }

    // Sincronización inmediata
    syncFromServer();

    const EstrellasData = {
        packages: _cachedPackages,
        syncFromServer: syncFromServer,
        getPackages: function () {
            return _cachedPackages;
        },
        savePackages: function (packages) {
            _cachedPackages = packages;
            this.packages = packages;
        }
    };

    window.EstrellasData = EstrellasData;
})(window);
