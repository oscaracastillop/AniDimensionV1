/**
 * Ani-Dimension: Controlador de la Vista de Registro
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
    // Iniciar música en bucle
    if (window.SoundManager) {
        window.SoundManager.playBGM('login', true);
    }
    // Si ya está autenticado, redirigir al Lobby
    if (window.Session && window.Session.isLoggedIn()) {
        window.location.href = '../lobby/lobby.html';
        return;
    }

    loadCountries();

    // Efectos hover en inputs y botones
    document.querySelectorAll('.auth-input, .btn-act-vertical, .auth-toggle-link').forEach(el => {
        el.addEventListener('mouseenter', () => {
            if (window.SoundManager) window.SoundManager.playSFX('login_hover');
        });
    });
});

function showRegisterAlert(message, isError = true) {
    const alertBox = document.getElementById('register-alert-box');
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

async function loadCountries() {
    const select = document.getElementById('regCountryInput');
    if (!select) return;

    try {
        let response = await fetch('/api/countries');
        if (!response.ok) {
            response = await fetch('/api/admin/countries');
        }
        if (response.ok) {
            const data = await response.json();
            const list = data.countries || (Array.isArray(data) ? data : []);
            select.innerHTML = '<option value="">-- Selecciona tu país --</option>';
            list.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.IsoCode || c.isoCode || c.country_id || c.id;
                opt.textContent = `${c.FlagEmoji || c.flag_emoji || '🌐'} ${c.Name || c.name} (${c.IsoCode || ''})`;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.warn('[COUNTRIES] Error al cargar catálogo de países:', e);
        select.innerHTML = '<option value="CO">🇨🇴 Colombia (CO)</option><option value="MX">🇲🇽 México (MX)</option>';
    }
}

async function performRegister() {
    const userIn = document.getElementById('regUsernameInput');
    const emailIn = document.getElementById('regEmailInput');
    const passIn = document.getElementById('regPasswordInput');
    const countryIn = document.getElementById('regCountryInput');
    const btn = document.getElementById('btn-register-submit');

    const username = userIn ? userIn.value.trim() : '';
    const email = emailIn ? emailIn.value.trim() : '';
    const password = passIn ? passIn.value : '';
    const countryIsoCode = (countryIn && countryIn.value ? countryIn.value.trim().toUpperCase() : 'CO');

    if (!username || !email || !password) {
        showRegisterAlert('Todos los campos son obligatorios.');
        return;
    }

    if (username.length < 3 || username.length > 15) {
        showRegisterAlert('El nick debe tener entre 3 y 15 caracteres.');
        return;
    }

    if (/\s/.test(username)) {
        showRegisterAlert('El nick debe ser de una sola palabra sin espacios.');
        return;
    }

    if (password.length < 6) {
        showRegisterAlert('La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'CREANDO CUENTA...';
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                email,
                password,
                countryIsoCode: countryIsoCode
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showRegisterAlert(data.message || '¡Cuenta creada con éxito! Redirigiendo al login...', false);
            setTimeout(() => {
                window.location.href = '../login/login.html';
            }, 1200);
        } else {
            showRegisterAlert(data.message || data.error || 'No se pudo crear la cuenta.');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'CREAR CUENTA';
            }
        }
    } catch (err) {
        console.error('[REGISTER ERROR]', err);
        showRegisterAlert('Error de conexión con el servidor. Inténtalo de nuevo.');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'CREAR CUENTA';
        }
    }
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

window.performRegister = performRegister;
window.openCreditsModal = openCreditsModal;
window.closeCreditsModal = closeCreditsModal;

