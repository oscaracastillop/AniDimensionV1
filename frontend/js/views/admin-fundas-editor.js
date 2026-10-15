/**
 * Ani-Dimension: Controlador del Formulario Dedicado de Fundas de Cartas (Panel Admin)
 * Soporta edición, creación con código secuencial (SLV-001, SLV-002...), carga de imagen local/web,
 * vista previa en vivo y persistencia en el servidor.
 */

let editingSleeveCode = null;
let currentUploadedImageBase64 = null;
let currentUploadedExtension = 'png';

document.addEventListener('DOMContentLoaded', async () => {
    if (window.Session && !window.Session.requireAuth('/views/login/login.html')) {
        return;
    }

    if (window.SleevesManager) {
        await window.SleevesManager.syncFromServer();
    }

    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');

    if (codeParam) {
        editingSleeveCode = codeParam;
    }

    initSleeveEditor();
});

function switchToNewSleeveForm() {
    editingSleeveCode = null;
    currentUploadedImageBase64 = null;
    window.history.pushState({}, '', 'editor.html');
    initSleeveEditor();
}

function initSleeveEditor() {
    let sleeve = null;
    const isEditing = Boolean(editingSleeveCode);

    if (isEditing && window.SleevesManager) {
        sleeve = window.SleevesManager.getSleeveByCode(editingSleeveCode);
    }

    if (!sleeve) {
        const nextCode = window.SleevesManager ? window.SleevesManager.getNextCode() : 'SLV-001';
        sleeve = {
            code: nextCode,
            name: '',
            description: '',
            image: `/assets/images/sleeves/${nextCode}.png`,
            currency: 'STARSHIPS',
            price: 35000,
            offer_text: 'NUEVO',
            active: true
        };
    }

    const titleEl = document.getElementById('sleeve-editor-title');
    if (titleEl) {
        titleEl.textContent = isEditing ? `EDITANDO FUNDA: ${sleeve.code}` : 'CREAR NUEVA FUNDA DE CARTAS';
    }

    renderSleevePreview(sleeve);
    renderSleeveForm(sleeve, isEditing);
}

function renderSleevePreview(s) {
    const cardEl = document.getElementById('sleeve-preview-card');
    if (!cardEl) return;

    const bannerTag = s.offer_text 
        ? `<div style="position:absolute; top:10px; right:10px; background:linear-gradient(135deg, #ffd700, #f59e0b); color:#000; font-family:'Orbitron', sans-serif; font-size:8px; font-weight:900; padding:2px 8px; box-shadow:0 0 10px rgba(255,215,0,0.5); z-index:2;">${s.offer_text}</div>` 
        : '';

    const priceFormatted = s.currency === 'USD' 
        ? `$ ${parseFloat(s.price || 0).toFixed(2)} USD` 
        : `⭐ ${parseInt(s.price || 0, 10).toLocaleString()} STARSHIPS`;

    const statusBadge = s.active !== false 
        ? `<span style="font-size:8px; color:#10b981; background:rgba(16,185,129,0.15); border:1px solid #10b981; padding:1px 6px; font-weight:700;">ACTIVO</span>` 
        : `<span style="font-size:8px; color:#ef4444; background:rgba(239,68,68,0.15); border:1px solid #ef4444; padding:1px 6px; font-weight:700;">INACTIVO</span>`;

    cardEl.innerHTML = `
        ${bannerTag}
        
        <div style="font-family:'Orbitron', sans-serif; font-size:10px; font-weight:700; color:var(--accent-cyan); margin-bottom:6px; text-align:left;">
            ${s.code}
        </div>

        <div style="width:120px; height:175px; margin:0 auto 10px auto; border-radius:6px; overflow:hidden; border:1.5px solid rgba(0,240,255,0.5); background:#000; box-shadow:0 0 16px rgba(0,240,255,0.25); display:flex; align-items:center; justify-content:center;">
            <img src="${s.image}" alt="${s.name || s.code}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='/assets/card_back.jpg';">
        </div>

        <div style="font-family:'Outfit', sans-serif; font-size:12.5px; font-weight:800; color:#fff; margin-bottom:4px; text-transform:uppercase; line-height:1.2;">
            ${s.name || 'NOMBRE DE LA FUNDA'}
        </div>

        <div style="font-size:9.5px; color:#94a3b8; margin-bottom:8px; line-height:1.3; min-height:24px;">
            ${s.description || 'Reverso protector místico holográfico oficial con durabilidad vitalicia.'}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.5); padding:6px 10px; border:1px solid rgba(255,255,255,0.1); margin-bottom:8px;">
            <span style="font-size:9px; color:#cbd5e1; font-weight:700;">DURACIÓN:</span>
            <span style="font-size:9px; color:#10b981; font-weight:800;">VITALICIO</span>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,240,255,0.08); padding:6px 10px; border:1px solid rgba(0,240,255,0.3); margin-bottom:8px;">
            <span style="font-size:9px; color:var(--accent-cyan); font-weight:700;">PRECIO:</span>
            <span style="font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:800; color:#ffd700;">${priceFormatted}</span>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:8.5px; color:#94a3b8;">ESTADO:</span>
            ${statusBadge}
        </div>
    `;
}

