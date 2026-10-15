const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const BASE_URL = 'http://127.0.0.1:3006';

const viewsToTest = [
    { name: 'Landing Page', url: '/landing.html' },
    { name: 'Login', url: '/views/login/login.html' },
    { name: 'Registro', url: '/views/register/register.html' },
    { name: 'Lobby Principal', url: '/views/lobby/lobby.html' },
    { name: 'Perfil de Usuario', url: '/views/profile/profile.html' },
    { name: 'Tienda Hub', url: '/views/shop/shop.html' },
    { name: 'Tienda Sobres', url: '/views/shop/shop-sobres.html' },
    { name: 'Tienda Sobre Detalle', url: '/views/shop/shop-sobre-detalle.html?pack=LOB' },
    { name: 'Tienda Cartas Singles', url: '/views/shop/shop-cartas.html' },
    { name: 'Tienda Avatares', url: '/views/shop/shop-avatares.html' },
    { name: 'Tienda Potenciadores', url: '/views/shop/shop-potenciadores.html' },
    { name: 'Tienda VIP', url: '/views/shop/shop-vip.html' },
    { name: 'Tienda Estrellas', url: '/views/shop/shop-estrellas.html' },
    { name: 'Tienda Tapetes', url: '/views/shop/shop-tapetes.html' },
    { name: 'Tienda Fundas', url: '/views/shop/shop-fundas.html' },
    { name: 'Tienda Fondos', url: '/views/shop/shop-fondos.html' },
    { name: 'Tienda Instrucciones Pago', url: '/views/shop/shop-pago-instrucciones.html' },
    { name: 'Duelos Menu', url: '/views/duels/menu.html' },
    { name: 'Catálogo de Cartas', url: '/views/duels/catalog.html' },
    { name: 'Constructor de Mazos', url: '/views/duels/deck-builder.html' },
    { name: 'Aventura / Selección NPC', url: '/views/duels/npc/select-npc.html' },
    { name: 'Tablero Duelo NPC', url: '/views/duels/npc/duel-npc.html?npc=1' },
    { name: 'Lobby PvP', url: '/views/duels/pvp/lobby-pvp.html' },
    { name: 'Tablero Duelo PvP', url: '/views/duels/pvp/duel-pvp.html' },
    { name: 'Hub de Eventos', url: '/views/eventos/eventos.html' },
    { name: 'Torneos Jugadores', url: '/views/eventos/torneos.html' },
    { name: 'Rompecabezas Evento', url: '/views/eventos/puzzle.html' },
    { name: 'Subasta Evento', url: '/views/eventos/subasta.html' },
    { name: 'Clanes', url: '/views/clans/clans.html' },
    { name: 'Chat Global', url: '/views/chat/chat.html' },
    { name: 'Rankings', url: '/views/rankings/rankings.html' },
    { name: 'Guía del Duelista', url: '/views/guide/guide.html' },
    { name: 'Admin Hub', url: '/views/admin/admin.html' },
    { name: 'Admin Usuarios', url: '/views/admin/users/users.html' },
    { name: 'Admin Usuario Detalle', url: '/views/admin/users/users-detalle.html?id=1' },
    { name: 'Admin Sobres/Cartas', url: '/views/admin/cards/cards.html' },
    { name: 'Admin Sobre Detalle', url: '/views/admin/cards/cards-sobre-detalle.html?pack=LOB' },
    { name: 'Admin Cartas Tienda', url: '/views/admin/cartas-tienda/cartas-tienda.html' },
    { name: 'Admin Avatares', url: '/views/admin/avatars/avatars.html' },
    { name: 'Admin Avatar Detalle', url: '/views/admin/avatars/avatars-detalle.html?id=AVA-001' },
    { name: 'Admin Potenciadores', url: '/views/admin/potenciadores/potenciadores.html' },
    { name: 'Admin Tapetes', url: '/views/admin/tapetes/tapetes.html' },
    { name: 'Admin Tapetes Editor', url: '/views/admin/tapetes/editor.html' },
    { name: 'Admin Fundas', url: '/views/admin/fundas/fundas.html' },
    { name: 'Admin Fundas Editor', url: '/views/admin/fundas/editor.html' },
    { name: 'Admin VIP', url: '/views/admin/vip/vip.html' },
    { name: 'Admin Estrellas', url: '/views/admin/estrellas/estrellas.html' },
    { name: 'Admin Regalos', url: '/views/admin/regalos/regalos.html' },
    { name: 'Admin Eventos Hub', url: '/views/admin/eventos/eventos.html' },
    { name: 'Admin Torneos', url: '/views/admin/eventos/torneos.html' },
    { name: 'Admin Editor Torneo', url: '/views/admin/eventos/editor-torneo.html' },
    { name: 'Admin Rompecabezas', url: '/views/admin/eventos/rompecabezas.html' },
    { name: 'Admin Subasta', url: '/views/admin/eventos/subasta.html' },
    { name: 'Admin Salas Bonus', url: '/views/admin/eventos/salas-bonus.html' }
];

