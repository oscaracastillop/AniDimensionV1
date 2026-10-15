/**
 * Ani-Dimension: Controlador de la Vista Dedicada de Edición de Duelistas (Admin)
 * Manejo de Avatar Activo (Default AVA-002), Parámetros de Cuenta y Gestión Integral de Baneo
 */

let currentEditingUserId = null;
let currentLoadedUser = null;
let allCountriesList = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (window.Session && !window.Session.requireAuth('/views/login/login.html')) {
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    currentEditingUserId = urlParams.get('id');

    if (!currentEditingUserId) {
        showDetailAlert('ID de duelista no proporcionado en la URL.', true);
        return;
    }

    await loadCountriesCatalog();
    await loadUserDetail(currentEditingUserId);
});

async function loadCountriesCatalog() {
    try {
        const res = await fetch('/api/admin/countries');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.countries) {
            allCountriesList = data.countries;
            const select = document.getElementById('detail-user-country');
            if (select) {
                select.innerHTML = `<option value="">-- Seleccionar País --</option>` + allCountriesList.map(c => `
                    <option value="${c.IsoCode}">
                        ${c.FlagEmoji || '🌐'} ${c.Name} (${c.IsoCode})
                    </option>
                `).join('');
            }
        }
    } catch (e) {
        console.error('[ADMIN DETAIL COUNTRIES ERROR]', e);
    }
}

async function loadUserDetail(userId) {
    try {
        const user = window.Session ? window.Session.getUser() : null;
        const uid = user ? (user.id || user.user_id || user.Id) : null;
        const headers = uid ? { 'x-user-id': String(uid), 'x-admin-username': user.username || '' } : {};

        const res = await fetch(`/api/admin/users/${userId}`, { headers });
        if (!res.ok) throw new Error('No se pudo encontrar el usuario especificado.');
        const data = await res.json();

        if (data.success && data.user) {
            currentLoadedUser = data.user;
            populateFormFields(currentLoadedUser);
            updateLivePreview();
        } else {
            throw new Error(data.message || 'Error al obtener datos del usuario.');
        }
    } catch (e) {
        console.error('[LOAD USER DETAIL ERROR]', e);
        showDetailAlert(`❌ ${e.message}`, true);
    }
}

function populateFormFields(user) {
    document.getElementById('detail-user-id-badge').textContent = `ID: #${user.Id}`;
    document.getElementById('admin-user-detail-title').textContent = `EDICIÓN DE DUELISTA: ${user.Username}`;

    const uInput = document.getElementById('detail-user-username');
    const eInput = document.getElementById('detail-user-email');
    const pInput = document.getElementById('detail-user-password');
    const cSelect = document.getElementById('detail-user-country');
    const avInput = document.getElementById('detail-user-avatar');
    const sInput = document.getElementById('detail-user-starships');
    const nInput = document.getElementById('detail-user-nivel');
    const aSelect = document.getElementById('detail-user-isadmin');
    const actSelect = document.getElementById('detail-user-isactive');

    if (uInput) uInput.value = user.Username || '';
    if (eInput) eInput.value = user.Email || '';
    if (pInput) pInput.value = '';
    if (cSelect) cSelect.value = user.CountryIsoCode || 'CO';
    if (avInput) avInput.value = user.AvatarActivoId || 'AVA-002';
    if (sInput) sInput.value = user.Starships !== undefined ? user.Starships : 5000;
    if (nInput) nInput.value = user.Nivel || 1;
    if (aSelect) aSelect.value = user.IsAdmin ? '1' : '0';
    if (actSelect) actSelect.value = (user.IsActive !== false && user.IsActive !== 0) ? '1' : '0';

    // Sección de Baneo
    const banStatusSelect = document.getElementById('detail-ban-status');
    const banExpInput = document.getElementById('detail-ban-exp');
    const banReasonInput = document.getElementById('detail-ban-reason');

    const now = new Date();
    const isCurrentlyBanned = user.BannedUntil && new Date(user.BannedUntil) > now;

    if (banStatusSelect) {
        banStatusSelect.value = isCurrentlyBanned ? '1' : '0';
    }

    if (banExpInput) {
        if (user.BannedUntil) {
            const d = new Date(user.BannedUntil);
            // Formatear a formato local para input datetime-local: YYYY-MM-DDTHH:mm
            const pad = num => String(num).padStart(2, '0');
            const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            banExpInput.value = localIso;
        } else {
            const defaultDate = new Date();
            defaultDate.setDate(defaultDate.getDate() + 7);
            const pad = num => String(num).padStart(2, '0');
            const localIso = `${defaultDate.getFullYear()}-${pad(defaultDate.getMonth() + 1)}-${pad(defaultDate.getDate())}T${pad(defaultDate.getHours())}:${pad(defaultDate.getMinutes())}`;
            banExpInput.value = localIso;
        }
    }

    if (banReasonInput) {
        banReasonInput.value = user.BanReason || '';
    }

    onBanStatusChange();
    onAvatarInputChange();
}

