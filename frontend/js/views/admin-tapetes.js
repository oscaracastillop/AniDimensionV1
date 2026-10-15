/**
 * Ani-Dimension: Controlador de Gestión de Tapetes de Duelo (Panel Admin)
 * Permite listar, buscar, paginar, activar/desactivar y eliminar tapetes.
 */

let allTapetes = [];
let filteredTapetes = [];
let currentAdminTapetePage = 1;
const TAPETES_PAGE_SIZE = 10;

document.addEventListener('DOMContentLoaded', () => {
    if (window.Session && !window.Session.requireAuth('/views/login/login.html')) {
        return;
    }

    initAdminTapetes();
});

async function initAdminTapetes() {
    if (window.PlaymatsManager) {
        await window.PlaymatsManager.syncFromServer();
    }
    loadTapetesList();
}

function loadTapetesList() {
    if (!window.PlaymatsManager) return;
    allTapetes = window.PlaymatsManager.getPlaymats();
    filteredTapetes = [...allTapetes];
    renderTapetesTable();
}

function onTapetesSearch(input) {
    const q = input.value.trim().toLowerCase();
    if (!q) {
        filteredTapetes = [...allTapetes];
    } else {
        filteredTapetes = allTapetes.filter(p => {
            const codeMatch = (p.code || '').toLowerCase().includes(q);
            const nameMatch = (p.name || '').toLowerCase().includes(q);
            const bannerMatch = (p.offer_text || '').toLowerCase().includes(q);
            return codeMatch || nameMatch || bannerMatch;
        });
    }
    currentAdminTapetePage = 1;
    renderTapetesTable();
}

function renderTapetesTable() {
    const tbody = document.getElementById('admin-tapetes-tbody');
    const pagContainer = document.getElementById('admin-tapetes-pagination');
    if (!tbody) return;

    if (filteredTapetes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:24px;">No se encontraron tapetes registrados.</td></tr>`;
        if (pagContainer) pagContainer.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filteredTapetes.length / TAPETES_PAGE_SIZE) || 1;
    if (currentAdminTapetePage > totalPages) currentAdminTapetePage = totalPages;
    if (currentAdminTapetePage < 1) currentAdminTapetePage = 1;

    const startIndex = (currentAdminTapetePage - 1) * TAPETES_PAGE_SIZE;
    const pageData = filteredTapetes.slice(startIndex, startIndex + TAPETES_PAGE_SIZE);

    tbody.innerHTML = pageData.map((p, idx) => {
        const globalPos = startIndex + idx + 1;
        const isActive = p.active !== false;

        const priceDisplay = p.currency === 'USD' 
            ? `<span style="color:#22c55e; font-weight:700; font-family:'Orbitron', sans-serif;">$ ${parseFloat(p.price || 0).toFixed(2)} USD</span>`
            : `<span style="color:#ffd700; font-weight:700; font-family:'Orbitron', sans-serif;">⭐ ${parseInt(p.price || 0, 10).toLocaleString()}</span>`;

        const bannerDisplay = p.offer_text 
            ? `<span style="background:linear-gradient(135deg, #ffd700, #f59e0b); color:#000; font-family:'Orbitron', sans-serif; font-size:8px; font-weight:800; padding:2px 6px;">${p.offer_text}</span>` 
            : `<span style="color:#64748b;">—</span>`;

        const statusBadge = isActive 
            ? `<span class="status-badge active">ACTIVO</span>` 
            : `<span class="status-badge inactive">INACTIVO</span>`;

        const toggleBtnText = isActive ? 'DESACTIVAR' : 'ACTIVAR';
        const toggleBtnClass = isActive ? 'btn-act-inactivate' : 'btn-act-activate';

        return `
            <tr>
                <td style="font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:700; color:var(--accent-cyan);">
                    #${globalPos} <span style="color:#fff;">${p.code}</span>
                </td>
                <td style="text-align:center;">
                    <img src="${p.image}" alt="${p.name}" style="width:70px; height:38px; object-fit:cover; border:1px solid rgba(0,240,255,0.4); border-radius:3px; background:#000;" onerror="this.onerror=null; this.src='/assets/images/logo.png';">
                </td>
                <td>
                    <div style="font-weight:700; color:#fff; font-size:11px;">${p.name}</div>
                    <div style="font-size:9px; color:#94a3b8; max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        ${p.description || 'Superficie de duelo vitalicia oficial'}
                    </div>
                </td>
                <td>${bannerDisplay}</td>
                <td>${priceDisplay}</td>
                <td><span style="color:#10b981; font-size:9.5px; font-weight:700;">VITALICIO</span></td>
                <td>${statusBadge}</td>
                <td style="text-align:right;">
                    <div style="display:inline-flex; gap:5px; justify-content:flex-end;">
                        <a href="editor.html?code=${encodeURIComponent(p.code)}" class="btn-act-sm btn-act-edit" style="text-decoration:none; display:inline-flex; align-items:center;">
                            EDITAR
                        </a>
                        <button type="button" onclick="onToggleTapeteStatus('${p.code}')" class="btn-act-sm ${toggleBtnClass}">
                            ${toggleBtnText}
                        </button>
                        <button type="button" onclick="onDeleteTapete('${p.code}')" class="btn-act-sm btn-act-delete">
                            ELIMINAR
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const pagContainer = document.getElementById('admin-tapetes-pagination');
    if (!pagContainer) return;

    if (totalPages <= 1) {
        pagContainer.innerHTML = '';
        return;
    }

    let html = `
        <button type="button" class="btn-page-nav" ${currentAdminTapetePage === 1 ? 'disabled' : ''} onclick="goToTapetesPage(${currentAdminTapetePage - 1})">
            ANTERIOR
        </button>
        <span class="page-indicator">PÁGINA ${currentAdminTapetePage} DE ${totalPages}</span>
        <button type="button" class="btn-page-nav" ${currentAdminTapetePage === totalPages ? 'disabled' : ''} onclick="goToTapetesPage(${currentAdminTapetePage + 1})">
            SIGUIENTE
        </button>
    `;
    pagContainer.innerHTML = html;
}

function goToTapetesPage(page) {
    currentAdminTapetePage = page;
    renderTapetesTable();
}

async function onToggleTapeteStatus(code) {
    if (!window.PlaymatsManager) return;
    await window.PlaymatsManager.toggleTapete(code);
    loadTapetesList();
}

async function onDeleteTapete(code) {
    if (!window.PlaymatsManager) return;
    if (confirm(`¿Está seguro de eliminar el tapete ${code}? Esta acción no se puede deshacer.`)) {
        await window.PlaymatsManager.deletePlaymat(code);
        loadTapetesList();
    }
}
