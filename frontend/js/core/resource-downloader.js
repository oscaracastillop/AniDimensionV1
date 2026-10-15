/**
 * ============================================================================
 * ANI-DIMENSION: RESOURCE DOWNLOADER (GESTOR DE RECURSOS BAJO DEMANDA)
 * Descarga y almacenamiento en caché de sonidos (BGM y SFX) en el cliente.
 * Almacenamiento seguro en IndexedDB para funcionamiento sin conexión en APK y Web.
 * 
 * GARANTÍA DE JUEGO:
 * Los sonidos son 100% opcionales. No descargarlos NUNCA bloquea, congela ni
 * genera errores en la jugabilidad de duelos ni interfaces.
 * ============================================================================
 */

(function (window) {
    'use strict';

    const DB_NAME = 'AniDimensionAudioDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'audio_files';
    const MANIFEST_URL = '/api/audio/manifest';

    class ResourceDownloader {
        constructor() {
            this.db = null;
            this.blobCache = new Map(); // path -> blob:url
            this.isDownloading = false;
            this.abortController = null;
            this.manifest = null;
            this.status = {
                totalFiles: 75,
                downloadedFiles: 0,
                percent: 0,
                isComplete: false,
                downloadedBytes: 0,
                totalBytes: 0,
                hasAny: false
            };
            this._listeners = new Set();
            this.initPromise = this.init();
        }

        async init() {
            try {
                this.db = await this._openDB();
                await this.refreshStatus();
                // Precargar blob URLs en memoria para latencia 0 en SFX si ya están descargados
                if (this.status.downloadedFiles > 0) {
                    this.preloadCachedUrls().catch(() => {});
                }
            } catch (err) {
                console.warn('[ResourceDownloader] IndexedDB no disponible, operando en modo estándar:', err);
            }
            return this.status;
        }

        _openDB() {
            return new Promise((resolve, reject) => {
                if (!window.indexedDB) {
                    return reject(new Error('IndexedDB no soportado en este dispositivo'));
                }
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME, { keyPath: 'path' });
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        async fetchManifest() {
            if (this.manifest) return this.manifest;
            try {
                // Obtener URL absoluta para compatibilidad en APK/Capacitor
                let url = MANIFEST_URL;
                if (window.location && (window.location.protocol === 'file:' || !window.location.origin.startsWith('http'))) {
                    url = 'https://anidimension.online/api/audio/manifest';
                }
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (data && data.files) {
                    this.manifest = data;
                    return data;
                }
            } catch (e) {
                console.warn('[ResourceDownloader] Error obteniendo manifiesto de servidor:', e);
            }
            return null;
        }

        async refreshStatus() {
            if (!this.db) {
                this.status = {
                    totalFiles: 75,
                    downloadedFiles: 0,
                    percent: 0,
                    isComplete: false,
                    downloadedBytes: 0,
                    totalBytes: 0,
                    hasAny: false
                };
                return this.status;
            }

            try {
                const keys = await this._getAllKeys();
                const totalTarget = (this.manifest && this.manifest.totalFiles) ? this.manifest.totalFiles : 75;
                const downloadedCount = keys.length;
                const isComplete = downloadedCount >= totalTarget && totalTarget > 0;
                const percent = totalTarget > 0 ? Math.min(100, Math.round((downloadedCount / totalTarget) * 100)) : 0;

                this.status = {
                    totalFiles: totalTarget,
                    downloadedFiles: downloadedCount,
                    percent: percent,
                    isComplete: isComplete,
                    downloadedBytes: 0, // Se computa en descarga
                    totalBytes: this.manifest ? this.manifest.totalBytes : 0,
                    hasAny: downloadedCount > 0
                };
            } catch (e) {
                console.warn('[ResourceDownloader] Error al refrescar estado:', e);
            }
            this._notifyListeners();
            return this.status;
        }

        _getAllKeys() {
            return new Promise((resolve, reject) => {
                if (!this.db) return resolve([]);
                try {
                    const tx = this.db.transaction(STORE_NAME, 'readonly');
                    const store = tx.objectStore(STORE_NAME);
                    const req = store.getAllKeys();
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = () => reject(req.error);
                } catch (e) {
                    resolve([]);
                }
            });
        }

        /**
         * Precarga Blob URLs en memoria para que la reproducción sea instantánea
         */
        async preloadCachedUrls() {
            if (!this.db) return;
            try {
                const tx = this.db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.openCursor();

                req.onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        const { path, blob } = cursor.value;
                        if (path && blob && !this.blobCache.has(path)) {
                            try {
                                const url = URL.createObjectURL(blob);
                                this.blobCache.set(path, url);
                            } catch (err) {}
                        }
                        cursor.continue();
                    }
                };
            } catch (e) {}
        }

        /**
         * Obtiene la URL ejecutable para un archivo de sonido.
         * Si está descargado en IndexedDB, devuelve el Blob URL.
         * Si no, devuelve null (o permite fallback silenciado).
         */
        getAudioUrl(relativePath) {
            if (!relativePath) return null;
            const clean = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
            if (this.blobCache.has(clean)) {
                return this.blobCache.get(clean);
            }
            return null;
        }

        hasDownloadedSounds() {
            return this.status.hasAny;
        }

        /**
         * Descarga todos los recursos de audio con barra de progreso en tiempo real
         */
        async downloadAll({ onProgress, onComplete, onError } = {}) {
            if (this.isDownloading) return;
            this.isDownloading = true;
            this.abortController = new AbortController();

            try {
                if (!this.db) {
                    this.db = await this._openDB();
                }

                const manifest = await this.fetchManifest();
                if (!manifest || !manifest.files || manifest.files.length === 0) {
                    throw new Error('No se pudo obtener la lista de audios desde el servidor.');
                }

                const totalFiles = manifest.totalFiles;
                const totalBytes = manifest.totalBytes;
                let downloadedBytes = 0;
                let downloadedCount = 0;

                // Identificar qué archivos ya están guardados
                const existingKeys = new Set(await this._getAllKeys());

                // Sumar bytes de los que ya existen
                manifest.files.forEach(f => {
                    if (existingKeys.has(f.path)) {
                        downloadedBytes += f.size || 0;
                        downloadedCount++;
                    }
                });

                // Reporte inicial de progreso
                const initialPercent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
                if (typeof onProgress === 'function') {
                    onProgress({
                        percent: initialPercent,
                        downloadedFiles: downloadedCount,
                        totalFiles: totalFiles,
                        downloadedBytes: downloadedBytes,
                        totalBytes: totalBytes,
                        currentFile: 'Verificando archivos...',
                        currentType: 'INFO'
                    });
                }

                // Determinar URL base para descargas
                let baseServerUrl = '';
                if (window.location && (window.location.protocol === 'file:' || !window.location.origin.startsWith('http'))) {
                    baseServerUrl = 'https://anidimension.online/';
                }

                // Descargar archivos pendientes
                for (const fileInfo of manifest.files) {
                    if (this.abortController.signal.aborted) {
                        break;
                    }

                    if (existingKeys.has(fileInfo.path)) {
                        continue;
                    }

                    const targetUrl = (baseServerUrl ? baseServerUrl : '/') + fileInfo.path;

                    if (typeof onProgress === 'function') {
                        onProgress({
                            percent: totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0,
                            downloadedFiles: downloadedCount,
                            totalFiles: totalFiles,
                            downloadedBytes: downloadedBytes,
                            totalBytes: totalBytes,
                            currentFile: fileInfo.name,
                            currentType: fileInfo.type ? fileInfo.type.toUpperCase() : 'AUDIO'
                        });
                    }

                    try {
                        const response = await fetch(targetUrl, {
                            signal: this.abortController.signal
                        });

                        if (!response.ok) {
                            console.warn(`[ResourceDownloader] Saltando archivo inaccesible: ${fileInfo.path} (${response.status})`);
                            downloadedBytes += (fileInfo.size || 0);
                            downloadedCount++;
                            continue;
                        }

                        const blob = await response.blob();
                        await this._saveFileBlob(fileInfo.path, blob, fileInfo);

                        // Crear blob URL en caché local
                        try {
                            const blobUrl = URL.createObjectURL(blob);
                            this.blobCache.set(fileInfo.path, blobUrl);
                        } catch (e) {}

                        downloadedBytes += (fileInfo.size || blob.size || 0);
                        downloadedCount++;

                        const currentPercent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
                        if (typeof onProgress === 'function') {
                            onProgress({
                                percent: currentPercent,
                                downloadedFiles: downloadedCount,
                                totalFiles: totalFiles,
                                downloadedBytes: downloadedBytes,
                                totalBytes: totalBytes,
                                currentFile: fileInfo.name,
                                currentType: fileInfo.type ? fileInfo.type.toUpperCase() : 'AUDIO'
                            });
                        }
                    } catch (fetchErr) {
                        if (this.abortController.signal.aborted) throw fetchErr;
                        console.warn(`[ResourceDownloader] Error descargando ${fileInfo.name}:`, fetchErr.message);
                        // No romper el flujo completo por 1 archivo; continuar con los demás
                        downloadedBytes += (fileInfo.size || 0);
                        downloadedCount++;
                    }
                }

                await this.refreshStatus();

                if (!this.abortController.signal.aborted) {
                    if (typeof onProgress === 'function') {
                        onProgress({
                            percent: 100,
                            downloadedFiles: totalFiles,
                            totalFiles: totalFiles,
                            downloadedBytes: totalBytes,
                            totalBytes: totalBytes,
                            currentFile: '¡Descarga completa!',
                            currentType: 'COMPLETO'
                        });
                    }
                    if (typeof onComplete === 'function') {
                        onComplete(this.status);
                    }
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('[ResourceDownloader] Error en descarga:', err);
                    if (typeof onError === 'function') onError(err);
                }
            } finally {
                this.isDownloading = false;
                this.abortController = null;
            }
        }

        _saveFileBlob(filePath, blob, meta = {}) {
            return new Promise((resolve, reject) => {
                if (!this.db) return resolve();
                try {
                    const tx = this.db.transaction(STORE_NAME, 'readwrite');
                    const store = tx.objectStore(STORE_NAME);
                    const record = {
                        path: filePath,
                        blob: blob,
                        size: blob.size,
                        type: meta.type || 'audio',
                        savedAt: Date.now()
                    };
                    store.put(record);
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => reject(tx.error);
                } catch (e) {
                    reject(e);
                }
            });
        }

        cancelDownload() {
            if (this.abortController) {
                this.abortController.abort();
            }
            this.isDownloading = false;
        }

        /**
         * Elimina todos los sonidos descargados de la memoria y el almacenamiento
         * para liberar espacio en el dispositivo del usuario.
         */
        async clearAudioStorage() {
            this.cancelDownload();
            // Revocar Blob URLs
            for (const [k, url] of this.blobCache.entries()) {
                try { URL.revokeObjectURL(url); } catch (e) {}
            }
            this.blobCache.clear();

            if (this.db) {
                await new Promise((resolve) => {
                    try {
                        const tx = this.db.transaction(STORE_NAME, 'readwrite');
                        const store = tx.objectStore(STORE_NAME);
                        store.clear();
                        tx.oncomplete = () => resolve();
                        tx.onerror = () => resolve();
                    } catch (e) {
                        resolve();
                    }
                });
            }

            await this.refreshStatus();
            return true;
        }

        subscribe(listener) {
            this._listeners.add(listener);
            return () => this._listeners.delete(listener);
        }

        _notifyListeners() {
            this._listeners.forEach(fn => {
                try { fn(this.status); } catch (e) {}
            });
        }
    }

    const instance = new ResourceDownloader();
    if (typeof window !== 'undefined') {
        window.ResourceDownloader = instance;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = instance;
    }

})(typeof window !== 'undefined' ? window : global);
