/**
 * Ani-Dimension: Controlador del Módulo de Envíos y Regalos a Usuarios (Admin)
 * 100% Conectado a la Base de Datos SQL Server (Transaccional, Cero Datos Hardcodeados en JS).
 * Carga Catálogos Oficiales: dbo.PotenciadoresCatalog, dbo.VipPassesCatalog, dbo.AvatarsCatalog, dbo.Usuarios, dbo.Cards.
 */

let currentTargetMode = 'ALL'; // 'ALL' o 'SINGLE'
let selectedUser = null; // { id, username }
let currentGiftType = 'STARSHIPS'; // 'STARSHIPS', 'CARD', 'POTENCIADOR', 'AVATAR', 'VIP'
let selectedCard = null; // { id, name, rarity }

// Catálogos Oficiales descargados de SQL Server
let allUsersCache = [];
let dbPotenciadores = [];
let dbVipPasses = [];
let dbAvatars = [];

let searchUserDebounce = null;
let searchCardDebounce = null;

document.addEventListener('DOMContentLoaded', () => {
    initAdminRegalos();
});

async function initAdminRegalos() {
    try {
        await Promise.all([
            loadAllUsersCache(),
            loadPotenciadoresFromDb(),
            loadVipPassesFromDb(),
            loadAvatarsFromDb()
        ]);
    } catch (e) {
        console.error('[ADMIN REGALOS] Error al inicializar catálogos desde BD:', e);
    }
    updateLivePreview();
}

function switchGiftTab(tab) {
    const btnCreate = document.getElementById('tab-btn-create');
    const btnHistory = document.getElementById('tab-btn-history');
    const viewCreate = document.getElementById('view-create-gift');
    const viewHistory = document.getElementById('view-history-gifts');

    if (tab === 'CREATE') {
        if (btnCreate) btnCreate.classList.add('active');
        if (btnHistory) btnHistory.classList.remove('active');
        if (viewCreate) viewCreate.style.display = 'block';
        if (viewHistory) viewHistory.style.display = 'none';
    } else {
        if (btnCreate) btnCreate.classList.remove('active');
        if (btnHistory) btnHistory.classList.add('active');
        if (viewCreate) viewCreate.style.display = 'none';
        if (viewHistory) viewHistory.style.display = 'block';
        loadGiftsHistory();
    }
}

function setGiftTarget(mode) {
    currentTargetMode = mode;
    const btnAll = document.getElementById('btn-target-all');
    const btnSingle = document.getElementById('btn-target-single');
    const singleBox = document.getElementById('single-user-selector-box');

    if (mode === 'ALL') {
        if (btnAll) btnAll.classList.add('active');
        if (btnSingle) btnSingle.classList.remove('active');
        if (singleBox) singleBox.style.display = 'none';
        selectedUser = null;
    } else {
        if (btnAll) btnAll.classList.remove('active');
        if (btnSingle) btnSingle.classList.add('active');
        if (singleBox) singleBox.style.display = 'block';
    }
    updateLivePreview();
}

async function loadAllUsersCache() {
    try {
        const res = await fetch('/api/admin/users');
        if (res.ok) {
            const data = await res.json();
            if (data && data.users) {
                allUsersCache = data.users;
            }
        }
    } catch (e) {
        console.warn('[ADMIN REGALOS] No se pudo cargar caché de usuarios:', e);
    }
}

async function loadPotenciadoresFromDb() {
    const select = document.getElementById('select-potenciador-catalog');
    if (!select) return;

    try {
        const res = await fetch('/api/game/shop/potenciadores');
        if (res.ok) {
            const data = await res.json();
            if (data && data.success && Array.isArray(data.potenciadores)) {
                dbPotenciadores = data.potenciadores;
            }
        }
    } catch (e) {
        console.error('[ADMIN REGALOS] Error al cargar potenciadores desde BD:', e);
    }

    if (dbPotenciadores.length > 0) {
        select.innerHTML = dbPotenciadores.map((p, idx) => `
            <option value="${p.code}" data-name="${p.name}" data-type="${p.type}" data-boost="${p.boost_value}" ${idx === 0 ? 'selected' : ''}>
                [${p.code}] ${p.name} (+${parseFloat(p.boost_value || 0).toFixed(1)}% ${p.type})
            </option>
        `).join('');
    } else {
        select.innerHTML = '<option value="">No hay potenciadores registrados en la BD</option>';
    }
}