function onAvatarInputChange() {
    const avInput = document.getElementById('detail-user-avatar');
    let avCode = avInput?.value.trim().toUpperCase() || 'AVA-002';
    if (!avCode) avCode = 'AVA-002';

    const pAvatar = document.getElementById('preview-user-avatar');
    const pAvatarCode = document.getElementById('preview-user-avatar-code');

    if (pAvatar) {
        pAvatar.src = `/assets/images/avatars/${avCode}.png`;
    }
    if (pAvatarCode) {
        pAvatarCode.textContent = `[${avCode}]`;
    }
}

function onBanStatusChange() {
    const isBanned = document.getElementById('detail-ban-status')?.value === '1';
    const expContainer = document.getElementById('detail-ban-exp-container');
    const reasonContainer = document.getElementById('detail-ban-reason-container');

    if (expContainer) {
        expContainer.style.opacity = isBanned ? '1' : '0.45';
    }
    if (reasonContainer) {
        reasonContainer.style.opacity = isBanned ? '1' : '0.45';
    }
}

function updateLivePreview() {
    const nick = document.getElementById('detail-user-username')?.value.trim() || 'Duelista';
    const email = document.getElementById('detail-user-email')?.value.trim() || '—';
    const countryIso = document.getElementById('detail-user-country')?.value || 'CO';
    const starships = parseInt(document.getElementById('detail-user-starships')?.value || 0, 10);
    const nivel = parseInt(document.getElementById('detail-user-nivel')?.value || 1, 10);
    const isAdmin = document.getElementById('detail-user-isadmin')?.value === '1';
    const isActive = document.getElementById('detail-user-isactive')?.value === '1';
    const isBanSelected = document.getElementById('detail-ban-status')?.value === '1';
    const banExpValue = document.getElementById('detail-ban-exp')?.value;

    const pName = document.getElementById('preview-user-name');
    const pEmail = document.getElementById('preview-user-email');
    const pCountry = document.getElementById('preview-user-country');
    const pLevel = document.getElementById('preview-user-level');
    const pStarships = document.getElementById('preview-user-starships');
    const pRole = document.getElementById('preview-user-role');
    const pStatus = document.getElementById('preview-user-status');
    const pBan = document.getElementById('preview-user-ban');

    if (pName) {
        pName.innerHTML = `${nick} ${isAdmin ? '<span class="badge-role-sa" style="background:#ffd700; color:#000; font-size:8px; font-weight:900; padding:1px 4px; vertical-align:middle; margin-left:4px;">SA</span>' : ''}`;
    }
    if (pEmail) pEmail.textContent = email;

    const matchedCountry = allCountriesList.find(c => c.IsoCode === countryIso);
    if (pCountry) {
        if (matchedCountry) {
            let flagHtml = '';
            if (matchedCountry.FlagSvgUrl) {
                flagHtml = `<img src="${matchedCountry.FlagSvgUrl}" alt="${matchedCountry.IsoCode}" style="width:14px; height:9px; object-fit:cover; display:inline-block; vertical-align:middle; margin-right:4px;">`;
            } else {
                flagHtml = `${matchedCountry.FlagEmoji || '🌐'} `;
            }
            pCountry.innerHTML = `${flagHtml}${matchedCountry.Name}`;
        } else {
            pCountry.textContent = countryIso || 'Desconocido';
        }
    }

    if (pLevel) pLevel.textContent = `Nv. ${nivel}`;
    if (pStarships) pStarships.textContent = `⭐ ${starships.toLocaleString()}`;
    if (pRole) {
        pRole.textContent = isAdmin ? 'Super Admin (SA)' : 'Duelista Estándar';
        pRole.style.color = isAdmin ? '#ffd700' : '#10b981';
    }
    if (pStatus) {
        pStatus.textContent = isActive ? '✅ Activo' : '⏸️ Inactivo';
        pStatus.style.color = isActive ? '#10b981' : '#f59e0b';
    }

    if (pBan) {
        if (isBanSelected && banExpValue) {
            const expDate = new Date(banExpValue);
            const now = new Date();
            if (expDate > now) {
                const dateStr = expDate.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
                pBan.innerHTML = `<span style="color:#ef4444; font-weight:700;">🚫 Baneado (Hasta ${dateStr})</span>`;
            } else {
                pBan.innerHTML = `<span style="color:#f59e0b; font-weight:700;">⏰ Baneo Expirado (Desbaneado)</span>`;
            }
        } else {
            pBan.innerHTML = `<span style="color:#10b981; font-weight:600;">🛡️ Sin Baneo Activo</span>`;
        }
    }
}

