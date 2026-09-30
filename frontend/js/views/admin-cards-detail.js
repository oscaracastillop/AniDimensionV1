/**
 * ANI-DIMENSION: LÓGICA DE EDICIÓN DEDICADA DE SOBRE (ADMINISTRACIÓN)
 * PANEL DE CONTROLES EN UNA SOLA LÍNEA HORIZONTAL SIN ICONOS Y PASSCODES INFORMATIVOS EN CARTAS
 */
let currentAdminPack = null;
let currentAdminRarityFilter = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
    initAdminPackDetailView();
});

function initAdminPackDetailView() {
    const urlParams = new URLSearchParams(window.location.search);
    const packId = urlParams.get('pack_id') || 'LOB';

    const packs = window.PacksManager ? window.PacksManager.getPacks() : [];
    currentAdminPack = packs.find(p => p.id === packId) || packs[0];

    if (!currentAdminPack) return;

    renderAdminShowcasePanel();
    updateAdminRarityCounts();
    renderAdminCardsGrid();
}

function renderAdminShowcasePanel() {
    const panel = document.getElementById('admin-showcase-panel');
    if (!panel || !currentAdminPack) return;

    document.getElementById('admin-pack-detail-title').textContent = `EDITANDO SOBRE: ${currentAdminPack.name.toUpperCase()}`;

    const isPackActive = currentAdminPack.active !== false;
    const bannerText = currentAdminPack.offer_text || '15% DESC';
    const price = currentAdminPack.price !== undefined ? currentAdminPack.price : 1500;

    panel.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%; gap:12px; flex-wrap:nowrap;">
            
            <!-- TÍTULO Y CÓDIGO DEL SOBRE -->
            <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                <span style="font-family:'Orbitron', sans-serif; font-size:14px; font-weight:900; color:#ffd700; text-shadow:0 0 10px rgba(255,215,0,0.5);">${currentAdminPack.name}</span>
                <span style="font-family:'Orbitron', sans-serif; font-size:9.5px; font-weight:800; background:rgba(0,240,255,0.15); border:1px solid #00f0ff; color:#00f0ff; padding:1px 6px; border-radius:4px;">${currentAdminPack.code}</span>
            </div>

            <!-- CONTROLES EN UNA SOLA LÍNEA HORIZONTAL -->
            <div style="display:flex; align-items:center; gap:12px; flex-wrap:nowrap;">
                
                <!-- LABEL + INPUT BANNER (MÁXIMO 12 CARACTERES) -->
                <div style="display:flex; align-items:center; gap:5px;">
                    <label style="font-size:11px; font-weight:800; color:#cbd5e1; font-family:'Orbitron', sans-serif;">Banner:</label>
                    <input type="text" id="edit-pack-banner" value="${bannerText}" maxlength="12" placeholder="15% DESC" oninput="validateBannerInput(this)" style="width:105px; padding:4px 8px; font-size:11px; font-family:'Outfit', sans-serif; background:rgba(0,0,0,0.7); border:1px solid rgba(0,240,255,0.4); border-radius:4px; color:#fff; outline:none;">
                </div>

                <!-- LABEL + INPUT PRECIO -->
                <div style="display:flex; align-items:center; gap:5px;">
                    <label style="font-size:11px; font-weight:800; color:#cbd5e1; font-family:'Orbitron', sans-serif;">Precio:</label>
                    <div style="display:flex; align-items:center; gap:3px;">
                        <span style="font-size:11px; color:#ffd700;">⭐</span>
                        <input type="number" id="edit-pack-price" value="${price}" min="0" placeholder="1500" style="width:70px; padding:4px 6px; font-size:11px; font-family:'Orbitron', sans-serif; font-weight:900; background:rgba(0,0,0,0.7); border:1px solid #ffd700; color:#ffd700; border-radius:4px; outline:none; text-align:center;">
                    </div>
                </div>

                <!-- CHECKBOX ACTIVO -->
                <label style="display:inline-flex; align-items:center; gap:5px; background:rgba(15,23,42,0.9); border:1px solid ${isPackActive ? '#10b981' : '#ef4444'}; padding:4px 8px; border-radius:6px; cursor:pointer; user-select:none;">
                    <input type="checkbox" id="edit-pack-active" ${isPackActive ? 'checked' : ''} style="accent-color:#10b981; width:14px; height:14px; cursor:pointer;">
                    <span style="font-family:'Orbitron', sans-serif; font-size:10px; font-weight:900; color:${isPackActive ? '#10b981' : '#ef4444'};">
                        Activo
                    </span>
                </label>

                <!-- BOTÓN GUARDAR (SIN ICONOS, TEXTO EXACTO 'Guardar') -->
                <button onclick="saveAdminPackDetailSettings()" style="padding:6px 16px; font-family:'Orbitron', sans-serif; font-size:11px; font-weight:900; color:#ffffff; background:linear-gradient(90deg, #10b981, #059669); border:none; border-radius:6px; cursor:pointer; box-shadow:0 0 12px rgba(16, 185, 129, 0.5); white-space:nowrap;">
                    Guardar
                </button>
            </div>
        </div>
    `;
}

function validateBannerInput(input) {
    if (input.value.length > 12) {
        input.value = input.value.slice(0, 12);
    }
}

function saveAdminPackDetailSettings() {
    if (!currentAdminPack) return;

    const packs = window.PacksManager.getPacks();
    const pack = packs.find(p => p.id === currentAdminPack.id);
    if (!pack) return;

    const priceInput = document.getElementById('edit-pack-price');
    const bannerInput = document.getElementById('edit-pack-banner');
    const activeInput = document.getElementById('edit-pack-active');

    if (priceInput) pack.price = Math.max(0, parseInt(priceInput.value) || 0);
    if (bannerInput) pack.offer_text = bannerInput.value.trim().slice(0, 12);
    if (activeInput) pack.active = activeInput.checked;

    window.PacksManager.savePacks(packs);
    currentAdminPack = pack;

    if (typeof window.showAniModal === 'function') {
        window.showAniModal({
            title: 'SOBRE ACTUALIZADO',
            message: `Ajustes del sobre "${pack.name}" guardados correctamente.`,
            type: 'success'
        });
    } else {
        alert(`✅ Ajustes del sobre ${pack.name} guardados correctamente.`);
    }
    
    renderAdminShowcasePanel();
    renderAdminCardsGrid();
}

function updateAdminRarityCounts() {
    if (!currentAdminPack || !currentAdminPack.cards) return;

    const cards = currentAdminPack.cards;
    document.getElementById('count-all').textContent = cards.length;
    document.getElementById('count-secret').textContent = cards.filter(c => c.rarity === 'SECRET_RARE').length;
    document.getElementById('count-ultra').textContent = cards.filter(c => c.rarity === 'ULTRA_RARE').length;
    document.getElementById('count-super').textContent = cards.filter(c => c.rarity === 'SUPER_RARE').length;
    document.getElementById('count-rare').textContent = cards.filter(c => c.rarity === 'RARE').length;
    document.getElementById('count-common').textContent = cards.filter(c => c.rarity === 'COMMON').length;
}

function filterAdminRarity(rarity) {
    currentAdminRarityFilter = rarity;
    document.querySelectorAll('.rarity-btn').forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = Array.from(document.querySelectorAll('.rarity-btn')).find(b => b.getAttribute('onclick')?.includes(rarity));
    if (activeBtn) activeBtn.classList.add('active');

    renderAdminCardsGrid();
}

function filterAdminCards() {
    renderAdminCardsGrid();
}

function renderAdminCardsGrid() {
    const container = document.getElementById('admin-cards-grid-container');
    if (!container || !currentAdminPack) return;

    let cards = currentAdminPack.cards || [];
    const searchInput = document.getElementById('card-search-input');
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';

    if (currentAdminRarityFilter !== 'ALL') {
        cards = cards.filter(c => c.rarity === currentAdminRarityFilter);
    }

    if (searchTerm) {
        cards = cards.filter(c => c.name.toLowerCase().includes(searchTerm) || String(c.card_id).includes(searchTerm) || (c.set && c.set.toLowerCase().includes(searchTerm)));
    }

    container.innerHTML = cards.map(c => {
        const isPackDropActive = (c.active !== false && c.pack_drop !== false);
        const isDeckUsable = c.deck_usable !== false;
        const isNpcDropActive = c.npc_drop !== false;

        const borderCol = c.rarity === 'SECRET_RARE' ? '#ec4899' : c.rarity === 'ULTRA_RARE' ? '#ffd700' : c.rarity === 'SUPER_RARE' ? '#00f0ff' : c.rarity === 'RARE' ? '#38bdf8' : 'rgba(255,255,255,0.15)';
        const rarityCol = c.rarity === 'SECRET_RARE' ? '#ec4899' : c.rarity === 'ULTRA_RARE' ? '#ffd700' : c.rarity === 'SUPER_RARE' ? '#00f0ff' : c.rarity === 'RARE' ? '#38bdf8' : '#94a3b8';

        return `
            <div class="catalog-card-item" style="border-color:${isPackDropActive && isDeckUsable ? borderCol : '#ef4444'}; opacity:${isPackDropActive && isDeckUsable ? '1' : '0.78'}; min-height: 225px;">
                
                <!-- PASSCODE DE LA CARTA -->
                <span class="unowned-counter-tag" style="background:rgba(15,23,42,0.85); border:1px solid rgba(255,255,255,0.2); color:#94a3b8; font-family:'Orbitron', sans-serif; font-size:7.5px; font-weight:700; padding:1px 5px; border-radius:6px;" title="Passcode Konami">
                    #${c.card_id}
                </span>

                <img src="../../assets/images/cards/${c.card_id}.jpg" onerror="this.onerror=null; this.src='https://images.ygoprodeck.com/images/cards/${c.card_id}.jpg';" style="width:100%; height:105px; object-fit:contain; border-radius:4px; filter:${!isPackDropActive || !isDeckUsable ? 'grayscale(0.6) brightness(0.7)' : 'none'};">

                <div style="font-size:9px; font-weight:800; color:#fff; text-align:center; line-height:1.2; width:100%; word-break:break-word; margin:2px 0 0 0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;" title="${c.name}">${c.name}</div>

                <div style="font-family:'Orbitron', sans-serif; font-size:7.5px; font-weight:900; color:${rarityCol};">${c.rarity}</div>

                <!-- CONTROLES 3 CHECKBOXES POR CARTA -->
                <div class="admin-card-toggles" style="display:flex; flex-direction:column; gap:2.5px; width:100%; background:rgba(15,23,42,0.9); border-radius:4px; padding:3px 5px; box-sizing:border-box; border:1px solid rgba(255,255,255,0.1);">
                    
                    <!-- 1. DROP EN SOBRE -->
                    <label class="toggle-label" title="Permitir que la carta salga al abrir sobres de la tienda" style="display:flex; align-items:center; gap:4px; font-size:8px; font-weight:700; cursor:pointer;">
                        <input type="checkbox" ${isPackDropActive ? 'checked' : ''} onchange="toggleCardPackDrop(${c.card_id}, this.checked)" style="accent-color:#10b981; cursor:pointer;">
                        <span style="color:${isPackDropActive ? '#10b981' : '#ef4444'};">Drop en Sobre</span>
                    </label>

                    <!-- 2. USO EN DECK -->
                    <label class="toggle-label" title="Permitir equipar/usar esta carta en el Deck / Extra Deck" style="display:flex; align-items:center; gap:4px; font-size:8px; font-weight:700; cursor:pointer;">
                        <input type="checkbox" ${isDeckUsable ? 'checked' : ''} onchange="toggleCardDeckUsable(${c.card_id}, this.checked)" style="accent-color:#00f0ff; cursor:pointer;">
                        <span style="color:${isDeckUsable ? '#00f0ff' : '#ef4444'};">Uso en Deck</span>
                    </label>

                    <!-- 3. DROP EN NPCS -->
                    <label class="toggle-label" title="Permitir ganar esta carta al vencer a un NPC" style="display:flex; align-items:center; gap:4px; font-size:8px; font-weight:700; cursor:pointer;">
                        <input type="checkbox" ${isNpcDropActive ? 'checked' : ''} onchange="toggleCardNpcDrop(${c.card_id}, this.checked)" style="accent-color:#38bdf8; cursor:pointer;">
                        <span style="color:${isNpcDropActive ? '#38bdf8' : '#94a3b8'};">Drop en NPCs</span>
                    </label>
                </div>
            </div>
        `;
    }).join('');
}

function toggleCardPackDrop(cardId, isChecked) {
    const packs = window.PacksManager.getPacks();
    const pack = packs.find(p => p.id === currentAdminPack.id);
    if (!pack) return;

    const card = pack.cards.find(c => String(c.card_id) === String(cardId));
    if (card) {
        card.active = isChecked;
        card.pack_drop = isChecked;
        window.PacksManager.savePacks(packs);
        currentAdminPack = pack;
        renderAdminCardsGrid();
    }
}

function toggleCardDeckUsable(cardId, isChecked) {
    const packs = window.PacksManager.getPacks();
    const pack = packs.find(p => p.id === currentAdminPack.id);
    if (!pack) return;

    const card = pack.cards.find(c => String(c.card_id) === String(cardId));
    if (card) {
        card.deck_usable = isChecked;
        window.PacksManager.savePacks(packs);
        currentAdminPack = pack;
        renderAdminCardsGrid();
    }
}

function toggleCardNpcDrop(cardId, isChecked) {
    const packs = window.PacksManager.getPacks();
    const pack = packs.find(p => p.id === currentAdminPack.id);
    if (!pack) return;

    const card = pack.cards.find(c => String(c.card_id) === String(cardId));
    if (card) {
        card.npc_drop = isChecked;
        window.PacksManager.savePacks(packs);
        currentAdminPack = pack;
        renderAdminCardsGrid();
    }
}