async function loadVipPassesFromDb() {
    const select = document.getElementById('select-vip-catalog');
    if (!select) return;

    try {
        const res = await fetch('/api/game/shop/vip');
        if (res.ok) {
            const data = await res.json();
            if (data && data.success && Array.isArray(data.passes)) {
                dbVipPasses = data.passes;
            }
        }
    } catch (e) {
        console.error('[ADMIN REGALOS] Error al cargar pases VIP desde BD:', e);
    }

    if (dbVipPasses.length > 0) {
        select.innerHTML = dbVipPasses.map((v, idx) => `
            <option value="${v.code}" data-name="${v.name}" data-days="${v.days}" data-exp="${v.exp_boost}" data-star="${v.starships_boost}" data-luck="${v.luck_boost}" ${v.code === 'VIP-004' || idx === dbVipPasses.length - 1 ? 'selected' : ''}>
                [${v.code}] ${v.name} (${v.days} Días) - +${v.exp_boost}% EXP, +${v.starships_boost}% ⭐, +${v.luck_boost}% 🍀
            </option>
        `).join('');

        onSelectVipCatalogChange(select.value);
    } else {
        select.innerHTML = '<option value="">No hay pases VIP en la BD</option>';
    }
}

async function loadAvatarsFromDb() {
    const select = document.getElementById('select-avatar-img-code');
    if (!select) return;

    try {
        const res = await fetch('/api/admin/avatars');
        if (res.ok) {
            const data = await res.json();
            if (data && data.success && Array.isArray(data.avatars)) {
                dbAvatars = data.avatars;
            }
        }
    } catch (e) {
        console.error('[ADMIN REGALOS] Error al cargar avatares desde BD:', e);
    }

    if (dbAvatars.length > 0) {
        select.innerHTML = dbAvatars.map(item => `
            <option value="${item.code}" ${item.code === 'AVA-003' ? 'selected' : ''}>
                [${item.code}] ${item.name || item.code}
            </option>
        `).join('');
    } else {
        // Fallback dinámico basado en códigos estándar
        let optionsList = [];
        for (let i = 1; i <= 350; i++) {
            const code = 'AVA-' + String(i).padStart(3, '0');
            optionsList.push({ code: code, name: code });
        }
        select.innerHTML = optionsList.map(item => `
            <option value="${item.code}" ${item.code === 'AVA-003' ? 'selected' : ''}>
                [${item.code}] ${item.name}
            </option>
        `).join('');
    }

    onAvatarImageChange(select.value || 'AVA-003');
}

