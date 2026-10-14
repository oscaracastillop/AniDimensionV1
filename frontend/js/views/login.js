/**
 * Ani-Dimension: Controlador de la Vista de Login
 */

async function enforceLandscapeOrientation() {
    try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.ScreenOrientation) {
            await window.Capacitor.Plugins.ScreenOrientation.lock({ orientation: 'landscape' });
        } else if (screen.orientation && typeof screen.orientation.lock === 'function') {
            await screen.orientation.lock('landscape');
        }
    } catch (e) {
        // En navegadores de escritorio sin permisos de orientación no interfiere
    }
}

document.addEventListener('DOMContentLoaded', () => {
    enforceLandscapeOrientation();
    // Iniciar música en bucle de Login
    if (window.SoundManager) {
        window.SoundManager.playBGM('login', true);
    }
    // Si ya está autenticado, redirigir al Lobby
    if (window.Session && window.Session.isLoggedIn()) {
        window.location.href = '../lobby/lobby.html';
    }

    // Efectos hover en inputs y botones
    document.querySelectorAll('.auth-input, .btn-act-vertical, .auth-toggle-link').forEach(el => {
        el.addEventListener('mouseenter', () => {
            if (window.SoundManager) window.SoundManager.playSFX('login_hover');
        });
    });
});

function showAuthAlert(message, isError = true) {
    const alertBox = document.getElementById('login-alert-box');
    if (!alertBox) return;

    alertBox.textContent = message;
    alertBox.style.display = 'block';

    if (isError) {
        if (window.SoundManager) window.SoundManager.playSFX('login_error');
        alertBox.style.background = 'rgba(255, 71, 87, 0.15)';
        alertBox.style.border = '1px solid #ff4757';
        alertBox.style.color = '#ff6b81';
    } else {
        alertBox.style.background = 'rgba(46, 213, 115, 0.15)';
        alertBox.style.border = '1px solid #2ed573';
        alertBox.style.color = '#7bed9f';
    }
}

async function performLogin() {
    if (window.SoundManager) window.SoundManager.playSFX('button');
    const userIn = document.getElementById('usernameInput');
    const passIn = document.getElementById('passwordInput');
    const btn = document.getElementById('btn-login-submit');

    const username = userIn ? userIn.value.trim() : '';
    const password = passIn ? passIn.value : '';

    if (!username || !password) {
        showAuthAlert('Por favor, ingresa tu usuario y contraseña.');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'AUTENTICANDO...';
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.user) {
            if (window.SoundManager) window.SoundManager.playSFX('login_success');
            showAuthAlert('¡Bienvenido, ' + data.user.username + '! Accediendo...', false);

            if (window.Session) {
                window.Session.saveUser(data.user);
            }

            setTimeout(() => {
                window.location.href = '../lobby/lobby.html';
            }, 600);
        } else {
            const errorMsg = data.message || data.error || 'Credenciales inválidas. Verifica tus datos.';
            showAuthAlert(errorMsg, true);

            // Si hay sesión activa en otro dispositivo, sugerir desbloqueo
            if (data.sessionActive) {
                setTimeout(() => {
                    const forceModal = document.getElementById('force-logout-modal');
                    if (forceModal && forceModal.style.display !== 'flex') {
                        openForceLogoutModal(username);
                    }
                }, 1200);
            }

            if (btn) {
                btn.disabled = false;
                btn.textContent = 'ENTRAR A LA DIMENSIÓN';
            }
        }
    } catch (err) {
        console.error('[LOGIN ERROR]', err);
        showAuthAlert('Error de conexión con el servidor. Inténtalo de nuevo.');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'ENTRAR A LA DIMENSIÓN';
        }
    }
}

