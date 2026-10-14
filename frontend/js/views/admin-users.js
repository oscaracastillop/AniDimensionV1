/**
 * Ani-Dimension: Controlador del Módulo Dedicado de Administración de Usuarios
 */

let allUsersData = [];
let filteredUsersData = [];
let allCountriesData = [];

let currentAdminPage = 1;
const ADMIN_PAGE_SIZE = 10;

let currentEditingUser = null;
let currentBanningUser = null;

document.addEventListener('DOMContentLoaded', () => {
    if (window.Session && !window.Session.requireAuth('/views/login/login.html')) {
        return;
    }

    initUsersAdminView();
});

async function initUsersAdminView() {
    const searchInput = document.getElementById('admin-user-search');
    if (searchInput) searchInput.value = '';
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

            populateCountryDropdown('create-user-country');
            populateCountryDropdown('edit-user-country');
        }
    } catch (e) {
        console.error('[ADMIN COUNTRIES ERROR]', e);
    }
}

function populateCountryDropdown(elementId, selectedIso = '') {
    const select = document.getElementById(elementId);
    if (!select || !allCountriesData.length) return;

    select.innerHTML = `<option value="">-- Seleccionar País --</option>` + allCountriesData.map(c => `
        <option value="${c.IsoCode}" ${c.IsoCode === selectedIso ? 'selected' : ''}>
            ${c.FlagEmoji || '🌐'} ${c.Name} (${c.IsoCode})
        </option>
    `).join('');
}

