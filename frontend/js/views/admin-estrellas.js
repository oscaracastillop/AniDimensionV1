// =============================================================================
// GESTIÓN ADMINISTRATIVA DE PAQUETES DE RECARGA DE STARSHIPS ($ USD)
// Ani-Dimension System - TABLA UNIFORME, TIPOGRAFÍA COMPACTA Y SIN COLORES DISPARES
// =============================================================================

let allEstrellasPackages = [];
let filteredEstrellasPackages = [];
let currentPage = 1;
const pageSize = 12;

document.addEventListener('DOMContentLoaded', async () => {
    await loadEstrellasPackages();
});

async function loadEstrellasPackages() {
    try {
        const tbody = document.getElementById('admin-estrellas-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#94a3b8; padding:24px; font-size:11px;">Cargando paquetes de StarShips...</td></tr>`;
        }

        const res = await fetch('/api/admin/estrellas');
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.packages)) {
                allEstrellasPackages = data.packages;
            } else if (window.EstrellasData && window.EstrellasData.packages) {
                allEstrellasPackages = window.EstrellasData.packages;
            }
        } else if (window.EstrellasData && window.EstrellasData.packages) {
            allEstrellasPackages = window.EstrellasData.packages;
        }

        filteredEstrellasPackages = [...allEstrellasPackages];
        renderEstrellasTable();
    } catch (e) {
        console.error('Error cargando paquetes de estrellas:', e);
        if (window.EstrellasData && window.EstrellasData.packages) {
            allEstrellasPackages = window.EstrellasData.packages;
            filteredEstrellasPackages = [...allEstrellasPackages];
            renderEstrellasTable();
        }
    }
}