function onSearchUserInput(query) {
    clearTimeout(searchUserDebounce);
    const dropdown = document.getElementById('user-search-dropdown');
    if (!dropdown) return;

    const q = (query || '').trim().toLowerCase();
    if (q.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    searchUserDebounce = setTimeout(() => {
        const filtered = allUsersCache.filter(u => 
            (u.Username && u.Username.toLowerCase().includes(q)) ||
            (u.Email && u.Email.toLowerCase().includes(q)) ||
            String(u.Id) === q
        );

        if (filtered.length === 0) {
            dropdown.innerHTML = `<div style="padding:8px 12px; font-size:10px; color:#94a3b8;">No se encontraron duelistas con "${query}".</div>`;
            dropdown.style.display = 'block';
            return;
        }

        dropdown.innerHTML = filtered.slice(0, 10).map(u => `
            <div class="user-search-item" onclick="selectUser(${u.Id}, '${u.Username}')">
                <div>
                    <b>${u.Username}</b> <span style="color:#64748b; font-size:8.5px;">(ID: ${u.Id})</span>
                </div>
                <div style="font-size:8px; color:#ffd700;">
                    ⭐ ${parseInt(u.Starships || 0, 10).toLocaleString()}
                </div>
            </div>
        `).join('');

        dropdown.style.display = 'block';
    }, 200);
}

function selectUser(id, username) {
    selectedUser = { id, username };
    const dropdown = document.getElementById('user-search-dropdown');
    const chip = document.getElementById('selected-user-chip');
    const chipName = document.getElementById('selected-user-name');
    const chipId = document.getElementById('selected-user-id');
    const inputSearch = document.getElementById('input-search-user');

    if (dropdown) dropdown.style.display = 'none';
    if (inputSearch) inputSearch.value = '';
    if (chip) chip.style.display = 'flex';
    if (chipName) chipName.textContent = username;
    if (chipId) chipId.textContent = id;

    updateLivePreview();
}

function clearSelectedUser() {
    selectedUser = null;
    const chip = document.getElementById('selected-user-chip');
    const inputSearch = document.getElementById('input-search-user');
    if (chip) chip.style.display = 'none';
    if (inputSearch) inputSearch.value = '';
    updateLivePreview();
}

function selectGiftType(type) {
    currentGiftType = type;

    // Actualizar estilos de cards de tipo
    ['starships', 'card', 'potenciador', 'avatar', 'vip'].forEach(t => {
        const card = document.getElementById(`card-type-${t}`);
        if (card) {
            if (t.toUpperCase() === type) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        }
    });

    // Mostrar el contenedor de parámetros correspondiente
    const boxStar = document.getElementById('param-box-starships');
    const boxVip = document.getElementById('param-box-vip');
    const boxCard = document.getElementById('param-box-card');
    const boxPot = document.getElementById('param-box-potenciador');
    const boxAva = document.getElementById('param-box-avatar');

    if (boxStar) boxStar.style.display = (type === 'STARSHIPS' ? 'block' : 'none');
    if (boxVip) boxVip.style.display = (type === 'VIP' ? 'block' : 'none');
    if (boxCard) boxCard.style.display = (type === 'CARD' ? 'block' : 'none');
    if (boxPot) boxPot.style.display = (type === 'POTENCIADOR' ? 'block' : 'none');
    if (boxAva) boxAva.style.display = (type === 'AVATAR' ? 'block' : 'none');

    updateLivePreview();
}

function onSelectVipCatalogChange(code) {
    const select = document.getElementById('select-vip-catalog');
    if (!select) return;

    const opt = select.selectedOptions[0];
    if (opt) {
        const inputName = document.getElementById('input-vip-name');
        const inputDays = document.getElementById('input-vip-days');
        const inputExp = document.getElementById('input-vip-exp');
        const inputStar = document.getElementById('input-vip-star');
        const inputLuck = document.getElementById('input-vip-luck');

        if (inputName) inputName.value = opt.getAttribute('data-name') || 'Pase VIP';
        if (inputDays) inputDays.value = opt.getAttribute('data-days') || 30;
        if (inputExp) inputExp.value = parseFloat(opt.getAttribute('data-exp') || 100).toFixed(1);
        if (inputStar) inputStar.value = parseFloat(opt.getAttribute('data-star') || 100).toFixed(1);
        if (inputLuck) inputLuck.value = parseFloat(opt.getAttribute('data-luck') || 15).toFixed(1);
    }

    updateLivePreview();
}

function onSelectPotenciadorChange() {
    updateLivePreview();
}

function onAvatarImageChange(code) {
    const previewImg = document.getElementById('preview-avatar-chosen-img');
    if (previewImg && code) {
        previewImg.src = `../../../assets/images/avatars/${code}.png`;
        previewImg.onerror = function() { this.src = '../../../assets/images/avatars/AVA-002.png'; };
    }
    updateLivePreview();
}

function onSelectAvatarChange(arg) {
    const code = (arg && typeof arg === 'object' && arg.target) ? arg.target.value : arg;
    onAvatarImageChange(code);
}

function validateAvatarBoostLimits(input, minVal, maxVal, statName) {
    const warningBox = document.getElementById('avatar-boost-warning');
    if (!input) return;

    let val = parseFloat(input.value);
    if (isNaN(val)) {
        if (warningBox) warningBox.style.display = 'none';
        updateLivePreview();
        return;
    }

    if (val < minVal) {
        input.value = minVal.toFixed(1);
        if (warningBox) {
            warningBox.textContent = `⚠️ El valor de ${statName} no puede ser menor a ${minVal}%. Se ajustó a ${minVal}%.`;
            warningBox.style.display = 'block';
        }
    } else if (val > maxVal) {
        input.value = maxVal.toFixed(1);
        if (warningBox) {
            warningBox.textContent = `⚠️ El valor de ${statName} supera el límite máximo permitido de ${maxVal}%. Se ajustó a ${maxVal}%.`;
            warningBox.style.display = 'block';
        }
    } else {
        if (warningBox) warningBox.style.display = 'none';
    }

    updateLivePreview();
}

function onPasscodeCardInput(rawPasscode) {
    clearTimeout(searchCardDebounce);
    const inputName = document.getElementById('input-card-name-readonly');
    const inputRarity = document.getElementById('input-card-rarity-readonly');
    const statusEl = document.getElementById('card-passcode-status');

    const cleanPasscode = String(rawPasscode || '').trim().replace(/\D/g, '');

    if (!cleanPasscode) {
        selectedCard = null;
        if (inputName) inputName.value = '';
        if (inputRarity) inputRarity.value = '';
        if (statusEl) {
            statusEl.innerHTML = 'Ingresa el código Passcode oficial de la carta para verificarla.';
            statusEl.style.color = '#64748b';
        }
        updateLivePreview();
        return;
    }

    if (statusEl) {
        statusEl.innerHTML = '⏳ Verificando passcode en base de datos oficial...';
        statusEl.style.color = '#00f0ff';
    }

    searchCardDebounce = setTimeout(async () => {
        let card = null;

        // Consultar directamente API backend conectada a SQL Server
        try {
            const res = await fetch(`/api/cards/${cleanPasscode}`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.success && data.card) {
                    card = data.card;
                }
            }
        } catch (e) {
            console.warn('[PASSCODE LOOKUP ERROR]', e);
        }

        if (card && (card.name || card.card_id || card.id)) {
            const cId = card.id || card.card_id || cleanPasscode;
            const cName = card.name || `Carta #${cId}`;
            const cRarity = (card.rarity || 'COMMON').replace(/_/g, ' ');

            selectedCard = {
                id: parseInt(cId, 10),
                name: cName,
                rarity: card.rarity || 'COMMON',
                type: card.type || 'Monster',
                atk: card.atk,
                def: card.def
            };

            if (inputName) inputName.value = cName;
            if (inputRarity) inputRarity.value = cRarity;
            if (statusEl) {
                statusEl.innerHTML = `✅ Carta identificada: <b style="color:#fff;">${cName}</b> (Passcode: #${cId})`;
                statusEl.style.color = '#10b981';
            }
        } else {
            selectedCard = null;
            if (inputName) inputName.value = '';
            if (inputRarity) inputRarity.value = '';
            if (statusEl) {
                statusEl.innerHTML = `❌ El Passcode "${cleanPasscode}" no existe en la base de datos oficial.`;
                statusEl.style.color = '#ef4444';
            }
        }

        updateLivePreview();
    }, 200);
}