(async () => {
    console.log('🚀 Iniciando auditoría exhaustiva de vistas con Puppeteer...');
    console.log('Browser:', CHROME_PATH);

    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // 1. Obtener sesión real legítima autenticándose en la API
    console.log('🔑 Obteniendo sesión real autenticada desde /api/auth/login...');
    const loginRes = await fetch(BASE_URL + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'Admin', password: 'oscar1982', force: true })
    });
    const loginData = await loginRes.json();
    if (!loginData.success || !loginData.user) {
        throw new Error('No se pudo autenticar usuario Admin: ' + JSON.stringify(loginData));
    }
    const adminUser = loginData.user;
    adminUser.sessionToken = loginData.sessionToken || adminUser.sessionToken;
    console.log(`✅ Sesión obtenida: ${adminUser.username} (Token: ${adminUser.sessionToken.substring(0, 8)}...)`);

    // Inject real authenticated session into every page load
    await page.evaluateOnNewDocument((user) => {
        sessionStorage.setItem('ani_dimension_user', JSON.stringify(user));
        // Ensure localStorage has no residual data
        try { localStorage.clear(); } catch(e) {}
    }, adminUser);

    const results = [];

    for (const v of viewsToTest) {
        const errors = [];
        const warnings = [];
        const failedRequests = [];

        const onConsole = msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            } else if (msg.type() === 'warn') {
                warnings.push(msg.text());
            }
        };

        const onPageError = err => {
            errors.push(err.message || String(err));
        };

        const onRequestFailed = req => {
            failedRequests.push(`${req.method()} ${req.url()} (${req.failure()?.errorText || 'failed'})`);
        };

        const onResponse = res => {
            if (res.status() >= 400 && !res.url().includes('favicon.ico')) {
                failedRequests.push(`${res.status()} ${res.url()}`);
            }
        };

        page.on('console', onConsole);
        page.on('pageerror', onPageError);
        page.on('requestfailed', onRequestFailed);
        page.on('response', onResponse);

        const targetUrl = BASE_URL + v.url;
        try {
            const resp = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
            await new Promise(r => setTimeout(r, 600)); // wait for initial JS to execute

            // Check if localStorage has anything stored
            const localKeys = await page.evaluate(() => Object.keys(localStorage));

            // Check buttons count on the page
            const buttonCount = await page.evaluate(() => document.querySelectorAll('button, [role="button"], .btn, [onclick]').length);

            results.push({
                name: v.name,
                url: v.url,
                httpStatus: resp ? resp.status() : 'N/A',
                buttonCount,
                localStorageKeys: localKeys,
                errors: [...new Set(errors)],
                warnings: warnings.slice(0, 3),
                failedRequests: [...new Set(failedRequests)]
            });
        } catch (err) {
            results.push({
                name: v.name,
                url: v.url,
                httpStatus: 'CRASH/TIMEOUT',
                buttonCount: 0,
                localStorageKeys: [],
                errors: [err.message],
                warnings: [],
                failedRequests
            });
        }

        page.off('console', onConsole);
        page.off('pageerror', onPageError);
        page.off('requestfailed', onRequestFailed);
        page.off('response', onResponse);
    }

    await browser.close();

    console.log('\n================ RESUMEN DE AUDITORÍA ================');
    let hasIssues = false;
    for (const r of results) {
        const errCount = r.errors.length + r.failedRequests.length + (r.localStorageKeys.length > 0 ? 1 : 0);
        if (errCount > 0 || r.httpStatus >= 400 || r.httpStatus === 'CRASH/TIMEOUT') {
            hasIssues = true;
            console.log(`❌ [${r.name}] (${r.url}) - Status: ${r.httpStatus} | Botones: ${r.buttonCount}`);
            if (r.errors.length > 0) console.log('   Errores JS:', r.errors);
            if (r.failedRequests.length > 0) console.log('   Peticiones fallidas:', r.failedRequests);
            if (r.localStorageKeys.length > 0) console.log('   LocalStorage keys detectadas:', r.localStorageKeys);
        } else {
            console.log(`✅ [${r.name}] (${r.url}) - Status: ${r.httpStatus} | Botones: ${r.buttonCount} | 0 errores`);
        }
    }

    fs.writeFileSync('scripts/audit_results.json', JSON.stringify(results, null, 2));
    console.log('\nReporte guardado en scripts/audit_results.json');
    process.exit(0);
})();