function renderEstrellasTable() {
    const tbody = document.getElementById('admin-estrellas-tbody');
    if (!tbody) return;

    if (!filteredEstrellasPackages.length) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#94a3b8; padding:24px; font-size:11px;">No se encontraron paquetes de StarShips que coincidan con la búsqueda.</td></tr>`;
        renderPagination();
        return;
    }

    const start = (currentPage - 1) * pageSize;
    const paginated = filteredEstrellasPackages.slice(start, start + pageSize);

    tbody.innerHTML = '';
    let html = '';
    paginated.forEach((pkg, idx) => {
        const globalPos = start + idx + 1;
        const isActive = pkg.activo !== 0 && pkg.activo !== false;
        const total = (pkg.estrellas_base || 0) + (pkg.estrellas_bonus || 0);

        const bannerDisplay = pkg.banner_tag 
            ? `<span style="background:linear-gradient(135deg, #ffd700, #f59e0b); color:#020617; font-family:'Orbitron', sans-serif; font-size:8px; font-weight:700; padding:2px 6px;">${pkg.banner_tag}</span>` 
            : `<span style="color:#64748b; font-size:10.5px;">—</span>`;

        const statusBadge = isActive 
            ? `<span class="status-badge active">ACTIVO</span>` 
            : `<span class="status-badge inactive">INACTIVO</span>`;

        html += `
            <tr>
                <td>
                    <div style="font-size:10px; color:#ffd700; font-weight:500;">${pkg.codigo}</div>
                    <div style="font-size:7.5px; color:#64748b;">#${globalPos}</div>
                </td>
                <td>
                    <div style="font-weight:400; color:#fff; font-size:11px;">${pkg.nombre}</div>
                    <div style="font-size:9.5px; color:#94a3b8; margin-top:2px;">${pkg.descripcion || ''}</div>
                </td>
                <td style="text-align:right; font-size:10.5px; color:#cbd5e1;">
                    ${(pkg.estrellas_base || 0).toLocaleString()}
                </td>
                <td style="text-align:right; font-size:10.5px; color:#cbd5e1;">
                    +${(pkg.estrellas_bonus || 0).toLocaleString()}
                </td>
                <td style="text-align:right; font-size:11px; color:#fff; font-weight:500;">
                    ${total.toLocaleString()}
                </td>
                <td style="text-align:center; font-size:11px; color:#fff; font-weight:500;">
                    $${Number(pkg.precio_usd || 0).toFixed(2)}
                </td>
                <td style="text-align:center;">${bannerDisplay}</td>
                <td style="text-align:center;">${statusBadge}</td>
                <td style="text-align:center;">
                    <div class="actions-group" style="justify-content:center; display:flex; gap:5px;">
                        <button type="button" class="btn-act-sm btn-act-edit" onclick="editEstrellasPackage('${pkg.codigo}')" style="font-family:'Outfit', sans-serif; font-size:10.5px; font-weight:500; text-transform:none; padding:2px 9px;" title="Editar Paquete">
                            <span>Editar</span>
                        </button>
                        <button type="button" class="btn-act-sm" onclick="deleteEstrellasPackage('${pkg.codigo}')" style="background:rgba(239,68,68,0.15); border:1px solid #ef4444; color:#ff6b81; font-family:'Outfit', sans-serif; font-size:10.5px; font-weight:500; text-transform:none; padding:2px 9px;" title="Eliminar Paquete">
                            <span>Eliminar</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    renderPagination();
}

function renderPagination() {
    const container = document.getElementById('admin-estrellas-pagination');
    if (!container) return;

    const totalPages = Math.ceil(filteredEstrellasPackages.length / pageSize) || 1;
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `<div style="display:flex; justify-content:center; align-items:center; gap:6px; margin-top:14px; padding:10px 0;">`;
    html += `<button type="button" onclick="changeEstrellasPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,215,0,0.3); color:#fff; font-family:'Orbitron', sans-serif; font-size:9px; padding:4px 10px; cursor:pointer;">« ANT</button>`;
    
    for (let p = 1; p <= totalPages; p++) {
        const isCurrent = p === currentPage;
        html += `<button type="button" onclick="changeEstrellasPage(${p})" style="background:${isCurrent ? '#f59e0b' : 'rgba(0,0,0,0.5)'}; color:${isCurrent ? '#000' : '#fff'}; border:1px solid rgba(255,215,0,0.3); font-family:'Orbitron', sans-serif; font-size:9px; font-weight:700; padding:4px 8px; cursor:pointer;">${p}</button>`;
    }

    html += `<button type="button" onclick="changeEstrellasPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,215,0,0.3); color:#fff; font-family:'Orbitron', sans-serif; font-size:9px; padding:4px 10px; cursor:pointer;">SIG »</button>`;
    html += `</div>`;

    container.innerHTML = html;
}

function changeEstrellasPage(p) {
    const totalPages = Math.ceil(filteredEstrellasPackages.length / pageSize) || 1;
    if (p < 1 || p > totalPages) return;
    currentPage = p;
    renderEstrellasTable();
}

function onEstrellasSearch(input) {
    const q = (input.value || '').trim().toLowerCase();
    currentPage = 1;
    if (!q) {
        filteredEstrellasPackages = [...allEstrellasPackages];
    } else {
        filteredEstrellasPackages = allEstrellasPackages.filter(p => {
            return (p.codigo || '').toLowerCase().includes(q) ||
                   (p.nombre || '').toLowerCase().includes(q) ||
                   (p.banner_tag || '').toLowerCase().includes(q) ||
                   (p.descripcion || '').toLowerCase().includes(q);
        });
    }
    renderEstrellasTable();
}

function calcTotalEstrellasPreview() {
    const base = parseInt(document.getElementById('form-estrellas-base')?.value || '0', 10) || 0;
    const bonus = parseInt(document.getElementById('form-estrellas-bonus')?.value || '0', 10) || 0;
    const total = base + bonus;
    const el = document.getElementById('form-estrellas-total-preview');
    if (el) el.textContent = `${total.toLocaleString()} ⭐`;
}

function generateNextEstrellasCode() {
    let maxNum = 0;
    allEstrellasPackages.forEach(p => {
        if (p.codigo && p.codigo.startsWith('PACK-STAR-')) {
            const num = parseInt(p.codigo.replace('PACK-STAR-', ''), 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
        }
    });
    const nextNum = maxNum + 1;
    return `PACK-STAR-${String(nextNum).padStart(2, '0')}`;
}

function openCreateEstrellasModal() {
    document.getElementById('form-estrellas-edit-mode').value = 'create';
    document.getElementById('modal-estrellas-title').textContent = 'CREAR PAQUETE DE STARSHIPS';
    document.getElementById('form-estrellas-code').value = generateNextEstrellasCode();
    document.getElementById('form-estrellas-name').value = '';
    document.getElementById('form-estrellas-base').value = '10000';
    document.getElementById('form-estrellas-bonus').value = '0';
    document.getElementById('form-estrellas-usd').value = '0.99';
    document.getElementById('form-estrellas-desc').value = '';
    document.getElementById('form-estrellas-banner').value = '';
    document.getElementById('form-estrellas-active').value = '1';

    calcTotalEstrellasPreview();
    hideAlert();
    document.getElementById('admin-estrellas-modal').style.display = 'flex';
}

function editEstrellasPackage(codigo) {
    const pkg = allEstrellasPackages.find(p => p.codigo === codigo);
    if (!pkg) return;

    document.getElementById('form-estrellas-edit-mode').value = 'edit';
    document.getElementById('modal-estrellas-title').textContent = `EDITAR PAQUETE (${pkg.codigo})`;
    document.getElementById('form-estrellas-code').value = pkg.codigo;
    document.getElementById('form-estrellas-name').value = pkg.nombre || '';
    document.getElementById('form-estrellas-base').value = pkg.estrellas_base || 0;
    document.getElementById('form-estrellas-bonus').value = pkg.estrellas_bonus || 0;
    document.getElementById('form-estrellas-usd').value = pkg.precio_usd || 0.99;
    document.getElementById('form-estrellas-desc').value = pkg.descripcion || '';
    document.getElementById('form-estrellas-banner').value = pkg.banner_tag || '';
    document.getElementById('form-estrellas-active').value = (pkg.activo !== 0 && pkg.activo !== false) ? '1' : '0';

    calcTotalEstrellasPreview();
    hideAlert();
    document.getElementById('admin-estrellas-modal').style.display = 'flex';
}

function closeEstrellasModal() {
    document.getElementById('admin-estrellas-modal').style.display = 'none';
}

async function toggleEstrellasActive(codigo) {
    const pkg = allEstrellasPackages.find(p => p.codigo === codigo);
    if (!pkg) return;
    const newActive = (pkg.activo === 0 || pkg.activo === false) ? 1 : 0;
    pkg.activo = newActive;
    await saveEstrellasPayload(pkg);
}

async function saveEstrellasPayload(payload) {
    try {
        const res = await fetch('/api/admin/estrellas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            await loadEstrellasPackages();
        }
    } catch (e) {
        console.error('Error al actualizar estado:', e);
    }
}

async function saveEstrellasForm() {
    const codigo = document.getElementById('form-estrellas-code').value.trim();
    const nombre = document.getElementById('form-estrellas-name').value.trim();
    const base = parseInt(document.getElementById('form-estrellas-base').value, 10) || 0;
    const bonus = parseInt(document.getElementById('form-estrellas-bonus').value, 10) || 0;
    const precio_usd = parseFloat(document.getElementById('form-estrellas-usd').value) || 0;
    const descripcion = document.getElementById('form-estrellas-desc').value.trim();
    const banner_tag = document.getElementById('form-estrellas-banner').value.trim();
    const activo = parseInt(document.getElementById('form-estrellas-active').value, 10);

    if (!codigo || !nombre || base <= 0 || precio_usd <= 0) {
        showAlert('Por favor complete los campos obligatorios (*)', 'error');
        return;
    }

    const payload = {
        codigo,
        nombre,
        estrellas_base: base,
        estrellas_bonus: bonus,
        precio_usd,
        descripcion,
        banner_tag,
        activo
    };

    try {
        const res = await fetch('/api/admin/estrellas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            closeEstrellasModal();
            if (window.ModalUtils) {
                window.ModalUtils.showSuccessModal(`Paquete ${codigo} guardado correctamente.`);
            }
            await loadEstrellasPackages();
        } else {
            showAlert(data.message || 'Error al guardar el paquete', 'error');
        }
    } catch (e) {
        console.error('Error guardando paquete:', e);
        showAlert('Error de conexión con el servidor', 'error');
    }
}

async function deleteEstrellasPackage(codigo) {
    if (!confirm(`¿Está seguro de eliminar el paquete de StarShips ${codigo}?`)) return;

    try {
        const res = await fetch(`/api/admin/estrellas/${codigo}`, {
            method: 'DELETE'
        });

        const data = await res.json();
        if (data.success) {
            if (window.ModalUtils) {
                window.ModalUtils.showSuccessModal(`Paquete ${codigo} eliminado exitosamente.`);
            }
            await loadEstrellasPackages();
        } else {
            if (window.ModalUtils) {
                window.ModalUtils.showErrorModal(data.message || 'No se pudo eliminar el paquete');
            }
        }
    } catch (e) {
        console.error('Error al eliminar paquete:', e);
        if (window.ModalUtils) {
            window.ModalUtils.showErrorModal('Error de conexión al eliminar');
        }
    }
}

function showAlert(msg, type = 'error') {
    const alertEl = document.getElementById('modal-estrellas-alert');
    if (!alertEl) return;
    alertEl.style.display = 'block';
    alertEl.style.background = type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)';
    alertEl.style.border = `1px solid ${type === 'error' ? '#ef4444' : '#22c55e'}`;
    alertEl.style.color = type === 'error' ? '#fca5a5' : '#86efac';
    alertEl.textContent = msg;
}

function hideAlert() {
    const alertEl = document.getElementById('modal-estrellas-alert');
    if (alertEl) alertEl.style.display = 'none';
}