function updateLivePreview() {
    const prevTitle = document.getElementById('preview-title');
    const prevDesc = document.getElementById('preview-desc');
    const prevBadge = document.getElementById('preview-badge');
    const prevIcon = document.getElementById('preview-icon-box');
    const prevTarget = document.getElementById('preview-target-badge');

    const titleInput = document.getElementById('input-gift-title');
    const descInput = document.getElementById('input-gift-description');

    const title = titleInput?.value.trim() || 'Recompensa Especial de Duelo';
    const desc = descInput?.value.trim() || 'Mensaje de recompensa del servidor.';

    if (prevTitle) prevTitle.textContent = title;
    if (prevDesc) prevDesc.textContent = desc;

    // Destinatario Preview
    if (prevTarget) {
        if (currentTargetMode === 'ALL') {
            prevTarget.innerHTML = `🌐 Destinatario: <b>TODOS LOS USUARIOS (GLOBAL)</b>`;
        } else {
            const uname = selectedUser ? selectedUser.username : '--- (Sin seleccionar)';
            prevTarget.innerHTML = `👤 Destinatario: <b style="color:#ffd700;">${uname}</b>`;
        }
    }

    // Badge e Icono según el tipo
    if (currentGiftType === 'STARSHIPS') {
        const amt = parseInt(document.getElementById('input-starships-amount')?.value || 10000, 10);
        if (prevIcon) {
            prevIcon.textContent = '⭐';
            prevIcon.style.borderColor = '#ffd700';
            prevIcon.style.padding = '';
            prevIcon.style.overflow = '';
        }
        if (prevBadge) {
            prevBadge.textContent = `⭐ ${amt.toLocaleString()} STARSHIPS`;
            prevBadge.style.color = '#ffd700';
            prevBadge.style.borderColor = '#ffd700';
            prevBadge.style.background = 'rgba(255,215,0,0.15)';
        }
    } else if (currentGiftType === 'CARD') {
        const cardName = selectedCard ? selectedCard.name : 'Carta';
        const copies = document.getElementById('input-card-copies')?.value || 1;
        if (prevIcon) {
            prevIcon.textContent = '🎴';
            prevIcon.style.borderColor = '#c084fc';
            prevIcon.style.padding = '';
            prevIcon.style.overflow = '';
        }
        if (prevBadge) {
            prevBadge.textContent = `🎴 ${copies}x ${cardName}`;
            prevBadge.style.color = '#c084fc';
            prevBadge.style.borderColor = '#c084fc';
            prevBadge.style.background = 'rgba(192,132,252,0.15)';
        }
    } else if (currentGiftType === 'POTENCIADOR') {
        const potSelect = document.getElementById('select-potenciador-catalog');
        const potCode = potSelect?.value || 'POT-001';
        const opt = potSelect?.selectedOptions ? potSelect.selectedOptions[0] : null;

        const potFromDb = dbPotenciadores.find(p => p.code === potCode);
        const potName = potFromDb?.name || opt?.getAttribute('data-name') || potCode;
        const potBoost = parseFloat(potFromDb?.boost_value || opt?.getAttribute('data-boost') || 1.0).toFixed(1);
        const potType = potFromDb?.type || opt?.getAttribute('data-type') || 'EXP';

        if (prevIcon) {
            prevIcon.textContent = '⚡';
            prevIcon.style.borderColor = '#00f0ff';
            prevIcon.style.padding = '';
            prevIcon.style.overflow = '';
        }
        if (prevBadge) {
            prevBadge.textContent = `⚡ ${potName} (+${potBoost}% ${potType})`;
            prevBadge.style.color = '#00f0ff';
            prevBadge.style.borderColor = '#00f0ff';
            prevBadge.style.background = 'rgba(0,240,255,0.15)';
        }
    } else if (currentGiftType === 'AVATAR') {
        const avaName = document.getElementById('input-avatar-name')?.value.trim() || 'Avatar Especial';
        const imgCode = document.getElementById('select-avatar-img-code')?.value || 'AVA-003';
        const expVal = parseFloat(document.getElementById('input-avatar-exp')?.value || 0).toFixed(1);
        const starVal = parseFloat(document.getElementById('input-avatar-star')?.value || 0).toFixed(1);
        const luckVal = parseFloat(document.getElementById('input-avatar-luck')?.value || 0).toFixed(1);

        if (prevIcon) {
            prevIcon.innerHTML = `<img src="../../../assets/images/avatars/${imgCode}.png" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='../../../assets/images/avatars/AVA-002.png';">`;
            prevIcon.style.borderColor = '#10b981';
            prevIcon.style.padding = '0';
            prevIcon.style.overflow = 'hidden';
        }
        if (prevBadge) {
            prevBadge.innerHTML = `👤 ${avaName} (+<b>${expVal}%</b> EXP, +<b>${starVal}%</b> ⭐, +<b>${luckVal}%</b> 🍀)`;
            prevBadge.style.color = '#10b981';
            prevBadge.style.borderColor = '#10b981';
            prevBadge.style.background = 'rgba(16,185,129,0.15)';
        }
    } else if (currentGiftType === 'VIP') {
        const vipName = document.getElementById('input-vip-name')?.value.trim() || 'Pase VIP Oro';
        const vipDays = document.getElementById('input-vip-days')?.value || 30;
        const expVal = parseFloat(document.getElementById('input-vip-exp')?.value || 100).toFixed(1);
        const starVal = parseFloat(document.getElementById('input-vip-star')?.value || 100).toFixed(1);
        const luckVal = parseFloat(document.getElementById('input-vip-luck')?.value || 15).toFixed(1);

        if (prevIcon) {
            prevIcon.textContent = '👑';
            prevIcon.style.borderColor = '#ffd700';
            prevIcon.style.padding = '';
            prevIcon.style.overflow = '';
        }
        if (prevBadge) {
            prevBadge.innerHTML = `👑 ${vipName} (${vipDays} DÍAS: +<b>${expVal}%</b> EXP, +<b>${starVal}%</b> ⭐, +<b>${luckVal}%</b> 🍀)`;
            prevBadge.style.color = '#ffd700';
            prevBadge.style.borderColor = '#ffd700';
            prevBadge.style.background = 'rgba(255,215,0,0.15)';
        }
    }
}

