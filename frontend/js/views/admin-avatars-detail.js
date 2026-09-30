/**
 * ANI-DIMENSION: LÓGICA DE EDICIÓN Y CREACIÓN DE AVATAR (ADMINISTRACIÓN)
 * FORMULARIO COMPLETO A LA DERECHA CON VISTA PREVIA EN VIVO A LA IZQUIERDA
 */
let currentAdminAvatar = null;
let isCreateMode = false;
let uploadedImageDataUrl = null;

document.addEventListener('DOMContentLoaded', () => {
    initAdminAvatarDetailView();
});

function initAdminAvatarDetailView() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const code = urlParams.get('avatar_code');

    const avatars = window.AvatarsManager ? window.AvatarsManager.getAvatars() : [];

    if (mode === 'new') {
        isCreateMode = true;
        // Generar siguiente código automático (ej: AVA-156)
        const maxId = avatars.reduce((max, a) => {
            const num = parseInt(a.code.replace('AVA-', '')) || 0;
            return num > max ? num : max;
        }, 0);
        const nextCode = 'AVA-' + String(maxId + 1).padStart(3, '0');

        currentAdminAvatar = {
            code: nextCode,
            name: `Avatar ${nextCode}`,
            image: `../../../assets/images/avatars/${nextCode}.png`,
            exp_boost: 3.0,
            starships_boost: 2.0,
            luck_boost: 1.0,
            price: 1500,
            offer_text: 'NUEVO',
            active: true
        };
    } else {
        isCreateMode = false;
        currentAdminAvatar = avatars.find(a => a.code === code) || avatars[0];
    }

    if (!currentAdminAvatar) return;

    renderAdminAvatarFormPanel();
    renderAdminAvatarPreviewCard();
}