function openForceLogoutModal(defaultUsername = '') {
    const modal = document.getElementById('force-logout-modal');
    if (!modal) return;

    const userInput = document.getElementById('forceUsernameInput');
    const passInput = document.getElementById('forcePasswordInput');
    const alertBox = document.getElementById('force-logout-alert');

    if (alertBox) alertBox.style.display = 'none';
    if (userInput) {
        const mainUser = document.getElementById('usernameInput');
        userInput.value = defaultUsername || (mainUser ? mainUser.value.trim() : '');
    }
    if (passInput) passInput.value = '';

    modal.style.display = 'flex';
}

function closeForceLogoutModal() {
    const modal = document.getElementById('force-logout-modal');
    if (modal) modal.style.display = 'none';
}

function showForceLogoutAlert(message, isError = true) {
    const alertBox = document.getElementById('force-logout-alert');
    if (!alertBox) return;

    alertBox.textContent = message;
    alertBox.style.display = 'block';

    if (isError) {
        alertBox.style.background = 'rgba(255, 71, 87, 0.15)';
        alertBox.style.border = '1px solid #ff4757';
        alertBox.style.color = '#ff6b81';
    } else {
        alertBox.style.background = 'rgba(46, 213, 115, 0.15)';
        alertBox.style.border = '1px solid #2ed573';
        alertBox.style.color = '#7bed9f';
    }
}

async function performForceLogout() {
    const userInput = document.getElementById('forceUsernameInput');
    const passInput = document.getElementById('forcePasswordInput');
    const btn = document.getElementById('btn-force-logout-submit');

    const username = userInput ? userInput.value.trim() : '';
    const password = passInput ? passInput.value : '';

    if (!username || !password) {
        showForceLogoutAlert('Por favor ingresa usuario y contraseña para desbloquear.');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'PROCESANDO...';
    }

    try {
        const response = await fetch('/api/auth/force-logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showForceLogoutAlert(data.message || 'Sesión remota cerrada.', false);

            // Prellenar en formulario principal de login
            const mainUser = document.getElementById('usernameInput');
            const mainPass = document.getElementById('passwordInput');
            if (mainUser) mainUser.value = username;
            if (mainPass) mainPass.value = password;

            setTimeout(() => {
                closeForceLogoutModal();
                showAuthAlert('Cuenta desbloqueada. Ya puedes iniciar sesión.', false);
            }, 1000);
        } else {
            showForceLogoutAlert(data.message || 'Error al desbloquear sesión remota.', true);
        }
    } catch (e) {
        console.error('[FORCE LOGOUT ERROR]', e);
        showForceLogoutAlert('Error de conexión con el servidor.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'DESBLOQUEAR';
        }
    }
}

// ==============================================================================
// GESTOR DE RECURSOS DE AUDIO BAJO DEMANDA (BGM + SFX)
// ==============================================================================