function showDetailAlert(message, isError = true) {
    const box = document.getElementById('detail-user-alert');
    if (!box) return;

    box.style.display = 'block';
    box.textContent = message;

    if (isError) {
        box.style.background = 'rgba(239, 68, 68, 0.15)';
        box.style.border = '1px solid #ef4444';
        box.style.color = '#ff6b81';
    } else {
        box.style.background = 'rgba(16, 185, 129, 0.15)';
        box.style.border = '1px solid #10b981';
        box.style.color = '#34d399';
    }
}

async function saveUserDetailChanges() {
    if (!currentEditingUserId) return;

    const username = document.getElementById('detail-user-username')?.value.trim();
    const email = document.getElementById('detail-user-email')?.value.trim();
    const password = document.getElementById('detail-user-password')?.value;
    const countryIsoCode = document.getElementById('detail-user-country')?.value;
    const avatarActivoId = document.getElementById('detail-user-avatar')?.value.trim().toUpperCase() || 'AVA-002';
    const starships = parseInt(document.getElementById('detail-user-starships')?.value, 10);
    const nivel = parseInt(document.getElementById('detail-user-nivel')?.value, 10);
    const isAdmin = document.getElementById('detail-user-isadmin')?.value === '1';
    const isActive = document.getElementById('detail-user-isactive')?.value === '1';

    // Parámetros de Baneo
    const isBanSelected = document.getElementById('detail-ban-status')?.value === '1';
    const banExpValue = document.getElementById('detail-ban-exp')?.value;
    const banReasonValue = document.getElementById('detail-ban-reason')?.value.trim();

    const btn = document.getElementById('btn-save-user-detail');

    if (!username || !email || !countryIsoCode) {
        showDetailAlert('El usuario, correo y país son obligatorios.', true);
        return;
    }

    if (username.length < 3 || username.length > 15 || /\s/.test(username)) {
        showDetailAlert('El nick debe tener entre 3 y 15 caracteres y no contener espacios.', true);
        return;
    }

    if (password && password.length < 6) {
        showDetailAlert('Si vas a cambiar la contraseña, debe tener al menos 6 caracteres.', true);
        return;
    }

    if (isBanSelected && !banExpValue) {
        showDetailAlert('Por favor especifica la fecha y hora de expiración para el baneo.', true);
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'GUARDANDO...';
    }

    try {
        const payload = {
            username,
            email,
            countryIsoCode,
            avatarActivoId,
            starships: isNaN(starships) ? 5000 : starships,
            nivel: isNaN(nivel) ? 1 : nivel,
            isAdmin,
            isActive
        };

        if (password && password.trim().length > 0) {
            payload.password = password.trim();
        }

        if (isBanSelected) {
            payload.bannedUntil = new Date(banExpValue).toISOString();
            payload.banReason = banReasonValue || 'Sanción aplicada por el administrador';
        } else {
            payload.bannedUntil = null;
            payload.banReason = null;
        }

        const user = window.Session ? window.Session.getUser() : null;
        const uid = user ? (user.id || user.user_id || user.Id) : null;
        const token = window.Session ? window.Session.getSessionToken() : '';

        const headers = {
            'Content-Type': 'application/json',
            'x-user-id': String(uid || ''),
            'x-admin-username': (user && user.username) || 'Admin',
            'x-session-token': token || ''
        };

        payload.adminUserId = uid;

        const res = await fetch(`/api/admin/users/${currentEditingUserId}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.success) {
            // Si el usuario editado es el mismo que tiene la sesión activa, actualizar su sesión local
            const sessUser = window.Session ? window.Session.getUser() : null;
            if (sessUser && (sessUser.id === currentEditingUserId || sessUser.user_id === currentEditingUserId || sessUser.Id === currentEditingUserId || sessUser.username === payload.username)) {
                sessUser.username = payload.username;
                sessUser.email = payload.email;
                sessUser.starships = payload.starships;
                sessUser.Starships = payload.starships;
                sessUser.nivel = payload.nivel;
                if (window.Session && typeof window.Session.setStarships === 'function') {
                    window.Session.setStarships(payload.starships);
                }
                window.Session.saveUser(sessUser);
            }

            showDetailAlert('✅ ¡Usuario y estado de baneo actualizados exitosamente! Redirigiendo...', false);
            setTimeout(() => {
                window.location.href = 'users.html';
            }, 1200);
        } else {
            showDetailAlert(data.message || 'Error al guardar cambios del usuario.', true);
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'GUARDAR CAMBIOS';
            }
        }
    } catch (e) {
        console.error('[SAVE USER DETAIL ERROR]', e);
        showDetailAlert('Error de conexión con el servidor.', true);
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'GUARDAR CAMBIOS';
        }
    }
}

window.updateLivePreview = updateLivePreview;
window.onBanStatusChange = onBanStatusChange;
window.onAvatarInputChange = onAvatarInputChange;
window.saveUserDetailChanges = saveUserDetailChanges;