function renderAdminAvatarFormPanel() {
    const panel = document.getElementById('admin-avatar-form-panel');
    if (!panel || !currentAdminAvatar) return;

    const titleText = isCreateMode ? `CREANDO NUEVO AVATAR` : `EDITANDO AVATAR: ${currentAdminAvatar.code}`;
    document.getElementById('admin-avatar-detail-title').textContent = titleText;

    const isActive = currentAdminAvatar.active !== false;
    const bannerText = currentAdminAvatar.offer_text || 'NUEVO';
    const price = currentAdminAvatar.price !== undefined ? currentAdminAvatar.price : 1500;
    const expBoost = parseFloat(currentAdminAvatar.exp_boost !== undefined ? currentAdminAvatar.exp_boost : 3.0).toFixed(1);
    const starBoost = parseFloat(currentAdminAvatar.starships_boost !== undefined ? currentAdminAvatar.starships_boost : 2.0).toFixed(1);
    const luckBoost = parseFloat(currentAdminAvatar.luck_boost !== undefined ? currentAdminAvatar.luck_boost : 1.0).toFixed(1);
    const imgPath = uploadedImageDataUrl || currentAdminAvatar.image || `../../../assets/images/avatars/${currentAdminAvatar.code}.png`;

    panel.innerHTML = `
        <div style="font-family:'Orbitron', sans-serif; font-size:13px; font-weight:900; color:#ffd700; border-bottom:1px solid rgba(0,240,255,0.3); padding-bottom:8px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
            <span>${isCreateMode ? '➕ FORMULARIO REGISTRO NUEVO AVATAR' : '⚙️ PERSONALIZACIÓN DE AVATAR'}</span>
            <span style="font-size:10px; color:#00f0ff;">${currentAdminAvatar.code}</span>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
            
            <!-- CÓDIGO DEL AVATAR -->
            <div>
                <label style="display:block; font-size:9.5px; font-weight:800; color:#cbd5e1; font-family:'Orbitron', sans-serif; margin-bottom:3px;">Código Avatar (ID Único):</label>
                <input type="text" id="edit-avatar-code" value="${currentAdminAvatar.code}" ${!isCreateMode ? 'readonly' : ''} oninput="updateLivePreview()" style="width:100%; padding:6px 10px; font-size:11px; font-family:'Orbitron', sans-serif; font-weight:900; background:rgba(0,0,0,0.6); border:1px solid rgba(0,240,255,0.4); border-radius:4px; color:#00f0ff; outline:none; box-sizing:border-box;">
            </div>

            <!-- NOMBRE DEL AVATAR -->
            <div>
                <label style="display:block; font-size:9.5px; font-weight:800; color:#cbd5e1; font-family:'Orbitron', sans-serif; margin-bottom:3px;">Nombre del Avatar:</label>
                <input type="text" id="edit-avatar-name" value="${currentAdminAvatar.name}" oninput="updateLivePreview()" style="width:100%; padding:6px 10px; font-size:11px; font-family:'Outfit', sans-serif; background:rgba(0,0,0,0.6); border:1px solid rgba(0,240,255,0.4); border-radius:4px; color:#fff; outline:none; box-sizing:border-box;">
            </div>

        </div>

        <!-- SELECCIÓN Y SUBIDA DE IMAGEN -->
        <div style="margin-bottom:14px; background:rgba(0,0,0,0.3); border:1px dashed rgba(0,240,255,0.3); padding:10px; border-radius:6px;">
            <label style="display:block; font-size:9.5px; font-weight:800; color:#00f0ff; font-family:'Orbitron', sans-serif; margin-bottom:6px;">🖼️ Imagen del Avatar (Subir del Dispositivo o Server):</label>
            
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <input type="file" id="edit-avatar-file-input" accept="image/*" onchange="handleAvatarFileUpload(this)" style="display:none;">
                <button type="button" onclick="document.getElementById('edit-avatar-file-input').click()" style="padding:6px 12px; font-family:'Orbitron', sans-serif; font-size:9.5px; font-weight:800; background:linear-gradient(135deg, #00f0ff, #0072ff); color:#020617; border:none; border-radius:4px; cursor:pointer; box-shadow:0 0 8px rgba(0,240,255,0.3);">
                    📁 Seleccionar Archivo...
                </button>

                <input type="text" id="edit-avatar-image-path" value="${imgPath.startsWith('data:') ? 'Imagen Cargada' : imgPath}" placeholder="assets/images/avatars/AVA-XXX.png" oninput="updateLivePreview()" style="flex:1; min-width:180px; padding:6px 10px; font-size:10px; font-family:'Outfit', sans-serif; background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#94a3b8; outline:none;">
            </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
            
            <!-- TEXTO DEL BANNER -->
            <div>
                <label style="display:block; font-size:9.5px; font-weight:800; color:#cbd5e1; font-family:'Orbitron', sans-serif; margin-bottom:3px;">Texto Banner (Máx 12 Caracteres):</label>
                <input type="text" id="edit-avatar-banner" value="${bannerText}" maxlength="12" placeholder="NUEVO" oninput="updateLivePreview()" style="width:100%; padding:6px 10px; font-size:11px; font-family:'Orbitron', sans-serif; font-weight:900; background:rgba(0,0,0,0.6); border:1px solid #ffd700; border-radius:4px; color:#ffd700; outline:none; box-sizing:border-box;">
            </div>

            <!-- PRECIO EN STARSHIPS -->
            <div>
                <label style="display:block; font-size:9.5px; font-weight:800; color:#cbd5e1; font-family:'Orbitron', sans-serif; margin-bottom:3px;">Precio (StarShips ⭐):</label>
                <input type="number" id="edit-avatar-price" value="${price}" min="0" placeholder="1500" oninput="updateLivePreview()" style="width:100%; padding:6px 10px; font-size:11px; font-family:'Orbitron', sans-serif; font-weight:900; background:rgba(0,0,0,0.6); border:1px solid #ffd700; border-radius:4px; color:#ffd700; outline:none; box-sizing:border-box;">
            </div>

        </div>

        <!-- SECCIÓN DE POTENCIADORES DECIMALES -->
        <div style="background:rgba(15,23,42,0.85); border:1px solid rgba(255,255,255,0.1); padding:10px; border-radius:6px; margin-bottom:14px;">
            <div style="font-size:9.5px; font-weight:800; color:#94a3b8; font-family:'Orbitron', sans-serif; margin-bottom:8px;">🚀 POTENCIADORES BOOSTER (% DECIMALES):</div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
                <div>
                    <label style="display:block; font-size:8.5px; font-weight:800; color:#10b981; font-family:'Orbitron', sans-serif; margin-bottom:2px;">EXP Boost (%):</label>
                    <input type="number" id="edit-avatar-exp" value="${expBoost}" step="0.1" min="0" max="100" oninput="updateLivePreview()" style="width:100%; padding:5px 6px; font-size:10.5px; font-family:'Orbitron', sans-serif; font-weight:900; background:rgba(0,0,0,0.6); border:1px solid #10b981; color:#10b981; border-radius:4px; outline:none; text-align:center; box-sizing:border-box;">
                </div>

                <div>
                    <label style="display:block; font-size:8.5px; font-weight:800; color:#ffd700; font-family:'Orbitron', sans-serif; margin-bottom:2px;">Starships (%):</label>
                    <input type="number" id="edit-avatar-star" value="${starBoost}" step="0.1" min="0" max="100" oninput="updateLivePreview()" style="width:100%; padding:5px 6px; font-size:10.5px; font-family:'Orbitron', sans-serif; font-weight:900; background:rgba(0,0,0,0.6); border:1px solid #ffd700; color:#ffd700; border-radius:4px; outline:none; text-align:center; box-sizing:border-box;">
                </div>

                <div>
                    <label style="display:block; font-size:8.5px; font-weight:800; color:#00f0ff; font-family:'Orbitron', sans-serif; margin-bottom:2px;">Suerte (%):</label>
                    <input type="number" id="edit-avatar-luck" value="${luckBoost}" step="0.1" min="0" max="100" oninput="updateLivePreview()" style="width:100%; padding:5px 6px; font-size:10.5px; font-family:'Orbitron', sans-serif; font-weight:900; background:rgba(0,0,0,0.6); border:1px solid #00f0ff; color:#00f0ff; border-radius:4px; outline:none; text-align:center; box-sizing:border-box;">
                </div>
            </div>
        </div>

        <!-- ESTADO ACTIVO / DESACTIVADO -->
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(15,23,42,0.9); border:1px solid rgba(255,255,255,0.15); padding:8px 12px; border-radius:6px; margin-bottom:16px;">
            <span style="font-family:'Orbitron', sans-serif; font-size:10px; font-weight:800; color:#fff;">Estado en la Tienda:</span>
            
            <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                <input type="checkbox" id="edit-avatar-active" ${isActive ? 'checked' : ''} onchange="updateLivePreview()" style="accent-color:#10b981; width:16px; height:16px; cursor:pointer;">
                <span id="active-status-lbl" style="font-family:'Orbitron', sans-serif; font-size:10px; font-weight:900; color:${isActive ? '#10b981' : '#ef4444'}; text-transform:uppercase;">
                    ${isActive ? 'ACTIVO (DISPONIBLE)' : 'DESACTIVADO (OCULTO)'}
                </span>
            </label>
        </div>

        <!-- BOTONES DE ACCIÓN -->
        <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button type="button" onclick="location.href='avatars.html'" style="padding:8px 16px; font-family:'Orbitron', sans-serif; font-size:9.5px; font-weight:800; color:#94a3b8; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); border-radius:4px; cursor:pointer;">
                CANCELAR
            </button>

            <button type="button" onclick="saveAdminAvatarChanges()" style="padding:8px 20px; font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:900; color:#020617; background:linear-gradient(90deg, #10b981, #34d399); border:none; border-radius:4px; cursor:pointer; box-shadow:0 0 14px rgba(16,185,129,0.5);">
                💾 ${isCreateMode ? 'REGISTRAR AVATAR' : 'GUARDAR CAMBIOS'}
            </button>
        </div>
    `;
}

function handleAvatarFileUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedImageDataUrl = e.target.result;
            const pathInput = document.getElementById('edit-avatar-image-path');
            if (pathInput) pathInput.value = file.name;
            renderAdminAvatarPreviewCard();
        };
        reader.readAsDataURL(file);
    }
}

function renderAdminAvatarPreviewCard() {
    const card = document.getElementById('admin-avatar-preview-card');
    if (!card || !currentAdminAvatar) return;

    const codeInput = document.getElementById('edit-avatar-code');
    const nameInput = document.getElementById('edit-avatar-name');
    const pathInput = document.getElementById('edit-avatar-image-path');
    const bannerInput = document.getElementById('edit-avatar-banner');
    const priceInput = document.getElementById('edit-avatar-price');
    const expInput = document.getElementById('edit-avatar-exp');
    const starInput = document.getElementById('edit-avatar-star');
    const luckInput = document.getElementById('edit-avatar-luck');
    const activeInput = document.getElementById('edit-avatar-active');

    const code = codeInput ? codeInput.value.trim().toUpperCase() : currentAdminAvatar.code;
    const name = nameInput ? nameInput.value.trim() : currentAdminAvatar.name;
    const banner = bannerInput ? bannerInput.value.trim().toUpperCase() : (currentAdminAvatar.offer_text || 'NUEVO');
    const price = priceInput ? parseInt(priceInput.value) || 0 : currentAdminAvatar.price;
    const exp = expInput ? parseFloat(expInput.value) || 0 : currentAdminAvatar.exp_boost;
    const star = starInput ? parseFloat(starInput.value) || 0 : currentAdminAvatar.starships_boost;
    const luck = luckInput ? parseFloat(luckInput.value) || 0 : currentAdminAvatar.luck_boost;
    const isActive = activeInput ? activeInput.checked : currentAdminAvatar.active !== false;

    // Actualizar etiqueta del checkbox activo
    const statusLbl = document.getElementById('active-status-lbl');
    if (statusLbl) {
        statusLbl.textContent = isActive ? 'ACTIVO (DISPONIBLE)' : 'DESACTIVADO (OCULTO)';
        statusLbl.style.color = isActive ? '#10b981' : '#ef4444';
    }

    let imgSrc = uploadedImageDataUrl;
    if (!imgSrc) {
        if (pathInput && pathInput.value && !pathInput.value.includes('Imagen Cargada')) {
            imgSrc = pathInput.value;
        } else {
            imgSrc = currentAdminAvatar.image || `../../../assets/images/avatars/${code}.png`;
        }
    }

    card.innerHTML = `
        <!-- CINTA DIAGONAL DE OFERTA EN AMARILLO NEÓN -->
        <div style="position:absolute; top:32px; left:-50px; width:200px; transform:rotate(-35deg); background:linear-gradient(135deg, #ffd700 0%, #f59e0b 100%); color:#020617; font-family:'Orbitron', sans-serif; font-size:10px; font-weight:900; padding:5px 0; text-transform:uppercase; letter-spacing:0.4px; box-shadow:0 3px 12px rgba(0,0,0,0.5); z-index:10; pointer-events:none; border-top:1.2px solid #ffffff; border-bottom:1.5px solid rgba(0,0,0,0.6); text-align:center;">
            ${banner || 'NUEVO'}
        </div>

        <div style="font-family:'Orbitron', sans-serif; font-size:12px; font-weight:900; color:#00f0ff; margin-bottom:8px;">${code}</div>

        <div style="width:110px; height:110px; margin:0 auto 10px auto; overflow:visible; background:transparent; display:flex; align-items:center; justify-content:center;">
            <img src="${imgSrc}" onerror="this.onerror=null; this.src='../../../assets/images/avatars/AVA-002.png';" style="max-width:100%; max-height:100%; object-fit:contain; filter:${isActive ? 'none' : 'grayscale(0.8) opacity(0.7)'};">
        </div>

        <!-- POTENCIADORES -->
        <div style="background:rgba(15,23,42,0.9); border:1px solid rgba(0,240,255,0.3); padding:8px 12px; border-radius:6px; font-family:'Orbitron', sans-serif; font-size:9.5px; display:flex; flex-direction:column; gap:4px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; color:#10b981;">
                <span>⚡ EXP Boost:</span> <b>+${exp.toFixed(1)}%</b>
            </div>
            <div style="display:flex; justify-content:space-between; color:#ffd700;">
                <span>⭐ StarShips Boost:</span> <b>+${star.toFixed(1)}%</b>
            </div>
            <div style="display:flex; justify-content:space-between; color:#00f0ff;">
                <span>🍀 Suerte Boost:</span> <b>+${luck.toFixed(1)}%</b>
            </div>
        </div>

        <div style="font-family:'Orbitron', sans-serif; font-size:12px; font-weight:900; color:#ffd700;">
            ⭐ ${price.toLocaleString()} StarShips
        </div>
    `;
}

