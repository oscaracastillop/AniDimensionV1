/**
 * Ani-Dimension: Controlador del Módulo de Administración de Usuarios
 */

let allUsersData = [];
let filteredUsersData = [];
let allCountriesData = [];

let currentAdminPage = 1;
const ADMIN_PAGE_SIZE = 10;
let currentEditingUser = null;
let currentBanningUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (window.Session && !window.Session.requireAdmin('/views/lobby/lobby.html')) {
        return;
    }

    // Verificar en SQL Server directamente
    try {
        const uid = window.Session.getUserId();
        const token = window.Session.getSessionToken();
        const res = await fetch('/api/admin/verify-access', {
            headers: { 'x-user-id': String(uid), 'x-session-token': token }
        });
        if (!res.ok) {
            alert('Acceso Denegado: No tienes privilegios de Administrador en la base de datos.');
            window.location.href = '/views/lobby/lobby.html';
            return;
        }
    } catch (e) {
        alert('Error de verificación con el servidor.');
        window.location.href = '/views/lobby/lobby.html';
        return;
    }

    initAdminView();
});

async function initAdminView() {
    const user = window.Session ? window.Session.getUser() : null;
    if (user) {
        const badgeEl = document.getElementById('admin-user-status');
        if (badgeEl) {
            badgeEl.textContent = '⚡ SUPER ADMIN (SA)';
        }
    }

    await loadCountriesCatalog();
    await loadUsersList();
}

async function loadCountriesCatalog() {
    try {
        const res = await fetch('/api/admin/countries');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.countries) {
            allCountriesData = data.countries;
        }
    } catch (e) {
        console.error('[ADMIN COUNTRIES ERROR]', e);
    }
}

async function loadUsersList() {
    try {
        const res = await fetch('/api/admin/users');
        if (!res.ok) throw new Error('Error al consultar usuarios');
        const data = await res.json();

        if (data.success && data.users) {
            allUsersData = data.users;
            filteredUsersData = [...allUsersData];
            
            // Actualizar contador global
            const totalEl = document.getElementById('admin-total-users-val');
            if (totalEl) totalEl.textContent = allUsersData.length;

            renderAdminUsersTable();
        }
    } catch (e) {
        console.error('[ADMIN USERS ERROR]', e);
        const tbody = document.getElementById('admin-users-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#ef4444; padding:20px;">❌ ${e.message}</td></tr>`;
        }
    }
}

// BUSCADOR DINÁMICO EN TIEMPO REAL
function onAdminSearchInput(input) {
    const query = input.value.trim().toLowerCase();
    if (!query) {
        filteredUsersData = [...allUsersData];
    } else {
        filteredUsersData = allUsersData.filter(u => {
            const nameMatch = (u.Username || '').toLowerCase().includes(query);
            const emailMatch = (u.Email || '').toLowerCase().includes(query);
            const countryMatch = (u.CountryName || '').toLowerCase().includes(query) || (u.CountryIsoCode || '').toLowerCase().includes(query);
            const reasonMatch = (u.BanReason || '').toLowerCase().includes(query);
            return nameMatch || emailMatch || countryMatch || reasonMatch;
        });
    }

    currentAdminPage = 1;
    renderAdminUsersTable();
}