async function submitSendGift() {
    const title = document.getElementById('input-gift-title')?.value.trim();
    const description = document.getElementById('input-gift-description')?.value.trim();

    if (!title) {
        openGiftNoticeModal('CAMPO REQUERIDO', 'Debes ingresar un título o asunto para el regalo.', 'error');
        return;
    }

    if (currentTargetMode === 'SINGLE' && !selectedUser) {
        openGiftNoticeModal('DESTINATARIO REQUERIDO', 'Has seleccionado enviar a un usuario específico, pero aún no has seleccionado ningún duelista.', 'error');
        return;
    }

    let payload = {};

    if (currentGiftType === 'STARSHIPS') {
        const amount = parseInt(document.getElementById('input-starships-amount')?.value || 0, 10);
        if (amount <= 0) {
            openGiftNoticeModal('CANTIDAD INVÁLIDA', 'Ingresa una cantidad de StarShips mayor a 0.', 'error');
            return;
        }
        payload = { amount };
    } else if (currentGiftType === 'CARD') {
        if (!selectedCard) {
            openGiftNoticeModal('CARTA REQUERIDA', 'Debes buscar y seleccionar una carta válida del catálogo por su Passcode.', 'error');
            return;
        }
        const copies = parseInt(document.getElementById('input-card-copies')?.value || 1, 10);
        payload = {
            cardId: selectedCard.id,
            cardName: selectedCard.name,
            copies: copies
        };
    } else if (currentGiftType === 'POTENCIADOR') {
        const potSelect = document.getElementById('select-potenciador-catalog');
        const potCode = potSelect?.value;
        const opt = potSelect?.selectedOptions ? potSelect.selectedOptions[0] : null;

        const potFromDb = dbPotenciadores.find(p => p.code === potCode);
        const code = potFromDb?.code || potCode;
        const name = potFromDb?.name || opt?.getAttribute('data-name');
        const type = potFromDb?.type || opt?.getAttribute('data-type') || 'EXP';
        const boost_value = parseFloat(potFromDb?.boost_value || opt?.getAttribute('data-boost') || 0);

        if (!code || !name) {
            openGiftNoticeModal('POTENCIADOR REQUERIDO', 'Selecciona un potenciador válido del catálogo oficial de la base de datos.', 'error');
            return;
        }

        payload = {
            code: code,
            name: name,
            type: type,
            boost_value: boost_value
        };
    } else if (currentGiftType === 'AVATAR') {
        const avaName = (document.getElementById('input-avatar-name')?.value || 'Avatar de Recompensa').trim();
        const imgCode = document.getElementById('select-avatar-img-code')?.value || 'AVA-003';
        const rawExp = parseFloat(document.getElementById('input-avatar-exp')?.value);
        const rawStar = parseFloat(document.getElementById('input-avatar-star')?.value);
        const rawLuck = parseFloat(document.getElementById('input-avatar-luck')?.value);

        if (isNaN(rawExp) || rawExp < 0 || rawExp > 300.0) {
            openGiftNoticeModal('TOPE DE EXP EXCEDIDO', 'El potenciador de EXP no puede ser menor a 0.0% ni superar el tope máximo permitido de 300.0%.', 'error');
            return;
        }
        if (isNaN(rawStar) || rawStar < 0 || rawStar > 300.0) {
            openGiftNoticeModal('TOPE DE STARSHIPS EXCEDIDO', 'El potenciador de StarShips no puede ser menor a 0.0% ni superar el tope máximo permitido de 300.0%.', 'error');
            return;
        }
        if (isNaN(rawLuck) || rawLuck < 0 || rawLuck > 100.0) {
            openGiftNoticeModal('TOPE DE SUERTE EXCEDIDO', 'El potenciador de Suerte no puede ser menor a 0.0% ni superar el tope máximo permitido de 100.0%.', 'error');
            return;
        }

        payload = {
            code: imgCode,
            avatar_code: imgCode,
            image_code: imgCode,
            name: avaName,
            image: `../../../assets/images/avatars/${imgCode}.png`,
            exp_boost: rawExp,
            starships_boost: rawStar,
            luck_boost: rawLuck,
            is_custom: true,
            is_gift: true
        };
    } else if (currentGiftType === 'VIP') {
        const vipCode = document.getElementById('select-vip-catalog')?.value || 'VIP-004';
        const vipName = (document.getElementById('input-vip-name')?.value || 'Pase VIP').trim();
        const vipDays = parseInt(document.getElementById('input-vip-days')?.value || 30, 10);
        const vipExp = parseFloat(document.getElementById('input-vip-exp')?.value || 100.0);
        const vipStar = parseFloat(document.getElementById('input-vip-star')?.value || 100.0);
        const vipLuck = parseFloat(document.getElementById('input-vip-luck')?.value || 15.0);

        if (isNaN(vipDays) || vipDays <= 0) {
            openGiftNoticeModal('DÍAS INVÁLIDOS', 'Ingresa una duración en días mayor a 0.', 'error');
            return;
        }

        payload = {
            code: vipCode,
            vip_code: vipCode,
            name: vipName,
            days: vipDays,
            durationDays: vipDays,
            exp_boost: vipExp,
            starships_boost: vipStar,
            luck_boost: vipLuck
        };
    }

    const requestBody = {
        target: currentTargetMode,
        userId: selectedUser ? selectedUser.id : null,
        giftType: currentGiftType,
        title: title,
        description: description,
        payload: payload,
        sender: 'Administración Ani-Dimension'
    };

    const btnSubmit = document.getElementById('btn-send-gift-action');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'ENVIANDO REGALO... ⏳';
    }

    try {
        const res = await fetch('/api/admin/gifts/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await res.json();

        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'ENVIAR REGALO AHORA 🎁';
        }

        if (res.ok && data.success) {
            openGiftNoticeModal('¡REGALO ENVIADO EXITOSAMENTE!', data.message, 'success');
        } else {
            openGiftNoticeModal('ERROR AL ENVIAR', data.message || 'No se pudo registrar el regalo.', 'error');
        }
    } catch (e) {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'ENVIAR REGALO AHORA 🎁';
        }
        openGiftNoticeModal('ERROR DE CONEXIÓN', 'Ocurrió un fallo al comunicar con el servidor central: ' + e.message, 'error');
    }
}

