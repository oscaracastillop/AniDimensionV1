/**
 * Ani-Dimension: Controlador de Gestión de Fundas y Reversos (Panel Admin)
 * Permite listar, buscar, paginar, activar/desactivar y eliminar fundas.
 */

let allSleeves = [];
let filteredSleeves = [];
let currentAdminSleevePage = 1;
const SLEEVES_PAGE_SIZE = 10;

document.addEventListener('DOMContentLoaded', () => {
    if (window.Session && !window.Session.requireAuth('/views/login/login.html')) {
        return;
    }

    initAdminSleeves();
});

async function initAdminSleeves() {
    if (window.SleevesManager) {
        await window.SleevesManager.syncFromServer();
    }
    loadSleevesList();
}

function loadSleevesList() {
    if (!window.SleevesManager) return;
    allSleeves = window.SleevesManager.getSleeves();
    filteredSleeves = [...allSleeves];
    renderSleevesTable();
}

function onSleevesSearch(input) {
    const q = input.value.trim().toLowerCase();
    if (!q) {
        filteredSleeves = [...allSleeves];
    } else {
        filteredSleeves = allSleeves.filter(s => {
            const codeMatch = (s.code || '').toLowerCase().includes(q);
            const nameMatch = (s.name || '').toLowerCase().includes(q);
            const bannerMatch = (s.offer_text || '').toLowerCase().includes(q);
            return codeMatch || nameMatch || bannerMatch;
        });
    }
    currentAdminSleevePage = 1;
    renderSleevesTable();
}

function renderSleevesTable() {
    const tbody = document.getElementById('admin-fundas-tbody');
    const pagContainer = document.getElementById('admin-fundas-pagination');
    if (!tbody) return;

    if (filteredSleeves.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:24px;">No se encontraron fundas registradas.</td></tr>`;
        if (pagContainer) pagContainer.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filteredSleeves.length / SLEEVES_PAGE_SIZE) || 1;
    if (currentAdminSleevePage > totalPages) currentAdminSleevePage = totalPages;
    if (currentAdminSleevePage < 1) currentAdminSleevePage = 1;

    const startIndex = (currentAdminSleevePage - 1) * SLEEVES_PAGE_SIZE;
    const pageData = filteredSleeves.slice(startIndex, startIndex + SLEEVES_PAGE_SIZE);

    tbody.innerHTML = pageData.map((s, idx) => {
        const globalPos = startIndex + idx + 1;
        const isActive = s.active !== false;

        const priceDisplay = s.currency === 'USD' 
            ? `<span style="color:#22c55e; font-weight:700; font-family:'Orbitron', sans-serif;">$ ${parseFloat(s.price || 0).toFixed(2)} USD</span>`
            : `<span style="color:#ffd700; font-weight:700; font-family:'Orbitron', sans-serif;">⭐ ${parseInt(s.price || 0, 10).toLocaleString()}</span>`;

        const bannerDisplay = s.offer_text 
            ? `<span style="background:linear-gradient(135deg, #ffd700, #f59e0b); color:#000; font-family:'Orbitron', sans-serif; font-size:8px; font-weight:800; padding:2px 6px;">${s.offer_text}</span>` 
            : `<span style="color:#64748b;">—</span>`;

        const statusBadge = isActive 
            ? `<span class="status-badge active">ACTIVO</span>` 
            : `<span class="status-badge inactive">INACTIVO</span>`;

        const toggleBtnText = isActive ? 'DESACTIVAR' : 'ACTIVAR';
        const toggleBtnClass = isActive ? 'btn-act-inactivate' : 'btn-act-activate';

        return `
            <tr>
                <td style="font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:700; color:var(--accent-cyan);">
                    #${globalPos} <span style="color:#fff;">${s.code}</span>
                </td>
                <td style="text-align:center;">
                    <img src="${s.image}" alt="${s.name}" style="width:42px; height:60px; object-fit:cover; border:1px solid rgba(0,240,255,0.4); border-radius:3px; background:#000;" onerror="this.onerror=null; this.src='/assets/card_back.jpg';">
                </td>
                <td>
                    <div style="font-weight:700; color:#fff; font-size:11px;">${s.name}</div>
                    <div style="font-size:9px; color:#94a3b8; max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        ${s.description || 'Funda protectora holográfica de duelo vitalicia'}
                    </div>
                </td>
                <td>${bannerDisplay}</td>
                <td>${priceDisplay}</td>
                <td><span style="color:#10b981; font-size:9.5px; font-weight:700;">VITALICIO</span></td>
                <td>${statusBadge}</td>
                <td style="text-align:right;">
                    <div style="display:inline-flex; gap:5px; justify-content:flex-end;">
                        <a href="editor.html?code=${encodeURIComponent(s.code)}" class="btn-act-sm btn-act-edit" style="text-decoration:none; display:inline-flex; align-items:center;">
                            EDITAR
                        </a>
                        <button type="button" onclick="onToggleSleeveStatus('${s.code}')" class="btn-act-sm ${toggleBtnClass}">
                            ${toggleBtnText}
                        </button>
                        <button type="button" onclick="onDeleteSleeve('${s.code}')" class="btn-act-sm btn-act-delete">
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
    const pagContainer = document.getElementById('admin-fundas-pagination');
    if (!pagContainer) return;

    if (totalPages <= 1) {
        pagContainer.innerHTML = '';
        return;
    }

    let html = `
        <button type="button" class="btn-page-nav" ${currentAdminSleevePage === 1 ? 'disabled' : ''} onclick="goToSleevesPage(${currentAdminSleevePage - 1})">
            ANTERIOR
        </button>
        <span class="page-indicator">PÁGINA ${currentAdminSleevePage} DE ${totalPages}</span>
        <button type="button" class="btn-page-nav" ${currentAdminSleevePage === totalPages ? 'disabled' : ''} onclick="goToSleevesPage(${currentAdminSleevePage + 1})">
            SIGUIENTE
        </button>
    `;
    pagContainer.innerHTML = html;
}

function goToSleevesPage(page) {
    currentAdminSleevePage = page;
    renderSleevesTable();
}

async function onToggleSleeveStatus(code) {
    if (!window.SleevesManager) return;
    await window.SleevesManager.toggleSleeve(code);
    loadSleevesList();
}

async function onDeleteSleeve(code) {
    if (!window.SleevesManager) return;
    if (confirm(`¿Está seguro de eliminar la funda ${code}? Esta acción no se puede deshacer.`)) {
        await window.SleevesManager.deleteSleeve(code);
        loadSleevesList();
    }
}
