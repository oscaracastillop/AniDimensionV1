/**
 * ============================================================================
 * ANI-DIMENSION: CONTROLADOR DEL HUB DE EVENTOS & RETOS (CHRONOLOGICAL CARDS)
 * ============================================================================
 */

var allEventsData = [];
var currentEventsFilter = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
    if (window.Session && !window.Session.requireAuth('../../login/login.html')) {
        return;
    }

    loadUserStarshipsHeader();
    loadEventsHubData();
});

function loadUserStarshipsHeader() {
    const user = window.Session ? window.Session.getUser() : null;
    const coinsEl = document.getElementById('events-user-coins');
    if (coinsEl && user) {
        const starships = user.starships !== undefined ? user.starships : (user.coins || 0);
        coinsEl.textContent = `⭐ ${Number(starships).toLocaleString()}`;
    }
}

async function loadEventsHubData() {
    const user = window.Session ? window.Session.getUser() : null;
    const userId = user ? (user.id || user.user_id || 1) : 1;

    try {
        const [puzzlesRes, tournamentsRes, subastaRes] = await Promise.all([
            fetch(`/api/events/all?userId=${userId}`).then(r => r.json()).catch(() => ({ success: false, events: [] })),
            fetch('/api/tournaments').then(r => r.json()).catch(() => ({ success: false, tournaments: [] })),
            fetch('/api/subastas/active').then(r => r.json()).catch(() => ({ success: false }))
        ]);

        let combined = [];

        // 1. Agregar evento de Subasta de Cartas si existe
        if (subastaRes && subastaRes.success && subastaRes.auction) {
            const a = subastaRes.auction;
            combined.push({
                id: a.Id,
                title: `Subasta: ${a.CardName}`,
                description: `Puja en vivo por esta carta exclusiva. Precio actual: ⭐ ${Number(a.CurrentPrice).toLocaleString()}. Máximo postor: ${a.HighestBidderUsername || 'Sin ofertas todavía'}.`,
                image_url: a.ImageUrl || `https://images.ygoprodeck.com/images/cards_small/${a.CardCode}.jpg`,
                type: 'SUBASTA',
                status: a.Status === 'ACTIVE' ? 'ACTIVE' : 'FINISHED',
                raw_subasta: a
            });
        }

        // 2. Agregar eventos de puzzle
        if (puzzlesRes && puzzlesRes.success && Array.isArray(puzzlesRes.events)) {
            combined.push(...puzzlesRes.events.map(e => ({
                ...e,
                type: 'PUZZLE'
            })));
        }

        // 3. Agregar torneos OCG
        if (tournamentsRes && tournamentsRes.success && Array.isArray(tournamentsRes.tournaments)) {
            combined.push(...tournamentsRes.tournaments.map(t => ({
                id: t.Id,
                title: t.Titulo,
                description: t.Descripcion || t.TextoPremios || 'Copa Oficial Ani-Dimension.',
                image_url: t.BannerUrl || '/assets/images/duels/pvp.jpg',
                type: 'TOURNAMENT',
                status: t.Estado === 'EN_CURSO' ? 'ACTIVE' : (t.Estado === 'REGISTRO' ? 'ACTIVE' : 'FINISHED'),
                is_tournament: true,
                raw_tournament: t
            })));
        }

        allEventsData = combined;
        renderEventsGrid();
    } catch (e) {
        console.error('[EVENTS HUB LOAD ERROR]', e);
        renderEmptyEventsState();
    }
}

function setEventsFilter(filterType, btnElement) {
    currentEventsFilter = filterType;
    document.querySelectorAll('.btn-filter-pill').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    if (filterType === 'TOURNAMENTS') {
        window.location.href = '/views/eventos/torneos.html';
        return;
    }

    renderEventsGrid();
}