function renderSleeveForm(s, isEditing) {
    const formEl = document.getElementById('sleeve-form-panel');
    if (!formEl) return;

    formEl.innerHTML = `
        <form id="sleeve-main-form" onsubmit="onSaveSleeveSubmit(event)">
            
            <div style="display:grid; grid-template-columns: 1fr 2fr; gap:12px; margin-bottom:12px;">
                <div>
                    <label class="admin-form-label">CÓDIGO SECUENCIAL</label>
                    <input type="text" id="form-sleeve-code" class="admin-form-input" value="${s.code}" ${isEditing ? 'readonly' : ''} required oninput="onLivePreviewChange()">
                </div>
                <div>
                    <label class="admin-form-label">NOMBRE DE LA FUNDA</label>
                    <input type="text" id="form-sleeve-name" class="admin-form-input" value="${s.name || ''}" placeholder="Ej: Funda Dragón Blanco Cósmico" required oninput="onLivePreviewChange()">
                </div>
            </div>

            <div style="margin-bottom:12px;">
                <label class="admin-form-label">DESCRIPCIÓN</label>
                <textarea id="form-sleeve-desc" class="admin-form-input" style="height:55px; resize:none;" placeholder="Breve reseña de la funda..." oninput="onLivePreviewChange()">${s.description || ''}</textarea>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; margin-bottom:12px;">
                <div>
                    <label class="admin-form-label">BANNER / OFERTA</label>
                    <input type="text" id="form-sleeve-banner" class="admin-form-input" value="${s.offer_text || ''}" placeholder="Ej: NUEVO, EXCLUSIVO" oninput="onLivePreviewChange()">
                </div>
                <div>
                    <label class="admin-form-label">MONEDA</label>
                    <select id="form-sleeve-currency" class="admin-form-input" onchange="onLivePreviewChange()">
                        <option value="STARSHIPS" ${s.currency === 'STARSHIPS' ? 'selected' : ''}>STARSHIPS (⭐)</option>
                        <option value="USD" ${s.currency === 'USD' ? 'selected' : ''}>DÓLARES ($ USD)</option>
                    </select>
                </div>
                <div>
                    <label class="admin-form-label">PRECIO</label>
                    <input type="number" id="form-sleeve-price" class="admin-form-input" value="${s.price || 0}" step="any" min="0" required oninput="onLivePreviewChange()">
                </div>
            </div>

            <!-- ORIGEN DE LA IMAGEN (LOCAL O WEB) -->
            <div style="background:rgba(0,0,0,0.35); border:1px solid rgba(0,240,255,0.2); padding:12px; margin-bottom:14px; border-radius:4px;">
                <label class="admin-form-label" style="color:var(--accent-cyan); margin-bottom:8px;">IMAGEN / REVERSO DE LA FUNDA</label>
                
                <div style="display:flex; gap:16px; margin-bottom:8px;">
                    <label style="font-size:10px; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                        <input type="radio" name="imageSource" value="device" checked onchange="toggleImageInputMode('device')">
                        SUBIR DESDE EL DISPOSITIVO
                    </label>
                    <label style="font-size:10px; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                        <input type="radio" name="imageSource" value="url" onchange="toggleImageInputMode('url')">
                        INGRESAR LINK / URL WEB
                    </label>
                </div>

                <div id="device-upload-box" style="margin-bottom:6px;">
                    <input type="file" id="form-sleeve-file" accept="image/png, image/jpeg, image/webp" class="admin-form-input" onchange="onLocalFileSelected(event)">
                    <div style="font-size:8.5px; color:#94a3b8; margin-top:4px;">
                        Formatos recomendados: PNG, JPG, WEBP. Relación de aspecto vertical oficial para cartas.
                    </div>
                </div>

                <div id="url-upload-box" style="display:none; margin-bottom:6px;">
                    <input type="text" id="form-sleeve-url" class="admin-form-input" value="${s.image || ''}" placeholder="https://... o /assets/images/sleeves/..." oninput="onUrlInputChanged(this)">
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
                <label style="display:inline-flex; align-items:center; gap:8px; font-size:10.5px; font-weight:700; cursor:pointer;">
                    <input type="checkbox" id="form-sleeve-active" ${s.active !== false ? 'checked' : ''} onchange="onLivePreviewChange()">
                    <span>ESTADO ACTIVO EN TIENDA</span>
                </label>

                <span style="font-size:9.5px; color:#10b981; font-weight:700;">
                    VITALICIO (SIN EXPIRACIÓN)
                </span>
            </div>

            <div style="display:flex; gap:12px; justify-content:flex-end;">
                <a href="fundas.html" class="btn-shop-back" style="display:inline-flex; align-items:center;">
                    CANCELAR
                </a>
                <button type="submit" id="btn-save-sleeve" class="btn-act-sm btn-act-activate" style="height:32px; padding:0 22px; font-size:10px;">
                    GUARDAR FUNDA
                </button>
            </div>

        </form>
    `;
}