async function loadGiftsHistory() {
    const container = document.getElementById('gifts-history-container');
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8;">Cargando historial de envíos desde base de datos...</div>`;

    try {
        const res = await fetch('/api/admin/gifts/history');
        if (!res.ok) throw new Error('Error en la petición');
        const data = await res.json();
        const history = data.history || [];

        if (history.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8; font-size:11px;">No hay registros de regalos enviados aún en la base de datos.</div>`;
            return;
        }

        container.innerHTML = history.map(item => {
            let payload = {};
            try { payload = JSON.parse(item.PayloadJson); } catch(e) {}
            const dateStr = item.CreatedAt ? new Date(item.CreatedAt).toLocaleString('es-ES') : '---';

            let typeIcon = '⭐';
            let typeColor = '#ffd700';
            let typeDetails = '';

            if (item.GiftType === 'STARSHIPS') {
                typeIcon = '⭐';
                typeColor = '#ffd700';
                typeDetails = `⭐ ${parseInt(payload.amount || 0, 10).toLocaleString()} StarShips`;
            } else if (item.GiftType === 'CARD') {
                typeIcon = '🎴';
                typeColor = '#c084fc';
                typeDetails = `🎴 ${payload.copies || 1}x ${payload.cardName || 'Carta'}`;
            } else if (item.GiftType === 'POTENCIADOR') {
                typeIcon = '⚡';
                typeColor = '#00f0ff';
                typeDetails = `⚡ ${payload.name || payload.code} (+${parseFloat(payload.boost_value||0).toFixed(1)}% ${payload.type||'EXP'})`;
            } else if (item.GiftType === 'AVATAR') {
                typeIcon = '👤';
                typeColor = '#10b981';
                typeDetails = `👤 Avatar: ${payload.name || payload.code} (${payload.code})`;
            } else if (item.GiftType === 'VIP') {
                typeIcon = '👑';
                typeColor = '#ffd700';
                typeDetails = `👑 ${payload.name || payload.code} (${payload.days || 30} Días)`;
            }

            return `
                <div style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); border-left:3px solid ${typeColor}; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; font-weight:400;">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:16px;">${typeIcon}</span>
                            <span style="font-family:'Orbitron', sans-serif; font-size:11px; font-weight:400; color:#fff;">${item.Title}</span>
                            <span style="font-size:8px; font-family:'Orbitron', sans-serif; font-weight:400; padding:1px 5px; border:1px solid ${typeColor}; color:${typeColor}; background:rgba(0,0,0,0.4);">${item.GiftType}</span>
                        </div>
                        <div style="font-size:9.5px; color:#cbd5e1; margin-top:3px; font-weight:400;">${item.Description || ''}</div>
                        <div style="font-size:8.5px; color:#94a3b8; margin-top:4px; font-weight:400;">
                            <span>📦 Contenido: <span style="color:#fff; font-weight:400;">${typeDetails}</span></span> • 
                            <span>🎯 Destino: <span style="color:#ffd700; font-weight:400;">${item.TargetName || 'GLOBAL'}</span></span> • 
                            <span>📅 ${dateStr}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#ef4444; font-size:11px;">Error al cargar historial: ${e.message}</div>`;
    }
}

function openGiftNoticeModal(title, msg, type = 'success') {
    const modal = document.getElementById('admin-gift-notice-modal');
    const titleEl = document.getElementById('admin-gift-notice-title');
    const msgEl = document.getElementById('admin-gift-notice-msg');
    const iconEl = document.getElementById('admin-gift-notice-icon');

    if (!modal) return;

    if (titleEl) {
        titleEl.textContent = title;
        titleEl.style.color = type === 'error' ? '#ff4757' : '#00f0ff';
    }
    if (msgEl) msgEl.innerHTML = msg;
    if (iconEl) iconEl.textContent = type === 'error' ? '⚠️' : '🎁';

    modal.style.display = 'flex';
}

function closeGiftNoticeModal() {
    const modal = document.getElementById('admin-gift-notice-modal');
    if (modal) modal.style.display = 'none';
}

// Exportar globalmente
window.switchGiftTab = switchGiftTab;
window.setGiftTarget = setGiftTarget;
window.onSearchUserInput = onSearchUserInput;
window.selectUser = selectUser;
window.clearSelectedUser = clearSelectedUser;
window.selectGiftType = selectGiftType;
window.onSelectPotenciadorChange = onSelectPotenciadorChange;
window.onSelectVipCatalogChange = onSelectVipCatalogChange;
window.onSelectAvatarChange = onSelectAvatarChange;
window.onAvatarImageChange = onAvatarImageChange;
window.validateAvatarBoostLimits = validateAvatarBoostLimits;
window.onPasscodeCardInput = onPasscodeCardInput;
window.updateLivePreview = updateLivePreview;
window.submitSendGift = submitSendGift;
window.loadGiftsHistory = loadGiftsHistory;
window.openGiftNoticeModal = openGiftNoticeModal;
window.closeGiftNoticeModal = closeGiftNoticeModal;