async function loadUsersList() {
    try {
        const res = await fetch('/api/admin/users');
        if (!res.ok) throw new Error('Error al consultar lista de usuarios.');
        const data = await res.json();

        if (data.success && data.users) {
            allUsersData = data.users;
            const searchInput = document.getElementById('admin-user-search');
            if (searchInput) searchInput.value = '';
            filteredUsersData = [...allUsersData];
            renderAdminUsersTable();
        }
    } catch (e) {
        console.error('[ADMIN USERS ERROR]', e);
        const tbody = document.getElementById('admin-users-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#ef4444; padding:20px; font-weight:400;">❌ ${e.message}</td></tr>`;
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

// RENDERIZADO DE TABLA CON PAGINACIÓN DE 10 REGISTROS (REGISTROS LIMPIOS SIN NEGRITA)
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
        let flagDisplay = '';
        if (u.FlagSvgUrl) {
            flagDisplay = `<img src="${u.FlagSvgUrl}" alt="${u.CountryIsoCode || ''}" style="width:15px; height:10px; object-fit:cover; display:inline-block; vertical-align:middle; border:1px solid rgba(255,255,255,0.25);">`;
        } else if (u.FlagEmoji && !u.FlagEmoji.includes('?')) {
            flagDisplay = u.FlagEmoji;
        } else {
            flagDisplay = `<span style="font-family:'Orbitron', sans-serif; font-size:8px; color:var(--accent-cyan); font-weight:400;">${u.CountryIsoCode || '🌐'}</span>`;
        }
        let countryDisplay = u.CountryName || u.CountryIsoCode || 'Desconocido';
        if (u.CountryIsoCode === 'MX' || (countryDisplay && countryDisplay.toLowerCase().includes('xico'))) {
            countryDisplay = 'México';
        }
        const emailDisplay = u.Email || '—';

        return `
            <tr>
                <td class="col-pos">#${globalPos}</td>
                <td class="col-user">
                    <span>${u.Username}</span> 
                    ${u.IsAdmin ? '<span class="badge-role-sa">SA</span>' : ''}
                </td>
                <td class="col-email">${emailDisplay}</td>
                <td class="col-country">
                    <div class="user-country-pill">
                        <span class="country-flag">${flagDisplay}</span>
                        <span class="country-name">${countryDisplay}</span>
                    </div>
                </td>
                <td class="col-level">Nv. ${u.Nivel || 1}</td>
                <td class="col-status">${statusBadge}</td>
                <td class="col-ban-exp">${banExpStr}</td>
                <td class="col-ban-reason" title="${banReasonStr}">${banReasonStr}</td>
                <td class="col-actions">
                    <div class="actions-group">
                        <a href="users-detalle.html?id=${u.Id}" class="btn-act-sm btn-act-edit" style="text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="Editar usuario en vista dedicada">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px; height:11px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            <span>Editar</span>
                        </a>
                        <button type="button" class="btn-act-sm ${isActive ? 'btn-act-inactivate' : 'btn-act-activate'}" onclick="toggleUserActiveStatus(${u.Id})" title="${isActive ? 'Inactivar usuario' : 'Activar usuario'}">
                            <span>${isActive ? 'Inactivar' : 'Activar'}</span>
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
                <div class="rankings-page-info" style="font-size:11px !important; color:#94a3b8 !important; font-weight:400 !important;">Mostrando ${totalItems} usuarios</div>
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
            <div class="rankings-page-info" style="font-size:11px !important; color:#94a3b8 !important; font-weight:400 !important;">
                Página <span style="color:#00f0ff;">${page}</span> de <span style="color:#00f0ff;">${totalPages}</span> (${totalItems} usuarios registrados)
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
// MODAL DE CREACIÓN DE USUARIO (POR EL ADMINISTRADOR)
// --------------------------------------------------------------------------
function openCreateUserModal() {
    const modal = document.getElementById('admin-create-user-modal');
    if (!modal) return;

    document.getElementById('create-user-username').value = '';
    document.getElementById('create-user-email').value = '';
    document.getElementById('create-user-password').value = '';
    document.getElementById('create-user-nivel').value = '1';
    document.getElementById('create-user-starships').value = '1000';
    document.getElementById('create-user-isadmin').value = '0';

    populateCountryDropdown('create-user-country');

    const alertBox = document.getElementById('create-user-alert');
    if (alertBox) alertBox.style.display = 'none';

    modal.style.display = 'flex';
}

function closeCreateUserModal() {
    const modal = document.getElementById('admin-create-user-modal');
    if (modal) modal.style.display = 'none';
}

async function saveAdminUserCreate() {
    const username = document.getElementById('create-user-username').value.trim();
    const email = document.getElementById('create-user-email').value.trim();
    const password = document.getElementById('create-user-password').value;
    const countryIsoCode = document.getElementById('create-user-country').value;
    const nivel = parseInt(document.getElementById('create-user-nivel').value || 1, 10);
    const starships = parseInt(document.getElementById('create-user-starships').value || 1000, 10);
    const isAdmin = document.getElementById('create-user-isadmin').value === '1';

    const alertBox = document.getElementById('create-user-alert');
    if (!alertBox) return;

    if (!username || !email || !password || !countryIsoCode) {
        alertBox.style.display = 'block';
        alertBox.style.background = 'rgba(239,68,68,0.15)';
        alertBox.style.color = '#ef4444';
        alertBox.style.border = '1px solid rgba(239,68,68,0.4)';
        alertBox.textContent = '❌ Por favor completa Usuario, Email, Contraseña y País.';
        return;
    }

    try {
        const user = window.Session ? window.Session.getUser() : null;
        const uid = user ? (user.id || user.user_id || user.Id) : null;
        const token = window.Session ? window.Session.getSessionToken() : '';

        const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-user-id': String(uid || ''),
                'x-admin-username': (user && user.username) || 'Admin',
                'x-session-token': token || ''
            },
            body: JSON.stringify({
                username,
                email,
                password,
                countryIsoCode,
                nivel,
                starships,
                isAdmin,
                adminUserId: uid
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al crear usuario');

        alertBox.style.display = 'block';
        alertBox.style.background = 'rgba(16,185,129,0.15)';
        alertBox.style.color = '#10b981';
        alertBox.style.border = '1px solid rgba(16,185,129,0.4)';
        alertBox.textContent = '✅ Usuario creado exitosamente.';

        await loadUsersList();
        setTimeout(() => closeCreateUserModal(), 1200);
    } catch (err) {
        alertBox.style.display = 'block';
        alertBox.style.background = 'rgba(239,68,68,0.15)';
        alertBox.style.color = '#ef4444';
        alertBox.style.border = '1px solid rgba(239,68,68,0.4)';
        alertBox.textContent = `❌ ${err.message}`;
    }
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
    document.getElementById('edit-user-password').value = '';
    document.getElementById('edit-user-nivel').value = user.Nivel || 1;
    document.getElementById('edit-user-starships').value = user.Starships || 500;
    document.getElementById('edit-user-isadmin').value = user.IsAdmin ? '1' : '0';
    document.getElementById('edit-user-isactive').value = (user.IsActive !== false && user.IsActive !== 0) ? '1' : '0';

    populateCountryDropdown('edit-user-country', user.CountryIsoCode);

    const alertBox = document.getElementById('edit-user-alert');
    if (alertBox) alertBox.style.display = 'none';

    modal.style.display = 'flex';
}

// --------------------------------------------------------------------------
// ALTERNAR ESTADO ACTIVO / INACTIVO
// --------------------------------------------------------------------------
async function toggleUserActiveStatus(userId) {
    try {
        const user = window.Session ? window.Session.getUser() : null;
        const uid = user ? (user.id || user.user_id || user.Id) : null;
        const token = window.Session ? window.Session.getSessionToken() : '';

        const res = await fetch(`/api/admin/users/${userId}/toggle-active`, { 
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': String(uid || ''),
                'x-admin-username': (user && user.username) || 'Admin',
                'x-session-token': token || ''
            },
            body: JSON.stringify({ adminUserId: uid })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al cambiar estado');

        await loadUsersList();
    } catch (err) {
        alert(`❌ ${err.message}`);
    }
}