function toggleImageInputMode(mode) {
    const devBox = document.getElementById('device-upload-box');
    const urlBox = document.getElementById('url-upload-box');
    if (mode === 'device') {
        if (devBox) devBox.style.display = 'block';
        if (urlBox) urlBox.style.display = 'none';
    } else {
        if (devBox) devBox.style.display = 'none';
        if (urlBox) urlBox.style.display = 'block';
    }
}

function onLocalFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop() || 'png';
    currentUploadedExtension = ext;

    const reader = new FileReader();
    reader.onload = function(e) {
        currentUploadedImageBase64 = e.target.result;
        onLivePreviewChange();
    };
    reader.readAsDataURL(file);
}

function onUrlInputChanged(input) {
    currentUploadedImageBase64 = null;
    onLivePreviewChange();
}

function getCurrentFormData() {
    const code = (document.getElementById('form-sleeve-code')?.value || 'SLV-001').trim();
    const name = (document.getElementById('form-sleeve-name')?.value || '').trim();
    const description = (document.getElementById('form-sleeve-desc')?.value || '').trim();
    const banner = (document.getElementById('form-sleeve-banner')?.value || '').trim();
    const currency = (document.getElementById('form-sleeve-currency')?.value || 'STARSHIPS').toUpperCase();
    const price = parseFloat(document.getElementById('form-sleeve-price')?.value || 0);
    const active = document.getElementById('form-sleeve-active')?.checked ?? true;

    let image = `/assets/images/sleeves/${code}.png`;
    if (currentUploadedImageBase64) {
        image = currentUploadedImageBase64;
    } else {
        const urlVal = document.getElementById('form-sleeve-url')?.value?.trim();
        if (urlVal) image = urlVal;
    }

    return {
        code,
        name,
        description,
        offer_text: banner,
        currency,
        price,
        image,
        active
    };
}

function onLivePreviewChange() {
    const data = getCurrentFormData();
    renderSleevePreview(data);
}

async function onSaveSleeveSubmit(e) {
    e.preventDefault();
    const data = getCurrentFormData();
    const saveBtn = document.getElementById('btn-save-sleeve');

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'GUARDANDO...';
    }

    try {
        // Si hay una imagen cargada en base64, subirla primero al servidor
        if (currentUploadedImageBase64) {
            const uploadedUrl = await window.SleevesManager.uploadImage(data.code, currentUploadedImageBase64, currentUploadedExtension);
            if (uploadedUrl) {
                data.image = uploadedUrl;
            }
        }

        if (editingSleeveCode) {
            await window.SleevesManager.updateSleeve(data.code, data);
        } else {
            await window.SleevesManager.createSleeve(data);
        }

        alert(`Funda ${data.code} guardada exitosamente.`);
        window.location.href = 'fundas.html';
    } catch (err) {
        console.error('Error al guardar funda:', err);
        alert('Error al guardar la funda: ' + err.message);
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'GUARDAR FUNDA';
        }
    }
}