function renderEventsGrid() {
    const container = document.getElementById('events-grid-container');
    if (!container) return;

    let filtered = allEventsData.filter(evt => {
        if (currentEventsFilter === 'ACTIVE') return evt.status === 'ACTIVE';
        if (currentEventsFilter === 'FINISHED') return evt.status === 'FINISHED';
        if (currentEventsFilter === 'TOURNAMENTS') return evt.type === 'TOURNAMENT';
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding: 40px 20px; color:#94a3b8; font-family:'Orbitron',sans-serif;">
                <div style="font-size:32px; margin-bottom:10px;">⚡</div>
                <div style="font-size:14px; font-weight:700; color:#cbd5e1;">NO HAY EVENTOS DISPONIBLES EN ESTA CATEGORÍA</div>
                <div style="font-size:11px; margin-top:4px;">Los nuevos eventos programados por el administrador aparecerán aquí en orden cronológico.</div>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(evt => {
        const isActive = evt.status === 'ACTIVE';
        const isFinished = evt.status === 'FINISHED';
        const isUpcoming = evt.status === 'UPCOMING';

        let badgeClass = 'active';
        let badgeText = '🔥 EN CURSO';
        if (isFinished) {
            badgeClass = 'finished';
            badgeText = '⏳ FINALIZADO';
        } else if (isUpcoming) {
            badgeClass = 'upcoming';
            badgeText = '📅 PRÓXIMAMENTE';
        }

        if (evt.type === 'SUBASTA') {
            const s = evt.raw_subasta || {};
            return `
                <div class="event-card featured" style="border-color:#00f0ff; box-shadow:0 0 16px rgba(0,240,255,0.25);">
                    <div>
                        <div class="event-card-header">
                            <span class="event-card-badge ${badgeClass}">${badgeText}</span>
                            <span style="font-size:10px; color:#ffd700; font-weight:700;">⭐ ${Number(s.CurrentPrice || s.InitialPrice || 100).toLocaleString()}</span>
                        </div>

                        <div class="event-card-artwork">
                            <img src="${evt.image_url}" alt="${evt.title}" class="event-card-img" style="object-position:center top;">
                        </div>

                        <div class="event-card-tag" style="color:#00f0ff;">⚖️ SUBASTA EN VIVO</div>
                        <div class="event-card-title">${evt.title}</div>
                        <div class="event-card-desc">${evt.description}</div>

                        <div class="event-stats-row" style="border-top:1px solid rgba(0,240,255,0.2); padding-top:8px; margin-top:8px;">
                            <div>
                                <div class="event-stats-label">Precio Actual:</div>
                                <div class="event-stats-val" style="color:#ffd700;">⭐ ${Number(s.CurrentPrice || s.InitialPrice).toLocaleString()}</div>
                            </div>
                            <div style="text-align:right;">
                                <div class="event-stats-label">Postor:</div>
                                <div class="event-stats-val" style="color:#00f0ff;">${s.HighestBidderUsername || 'Sin ofertas'}</div>
                            </div>
                        </div>
                    </div>

                    <a href="/views/eventos/subasta.html" class="btn-event-action" style="background:rgba(0,240,255,0.18); border-color:#00f0ff; color:#00f0ff;">
                        <span>Entrar a la Subasta</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px; height:13px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </a>
                </div>
            `;
        }

        if (evt.type === 'TOURNAMENT') {
            const t = evt.raw_tournament || {};
            const inscritos = t.TotalInscritos || 0;
            const max = t.MaxParticipantes || 8;

            return `
                <div class="event-card featured" style="border-color:#ffd700; box-shadow:0 0 16px rgba(255,215,0,0.2);">
                    <div>
                        <div class="event-card-header">
                            <span class="event-card-badge ${badgeClass}">${badgeText}</span>
                            <span style="font-size:10px; color:#ffd700; font-weight:700;">⭐ ${t.CostoInscripcion > 0 ? `${t.CostoInscripcion.toLocaleString()} ★` : 'Gratis'}</span>
                        </div>

                        <div class="event-card-artwork">
                            <img src="${evt.image_url}" alt="${evt.title}" class="event-card-img">
                        </div>

                        <div class="event-card-tag" style="color:#ffd700;">🏆 TORNEO & BRACKETS</div>
                        <div class="event-card-title">${evt.title}</div>
                        <div class="event-card-desc">${evt.description}</div>

                        <div class="event-stats-row" style="border-top:1px solid rgba(255,215,0,0.2); padding-top:8px; margin-top:8px;">
                            <div>
                                <div class="event-stats-label">Inscritos:</div>
                                <div class="event-stats-val" style="color:#00f0ff;">${inscritos} / ${max} Duelistas</div>
                            </div>
                            <div style="text-align:right;">
                                <div class="event-stats-label">Nivel Permitido:</div>
                                <div class="event-stats-val">Nv. ${t.NivelMinimo || 1} - ${t.NivelMaximo || 999}</div>
                            </div>
                        </div>
                    </div>

                    <a href="/views/eventos/torneos.html" class="btn-event-action" style="background:rgba(255,215,0,0.18); border-color:#ffd700; color:#ffd700;">
                        <span>Entrar al Hub de Torneos</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px; height:13px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </a>
                </div>
            `;
        }

        const progress = evt.user_progress || { unlocked_count: 0, total_pieces: evt.total_pieces || 16, percent: 0, is_completed: false };
        const endDateStr = evt.end_date ? new Date(evt.end_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Próximamente';

        let actionBtnHtml = '';
        if (isActive) {
            actionBtnHtml = `
                <a href="/views/eventos/puzzle.html?eventId=${evt.id}" class="btn-event-action">
                    <span>Entrar al Rompecabezas</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px; height:13px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </a>
            `;
        } else if (isFinished) {
            actionBtnHtml = `
                <a href="/views/eventos/puzzle.html?eventId=${evt.id}" class="btn-event-action finished-btn">
                    <span>Ver Resultados & Canje</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px; height:13px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </a>
            `;
        } else {
            actionBtnHtml = `
                <button class="btn-event-action disabled" disabled>
                    <span>En Preparación</span>
                </button>
            `;
        }

        const tagText = 'RETO DE COLECCIÓN & VELOCIDAD';
        const featuredClass = isActive ? 'featured' : (isFinished ? 'finished' : '');

        return `
            <div class="event-card ${featuredClass}">
                <div>
                    <div class="event-card-header">
                        <span class="event-card-badge ${badgeClass}">${badgeText}</span>
                        <span style="font-size:10px; color:#94a3b8; font-weight:600;">📅 ${endDateStr}</span>
                    </div>

                    <div class="event-card-artwork">
                        <img src="${evt.image_url || '/assets/images/events/halloween_maga_oscura.jpg'}" alt="${evt.title}" class="event-card-img">
                    </div>

                    <div class="event-card-tag">⚡ ${tagText}</div>
                    <div class="event-card-title">${evt.title}</div>
                    <div class="event-card-desc">${evt.description || 'Compite contra otros duelistas y asegura tu lugar en el podio.'}</div>

                    <div class="event-stats-row">
                        <div>
                            <div class="event-stats-label">Tu Progreso:</div>
                            <div class="event-stats-val">${progress.unlocked_count} / ${progress.total_pieces} Piezas (${progress.percent}%)</div>
                            <div class="event-progress-bar-bg">
                                <div class="event-progress-bar-fill" style="width: ${progress.percent}%;"></div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div class="event-stats-label">Ganadores:</div>
                            <div class="event-stats-val">${evt.winners_count || 0} / 10</div>
                        </div>
                    </div>
                </div>

                ${actionBtnHtml}
            </div>
        `;
    }).join('');
}

function renderEmptyEventsState() {
    const container = document.getElementById('events-grid-container');
    if (container) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding: 40px 20px; color:#94a3b8;">
                <p>No se pudieron cargar los eventos en este momento.</p>
            </div>
        `;
    }
}

window.setEventsFilter = setEventsFilter;
