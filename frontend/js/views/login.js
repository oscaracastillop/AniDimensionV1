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
    // Si ya está autenticado, redirigir al Lobby
    if (window.Session && window.Session.isLoggedIn()) {
        window.location.href = '../lobby/lobby.html';
    }
});

function showAuthAlert(message, isError = true) {
    const alertBox = document.getElementById('login-alert-box');
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

async function performLogin() {
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
            showAuthAlert('¡Bienvenido, ' + data.user.username + '! Accediendo...', false);

            if (window.Session) {
                window.Session.saveUser(data.user);
            }

            setTimeout(() => {
                window.location.href = '../lobby/lobby.html';
            }, 600);
        } else {
            showAuthAlert(data.error || 'Credenciales inválidas. Verifica tus datos.');
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

window.performLogin = performLogin;