async function updateResourceUiStatus(status) {
    const pill = document.getElementById('login-resource-pill');
    const badge = document.getElementById('resource-modal-badge');
    const percentTxt = document.getElementById('resource-percent-txt');
    const filesTxt = document.getElementById('resource-files-txt');
    const mbTxt = document.getElementById('resource-mb-txt');
    const bar = document.getElementById('resource-progress-bar');
    const btnDownload = document.getElementById('btn-start-download-res');

    if (!status) {
        if (window.ResourceDownloader) {
            status = await window.ResourceDownloader.refreshStatus();
        } else {
            return;
        }
    }

    if (pill) {
        if (status.isComplete) {
            pill.innerHTML = '🟢 LISTO';
            pill.style.borderColor = '#10b981';
            pill.style.color = '#34d399';
        } else if (status.hasAny) {
            pill.innerHTML = `🟡 ${status.percent}%`;
            pill.style.borderColor = '#eab308';
            pill.style.color = '#fde047';
        } else {
            pill.innerHTML = '⚪ OPCIONAL';
            pill.style.borderColor = '#64748b';
            pill.style.color = '#94a3b8';
        }
    }

    if (badge) {
        if (status.isComplete) {
            badge.className = 'resource-status-badge badge-ready';
            badge.innerText = 'DESCARGADO (100%)';
        } else if (status.hasAny) {
            badge.className = 'resource-status-badge badge-empty';
            badge.innerText = `PARCIAL (${status.percent}%)`;
        } else {
            badge.className = 'resource-status-badge badge-empty';
            badge.innerText = 'NO DESCARGADO';
        }
    }

    if (percentTxt) percentTxt.innerText = `${status.percent || 0}%`;
    if (bar) bar.style.width = `${status.percent || 0}%`;
    if (filesTxt) filesTxt.innerText = `${status.downloadedFiles || 0} / ${status.totalFiles || 75}`;
    
    if (mbTxt) {
        const totalMb = status.totalBytes ? (status.totalBytes / (1024 * 1024)).toFixed(1) : '124.4';
        const currentMb = status.downloadedBytes ? (status.downloadedBytes / (1024 * 1024)).toFixed(1) : (status.percent ? ((124.4 * status.percent) / 100).toFixed(1) : '0.0');
        mbTxt.innerText = `${currentMb} MB / ${totalMb} MB`;
    }

    if (btnDownload) {
        if (status.isComplete) {
            btnDownload.innerText = '✅ SONIDOS DESCARGADOS';
            btnDownload.style.background = 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(6,78,59,0.6))';
            btnDownload.style.borderColor = '#10b981';
        } else if (status.hasAny) {
            btnDownload.innerText = '🔄 CONTINUAR DESCARGA';
            btnDownload.style.background = 'linear-gradient(135deg, rgba(0,240,255,0.35), rgba(2,132,199,0.6))';
            btnDownload.style.borderColor = '#00f0ff';
        } else {
            btnDownload.innerText = '📥 DESCARGAR SONIDOS';
            btnDownload.style.background = 'linear-gradient(135deg, rgba(0,240,255,0.35), rgba(2,132,199,0.6))';
            btnDownload.style.borderColor = '#00f0ff';
        }
    }
}

async function openResourceModal() {
    if (window.SoundManager) window.SoundManager.playSFX('button');
    const modal = document.getElementById('resource-modal');
    if (!modal) return;

    modal.style.display = 'flex';
    if (window.ResourceDownloader) {
        const status = await window.ResourceDownloader.refreshStatus();
        updateResourceUiStatus(status);
    }
}

function closeResourceModal() {
    const modal = document.getElementById('resource-modal');
    if (modal) modal.style.display = 'none';
}

async function startResourceDownload() {
    if (!window.ResourceDownloader) return;
    if (window.SoundManager) window.SoundManager.playSFX('button');

    const btnStart = document.getElementById('btn-start-download-res');
    const btnCancel = document.getElementById('btn-cancel-download-res');
    const badge = document.getElementById('resource-modal-badge');
    const currentFileTxt = document.getElementById('resource-current-file-txt');
    const bar = document.getElementById('resource-progress-bar');
    const percentTxt = document.getElementById('resource-percent-txt');
    const filesTxt = document.getElementById('resource-files-txt');
    const mbTxt = document.getElementById('resource-mb-txt');

    if (btnStart) {
        btnStart.disabled = true;
        btnStart.innerText = '⏳ DESCARGANDO...';
    }
    if (btnCancel) btnCancel.style.display = 'inline-block';
    if (badge) {
        badge.className = 'resource-status-badge badge-downloading';
        badge.innerText = 'DESCARGANDO...';
    }

    await window.ResourceDownloader.downloadAll({
        onProgress: (prog) => {
            if (bar) bar.style.width = `${prog.percent}%`;
            if (percentTxt) percentTxt.innerText = `${prog.percent}%`;
            if (filesTxt) filesTxt.innerText = `${prog.downloadedFiles} / ${prog.totalFiles}`;
            if (mbTxt) {
                const curMb = (prog.downloadedBytes / (1024 * 1024)).toFixed(1);
                const totMb = (prog.totalBytes / (1024 * 1024)).toFixed(1);
                mbTxt.innerText = `${curMb} MB / ${totMb} MB`;
            }
            if (currentFileTxt) {
                currentFileTxt.innerText = `Descargando [${prog.currentType}]: ${prog.currentFile}`;
            }
        },
        onComplete: (status) => {
            if (btnStart) {
                btnStart.disabled = false;
                btnStart.innerText = '✅ DESCARGA COMPLETA';
            }
            if (btnCancel) btnCancel.style.display = 'none';
            if (currentFileTxt) {
                currentFileTxt.innerText = '¡Todos los sonidos se han instalado correctamente!';
                currentFileTxt.style.color = '#34d399';
            }
            updateResourceUiStatus(status);
            // Intentar reproducir música de login si no estaba sonando
            if (window.SoundManager) {
                window.SoundManager.playSFX('login_success');
                window.SoundManager.playBGM('login', true);
            }
        },
        onError: (err) => {
            if (btnStart) {
                btnStart.disabled = false;
                btnStart.innerText = 'REINTENTAR DESCARGA';
            }
            if (btnCancel) btnCancel.style.display = 'none';
            if (currentFileTxt) {
                currentFileTxt.innerText = `Error: ${err.message || 'No se pudo completar la descarga'}`;
                currentFileTxt.style.color = '#f87171';
            }
        }
    });

    if (btnStart && !window.ResourceDownloader.isDownloading) {
        btnStart.disabled = false;
    }
    if (btnCancel) btnCancel.style.display = 'none';
}