function updateLivePreview() {
    renderAdminAvatarPreviewCard();
}

function switchToNewAvatarForm() {
    location.href = 'avatars-detalle.html?mode=new';
}

function saveAdminAvatarChanges() {
    if (!currentAdminAvatar) return;

    const codeInput = document.getElementById('edit-avatar-code');
    const nameInput = document.getElementById('edit-avatar-name');
    const pathInput = document.getElementById('edit-avatar-image-path');
    const bannerInput = document.getElementById('edit-avatar-banner');
    const priceInput = document.getElementById('edit-avatar-price');
    const expInput = document.getElementById('edit-avatar-exp');
    const starInput = document.getElementById('edit-avatar-star');
    const luckInput = document.getElementById('edit-avatar-luck');
    const activeInput = document.getElementById('edit-avatar-active');

    const avatars = window.AvatarsManager.getAvatars();
    const code = codeInput ? codeInput.value.trim().toUpperCase() : currentAdminAvatar.code;
    const name = nameInput ? nameInput.value.trim() : currentAdminAvatar.name;
    const offerText = bannerInput ? bannerInput.value.trim().toUpperCase() : 'NUEVO';
    const price = priceInput ? Math.max(0, parseInt(priceInput.value) || 0) : 1500;
    const expBoost = expInput ? Math.max(0, parseFloat(expInput.value) || 0) : 3.0;
    const starBoost = starInput ? Math.max(0, parseFloat(starInput.value) || 0) : 2.0;
    const luckBoost = luckInput ? Math.max(0, parseFloat(luckInput.value) || 0) : 1.0;
    const active = activeInput ? activeInput.checked : true;

    let image = uploadedImageDataUrl;
    if (!image) {
        if (pathInput && pathInput.value && !pathInput.value.includes('Imagen Cargada')) {
            image = pathInput.value;
        } else {
            image = `../../../assets/images/avatars/${code}.png`;
        }
    }

    let existingAvatar = avatars.find(a => a.code === code);

    if (existingAvatar) {
        // Actualización de avatar existente
        existingAvatar.name = name;
        existingAvatar.image = image;
        existingAvatar.offer_text = offerText;
        existingAvatar.price = price;
        existingAvatar.exp_boost = expBoost;
        existingAvatar.starships_boost = starBoost;
        existingAvatar.luck_boost = luckBoost;
        existingAvatar.active = active;
    } else {
        // Creación de nuevo avatar
        const newAvatarObj = {
            code: code,
            name: name,
            image: image,
            exp_boost: expBoost,
            starships_boost: starBoost,
            luck_boost: luckBoost,
            price: price,
            offer_text: offerText,
            active: active
        };
        avatars.push(newAvatarObj);
    }

    window.AvatarsManager.saveAvatars(avatars);

    if (window.showAniModal) {
        window.showAniModal('Avatar Guardado', `¡El avatar ${code} ha sido guardado exitosamente en el servidor!`, 'success');
    } else {
        alert(`¡El avatar ${code} ha sido guardado exitosamente!`);
    }

    setTimeout(() => {
        location.href = 'avatars.html';
    }, 1200);
}
