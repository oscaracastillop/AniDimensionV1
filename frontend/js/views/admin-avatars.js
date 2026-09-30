/**
 * ANI-DIMENSION: LÓGICA DE GERENCIA DE AVATARES (ADMINISTRACIÓN)
 * RENDERIZA LA REJILLA DE AVATARES FIEL A LA TIENDA DE SOBRES CON CONTROLES ADMIN DIRECTOS
 */
let currentAdminAvatarSearch = '';

document.addEventListener('DOMContentLoaded', () => {
    initAdminAvatarsView();
});

function initAdminAvatarsView() {
    renderAdminAvatarsGrid();
}

function renderAdminAvatarsGrid() {
    const container = document.getElementById('admin-avatars-grid-container');
    if (!container) return;

    let avatars = window.AvatarsManager ? window.AvatarsManager.getAvatars() : [];

    if (currentAdminAvatarSearch) {
        avatars = avatars.filter(a => 
            a.code.toLowerCase().includes(currentAdminAvatarSearch) ||
            a.name.toLowerCase().includes(currentAdminAvatarSearch)
        );
    }

    container.innerHTML = avatars.map(avatar => {
        const isActive = avatar.active !== false;
        const offerText = avatar.offer_text || 'NUEVO';
        const price = avatar.price !== undefined ? avatar.price : 1500;
        const imgPath = avatar.image || `../../../assets/images/avatars/${avatar.code}.png`;

        const expVal = parseFloat(avatar.exp_boost || 0).toFixed(1);
        const starVal = parseFloat(avatar.starships_boost || 0).toFixed(1);
        const luckVal = parseFloat(avatar.luck_boost || 0).toFixed(1);

        return `
            <div class="shop-card" style="position:relative; overflow:hidden; border:1.5px solid ${isActive ? 'rgba(0,240,255,0.4)' : 'rgba(239,68,68,0.4)'}; background:linear-gradient(180deg, #0e172a 0%, #060a14 100%); padding:10px;">
                
                <!-- CINTA DIAGONAL DE OFERTA EN AMARILLO NEÓN (TEXTO MÁXIMO 12 CARACTERES) -->
                <div style="position:absolute; top:30px; left:-50px; width:200px; transform:rotate(-35deg); background:linear-gradient(135deg, #ffd700 0%, #f59e0b 100%); color:#020617; font-family:'Orbitron', sans-serif; font-size:10px; font-weight:900; padding:5px 0; text-transform:uppercase; letter-spacing:0.4px; box-shadow:0 3px 12px rgba(0,0,0,0.5); z-index:10; pointer-events:none; border-top:1.2px solid #ffffff; border-bottom:1.5px solid rgba(0,0,0,0.6); text-align:center; white-space:nowrap;">
                    ${offerText}
                </div>

                <div>
                    <!-- HEADER DEL CARD ADMIN: SWITCH ACTIVO / DESACTIVADO ALINEADO A LA DERECHA (SIN EL CÓDIGO AMARILLO ARRIBA IZQUIERDA QUEDANDO SOBREPOSICIONADO) -->
                    <div style="display:flex; justify-content:flex-end; align-items:center; width:100%; z-index:15; position:relative; margin-bottom:6px;">
                        <label style="display:inline-flex; align-items:center; gap:4px; background:rgba(15,23,42,0.9); border:1px solid ${isActive ? '#10b981' : '#ef4444'}; padding:2px 8px; border-radius:12px; cursor:pointer;" onclick="event.stopPropagation();">
                            <input type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleAvatarActive('${avatar.code}', this.checked)" style="accent-color:#10b981; cursor:pointer;">
                            <span style="font-family:'Orbitron', sans-serif; font-size:7.5px; font-weight:900; color:${isActive ? '#10b981' : '#ef4444'}; text-transform:uppercase;">
                                ${isActive ? 'ACTIVO' : 'DESACTIVADO'}
                            </span>
                        </label>
                    </div>

                    <!-- ARTWORK COMPLETO DEL AVATAR SIN ENCERRAR EN CÍRCULO -->
                    <div style="width:100%; height:110px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.3); border:1px solid rgba(0,240,255,0.15); margin-bottom:6px; position:relative; overflow:visible;">
                        <img src="${imgPath}" alt="${avatar.code}" onerror="this.onerror=null; this.src='../../../assets/images/avatars/AVA-002.png';" style="max-width:100%; max-height:100%; object-fit:contain; filter:${isActive ? 'none' : 'grayscale(0.8) opacity(0.7)'};">
                    </div>

                    <!-- CÓDIGO ÚNICO DEL AVATAR EN AZUL NEÓN -->
                    <div style="font-family:'Orbitron', sans-serif; font-size:11px; font-weight:900; color:#00f0ff; text-align:center; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${avatar.code}
                    </div>

                    <!-- BADGES DE LOS 3 POTENCIADORES DECIMALES -->
                    <div style="display:flex; flex-direction:column; gap:2px; width:100%; background:rgba(15,23,42,0.85); border:1px solid rgba(255,255,255,0.1); padding:4px 6px; box-sizing:border-box; margin-bottom:6px; font-size:8px; font-family:'Orbitron', sans-serif;">
                        <div style="display:flex; justify-content:space-between; color:#10b981;">
                            <span>⚡ EXP Boost:</span> <b>+${expVal}%</b>
                        </div>
                        <div style="display:flex; justify-content:space-between; color:#ffd700;">
                            <span>⭐ StarShips:</span> <b>+${starVal}%</b>
                        </div>
                        <div style="display:flex; justify-content:space-between; color:#00f0ff;">
                            <span>🍀 Suerte:</span> <b>+${luckVal}%</b>
                        </div>
                    </div>
                </div>

                <!-- BOTTOM BAR CON INPUT DE PRECIO Y BOTÓN EDITAR AVATAR -->
                <div style="display:flex; align-items:center; justify-content:space-between; width:100%; margin-top:2px; padding-top:4px; border-top:1px dashed rgba(255,255,255,0.15);" onclick="event.stopPropagation();">
                    <div style="display:flex; align-items:center; gap:3px; font-family:'Orbitron', sans-serif; font-size:9.5px; font-weight:900; color:#ffd700;">
                        ⭐
                        <input type="number" value="${price}" onchange="updateAvatarPrice('${avatar.code}', this.value)" style="width:80px; min-width:80px; font-family:'Orbitron', sans-serif; font-size:9.5px; font-weight:900; background:rgba(0,0,0,0.7); border:1px solid #ffd700; color:#ffd700; border-radius:4px; padding:2px 3px; outline:none; text-align:center;" title="Precio del avatar en StarShips">
                    </div>

                    <button onclick="location.href='avatars-detalle.html?avatar_code=${avatar.code}'" style="height:22px; min-width:90px; padding:2px 6px; font-size:7.5px; font-family:'Orbitron', sans-serif; background:linear-gradient(90deg, #f59e0b, #eab308); color:#0f172a; font-weight:900; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:4px; justify-content:center;">
                        <span>EDITAR AVATAR</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:9px; height:9px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function filterAdminAvatarsGrid() {
    const input = document.getElementById('admin-avatar-search');
    currentAdminAvatarSearch = input ? input.value.trim().toLowerCase() : '';
    renderAdminAvatarsGrid();
}

function toggleAvatarActive(code, isChecked) {
    const avatars = window.AvatarsManager.getAvatars();
    const avatar = avatars.find(a => a.code === code);
    if (!avatar) return;

    avatar.active = isChecked;
    window.AvatarsManager.saveAvatars(avatars);
    renderAdminAvatarsGrid();
}

function updateAvatarPrice(code, newPrice) {
    const avatars = window.AvatarsManager.getAvatars();
    const avatar = avatars.find(a => a.code === code);
    if (!avatar) return;

    avatar.price = Math.max(0, parseInt(newPrice) || 0);
    window.AvatarsManager.saveAvatars(avatars);
    renderAdminAvatarsGrid();
}
