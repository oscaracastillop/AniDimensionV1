/**
 * ============================================================================
 * ANI-DIMENSION: CONTROLADOR DE LA GUÍA DEL DUELISTA & TUTORIAL
 * ============================================================================
 */

function switchGuideTab(tabKey, btnElement) {
    document.querySelectorAll('.guide-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    const sections = document.querySelectorAll('.guide-content-section');
    sections.forEach(sec => {
        if (tabKey === 'all' || sec.getAttribute('data-category') === tabKey) {
            sec.style.display = 'block';
        } else {
            sec.style.display = 'none';
        }
    });
}

window.switchGuideTab = switchGuideTab;