// RENDERIZADO DE TABLA CON PAGINACIÓN DE 10 REGISTROS (TEXTO LIMPIO SIN NEGRITA PESADA)
function renderAdminUsersTable() {
    const tbody = document.getElementById('admin-users-tbody');
    const pagContainer = document.getElementById('admin-users-pagination');
    if (!tbody) return;

    if (filteredUsersData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#94a3b8; padding:24px; font-weight:400;">No se encontraron usuarios que coincidan con la búsqueda.</td></tr>`;
        if (pagContainer) pagContainer.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filteredUsersData.length / ADMIN_PAGE_SIZE) || 1;
    if (currentAdminPage > totalPages) currentAdminPage = totalPages;
    if (currentAdminPage < 1) currentAdminPage = 1;

    const startIndex = (currentAdminPage - 1) * ADMIN_PAGE_SIZE;
    const pageData = filteredUsersData.slice(startIndex, startIndex + ADMIN_PAGE_SIZE);

    tbody.innerHTML = pageData.map((u, idx) => {
        const globalPos = startIndex + idx + 1;
        const now = new Date();
        const isBanned = u.BannedUntil && new Date(u.BannedUntil) > now;
        const isActive = u.IsActive !== false && u.IsActive !== 0;

        let statusBadge = '';
        if (isBanned) {
            statusBadge = `<span class="status-badge banned">🚫 BANEADO</span>`;
        } else if (isActive) {
            statusBadge = `<span class="status-badge active">✅ ACTIVO</span>`;
        } else {
            statusBadge = `<span class="status-badge inactive">⏸️ INACTIVO</span>`;
        }

        const banExpStr = u.BannedUntil ? new Date(u.BannedUntil).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '—';
        const banReasonStr = u.BanReason || '—';

        // Bandera del país
        const flagDisplay = u.FlagEmoji || '🌐';

        return `
            <tr>
                <td style="color:#94a3b8; font-weight:400;">#${globalPos}</td>
                <td style="color:#fff; font-weight:400;">${u.Username} ${u.IsAdmin ? '<span style="font-size:9px; color:var(--accent-gold); border:1px solid rgba(255,215,0,0.4); padding:1px 4px; border-radius:3px;">SA</span>' : ''}</td>
                <td style="color:#94a3b8; font-weight:400;">${u.Email}</td>
                <td style="font-weight:400;">
                    <div class="user-country-pill">
                        <span>${flagDisplay}</span>
                        <span>${u.CountryName || u.CountryIsoCode}</span>
                    </div>
                </td>
                <td style="color:var(--accent-cyan); font-weight:400;">Nv. ${u.Nivel || 1}</td>
                <td style="font-weight:400;">${statusBadge}</td>
                <td style="color:#f87171; font-weight:400; font-size:10.5px;">${banExpStr}</td>
                <td style="color:#94a3b8; font-weight:400; font-size:10.5px; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${banReasonStr}</td>
                <td style="font-weight:400;">
                    <div style="display:flex; gap:6px;">
                        <button type="button" class="btn-act-sm btn-act-edit" onclick="openEditUserModal(${u.Id})" title="Editar usuario">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            <span>Editar</span>
                        </button>
                        <button type="button" class="btn-act-sm btn-act-toggle" onclick="toggleUserActiveStatus(${u.Id})" title="${isActive ? 'Inactivar' : 'Activar'}">
                            <span>${isActive ? 'Inactivar' : 'Activar'}</span>
                        </button>
                        <button type="button" class="btn-act-sm btn-act-ban" onclick="openBanUserModal(${u.Id})" title="Baneo">
                            <span>Baneo</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    renderAdminPaginationControls(pagContainer, currentAdminPage, totalPages, filteredUsersData.length);
}

function renderAdminPaginationControls(container, page, totalPages, totalItems) {
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = `
            <div class="rankings-pagination">
                <div class="rankings-page-info">Mostrando ${totalItems} usuarios</div>
            </div>
        `;
        return;
    }

    let pageBtns = '';
    for (let p = 1; p <= totalPages; p++) {
        pageBtns += `
            <button type="button" class="page-num-btn ${p === page ? 'active' : ''}" onclick="changeAdminUserPage(${p})">
                ${p}
            </button>
        `;
    }

    container.innerHTML = `
        <div class="rankings-pagination">
            <div class="rankings-page-info">
                Página <b>${page}</b> de <b>${totalPages}</b> (${totalItems} usuarios encontrados)
            </div>
            <div class="rankings-page-controls">
                <button type="button" class="btn-page-nav" ${page === 1 ? 'disabled' : ''} onclick="changeAdminUserPage(${page - 1})">
                    ‹ ANTERIOR
                </button>
                <div style="display:flex; gap:4px;">${pageBtns}</div>
                <button type="button" class="btn-page-nav" ${page === totalPages ? 'disabled' : ''} onclick="changeAdminUserPage(${page + 1})">
                    SIGUIENTE ›
                </button>
            </div>
        </div>
    `;
}

function changeAdminUserPage(newPage) {
    currentAdminPage = newPage;
    renderAdminUsersTable();
    const sec = document.getElementById('admin-users-module');
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --------------------------------------------------------------------------
// MODAL DE EDICIÓN COMPLETA DE USUARIO
// --------------------------------------------------------------------------
function openEditUserModal(userId) {
    const user = allUsersData.find(u => u.Id === userId);
    if (!user) return;
    currentEditingUser = user;

    const modal = document.getElementById('admin-edit-user-modal');
    if (!modal) return;

    document.getElementById('edit-user-id').value = user.Id;
    document.getElementById('edit-user-username').value = user.Username || '';
    document.getElementById('edit-user-email').value = user.Email || '';
    document.getElementById('edit-user-password').value = ''; // Vacío para no cambiar
    document.getElementById('edit-user-nivel').value = user.Nivel || 1;
    document.getElementById('edit-user-starships').value = user.Starships || 500;
    document.getElementById('edit-user-isadmin').value = user.IsAdmin ? '1' : '0';
    document.getElementById('edit-user-isactive').value = (user.IsActive !== false && user.IsActive !== 0) ? '1' : '0';

    // Cargar select de Países con banderas
    const countrySelect = document.getElementById('edit-user-country');
    if (countrySelect && allCountriesData.length > 0) {
        countrySelect.innerHTML = allCountriesData.map(c => `
            <option value="${c.IsoCode}" ${c.IsoCode === user.CountryIsoCode ? 'selected' : ''}>
                ${c.FlagEmoji || '🌐'} ${c.Name} (${c.IsoCode})
            </option>
        `).join('');
    }

    const alertBox = document.getElementById('edit-user-alert');
    if (alertBox) alertBox.style.display = 'none';

    modal.style.display = 'flex';
}

function closeEditUserModal() {
    const modal = document.getElementById('admin-edit-user-modal');
    if (modal) modal.style.display = 'none';
    currentEditingUser = null;
}

async function saveAdminUserEdit() {
    if (!currentEditingUser) return;

    const userId = currentEditingUser.Id;
    const username = document.getElementById('edit-user-username').value.trim();
    const email = document.getElementById('edit-user-email').value.trim();
    const password = document.getElementById('edit-user-password').value;
    const countryIsoCode = document.getElementById('edit-user-country').value;
    const nivel = parseInt(document.getElementById('edit-user-nivel').value, 10);
    const starships = parseInt(document.getElementById('edit-user-starships').value, 10);
    const isAdmin = document.getElementById('edit-user-isadmin').value === '1';
    const isActive = document.getElementById('edit-user-isactive').value === '1';

    const alertBox = document.getElementById('edit-user-alert');
    if (!alertBox) return;

    try {
        const res = await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                email,
                password: password || undefined,
                countryIsoCode,
                nivel,
                starships,
                isAdmin,
                isActive
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al actualizar usuario');

        alertBox.style.display = 'block';
        alertBox.style.background = 'rgba(16,185,129,0.15)';
        alertBox.style.color = '#10b981';
        alertBox.style.border = '1px solid rgba(16,185,129,0.4)';
        alertBox.textContent = '✅ Usuario actualizado correctamente.';

        await loadUsersList();
        setTimeout(() => closeEditUserModal(), 1200);
    } catch (err) {
        alertBox.style.display = 'block';
        alertBox.style.background = 'rgba(239,68,68,0.15)';
        alertBox.style.color = '#ef4444';
        alertBox.style.border = '1px solid rgba(239,68,68,0.4)';
        alertBox.textContent = `❌ ${err.message}`;
    }
}

// --------------------------------------------------------------------------
// ALTERNAR ESTADO ACTIVO / INACTIVO
// --------------------------------------------------------------------------
async function toggleUserActiveStatus(userId) {
    try {
        const res = await fetch(`/api/admin/users/${userId}/toggle-active`, { method: 'PUT' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cambiar estado');

        await loadUsersList();
    } catch (err) {
        alert(`❌ ${err.message}`);
    }
}

// --------------------------------------------------------------------------
// MODAL DE BANEO (CON FECHA Y MOTIVO)
// --------------------------------------------------------------------------
function openBanUserModal(userId) {
    const user = allUsersData.find(u => u.Id === userId);
    if (!user) return;
    currentBanningUser = user;

    const modal = document.getElementById('admin-ban-user-modal');
    if (!modal) return;

    document.getElementById('ban-user-name').textContent = user.Username;

    // Si ya tiene baneo activo
    const dateInput = document.getElementById('ban-user-exp');
    const reasonInput = document.getElementById('ban-user-reason');

    if (user.BannedUntil) {
        const dateObj = new Date(user.BannedUntil);
        const isoStr = dateObj.toISOString().slice(0, 16);
        dateInput.value = isoStr;
    } else {
        // Por defecto: 7 días de baneo
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        dateInput.value = defaultDate.toISOString().slice(0, 16);
    }

    reasonInput.value = user.BanReason || 'Violación de términos de conducta y duelos';

    const alertBox = document.getElementById('ban-user-alert');
    if (alertBox) alertBox.style.display = 'none';

    modal.style.display = 'flex';
}

function closeBanUserModal() {
    const modal = document.getElementById('admin-ban-user-modal');
    if (modal) modal.style.display = 'none';
    currentBanningUser = null;
}

async function applyUserBan() {
    if (!currentBanningUser) return;

    const userId = currentBanningUser.Id;
    const bannedUntil = document.getElementById('ban-user-exp').value;
    const banReason = document.getElementById('ban-user-reason').value.trim();

    const alertBox = document.getElementById('ban-user-alert');

    try {
        const res = await fetch(`/api/admin/users/${userId}/ban`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bannedUntil: bannedUntil ? new Date(bannedUntil).toISOString() : null,
                banReason
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al aplicar baneo');

        alertBox.style.display = 'block';
        alertBox.style.background = 'rgba(16,185,129,0.15)';
        alertBox.style.color = '#10b981';
        alertBox.style.border = '1px solid rgba(16,185,129,0.4)';
        alertBox.textContent = '✅ Operación de baneo ejecutada correctamente.';

        await loadUsersList();
        setTimeout(() => closeBanUserModal(), 1200);
    } catch (err) {
        alertBox.style.display = 'block';
        alertBox.style.background = 'rgba(239,68,68,0.15)';
        alertBox.style.color = '#ef4444';
        alertBox.style.border = '1px solid rgba(239,68,68,0.4)';
        alertBox.textContent = `❌ ${err.message}`;
    }
}

async function liftUserBan() {
    if (!currentBanningUser) return;

    const userId = currentBanningUser.Id;
    const alertBox = document.getElementById('ban-user-alert');

    try {
        const res = await fetch(`/api/admin/users/${userId}/ban`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bannedUntil: null,
                banReason: null
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al remover baneo');

        alertBox.style.display = 'block';
        alertBox.style.background = 'rgba(16,185,129,0.15)';
        alertBox.style.color = '#10b981';
        alertBox.style.border = '1px solid rgba(16,185,129,0.4)';
        alertBox.textContent = '✅ Baneo removido. Usuario habilitado.';

        await loadUsersList();
        setTimeout(() => closeBanUserModal(), 1200);
    } catch (err) {
        alertBox.style.display = 'block';
        alertBox.style.background = 'rgba(239,68,68,0.15)';
        alertBox.style.color = '#ef4444';
        alertBox.style.border = '1px solid rgba(239,68,68,0.4)';
        alertBox.textContent = `❌ ${err.message}`;
    }
}