function cancelResourceDownload() {
    if (window.ResourceDownloader) {
        window.ResourceDownloader.cancelDownload();
    }
    const btnStart = document.getElementById('btn-start-download-res');
    const btnCancel = document.getElementById('btn-cancel-download-res');
    const currentFileTxt = document.getElementById('resource-current-file-txt');
    
    if (btnStart) {
        btnStart.disabled = false;
        btnStart.innerText = 'REANUDAR DESCARGA';
    }
    if (btnCancel) btnCancel.style.display = 'none';
    if (currentFileTxt) {
        currentFileTxt.innerText = 'Descarga pausada por el usuario.';
        currentFileTxt.style.color = '#facc15';
    }
    updateResourceUiStatus();
}

async function clearDownloadedResources() {
    if (!window.ResourceDownloader) return;
    const confirmClear = confirm('¿Deseas eliminar los sonidos descargados del almacenamiento de tu dispositivo para liberar ~124 MB? Podrás descargarlos nuevamente cuando quieras.');
    if (!confirmClear) return;

    if (window.SoundManager) {
        window.SoundManager.stopBGM();
    }

    await window.ResourceDownloader.clearAudioStorage();
    const currentFileTxt = document.getElementById('resource-current-file-txt');
    if (currentFileTxt) {
        currentFileTxt.innerText = 'Almacenamiento liberado con éxito. Sonidos eliminados.';
        currentFileTxt.style.color = '#94a3b8';
    }
    updateResourceUiStatus();
}

// Inicializar listener de estado en login
if (window.ResourceDownloader) {
    window.ResourceDownloader.initPromise.then((st) => {
        updateResourceUiStatus(st);
    });
}

// Control del Modal de Créditos Oficiales (Oscar Castillo)
function openCreditsModal() {
    if (window.SoundManager) window.SoundManager.playSFX('button');
    const modal = document.getElementById('credits-modal');
    if (modal) modal.style.display = 'flex';
}

function closeCreditsModal() {
    if (window.SoundManager) window.SoundManager.playSFX('button');
    const modal = document.getElementById('credits-modal');
    if (modal) modal.style.display = 'none';
}

window.performLogin = performLogin;
window.openForceLogoutModal = openForceLogoutModal;
window.closeForceLogoutModal = closeForceLogoutModal;
window.performForceLogout = performForceLogout;
window.openResourceModal = openResourceModal;
window.closeResourceModal = closeResourceModal;
window.startResourceDownload = startResourceDownload;
window.cancelResourceDownload = cancelResourceDownload;
window.clearDownloadedResources = clearDownloadedResources;
window.openCreditsModal = openCreditsModal;
window.closeCreditsModal = closeCreditsModal;


