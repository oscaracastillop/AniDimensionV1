const puppeteer = require('puppeteer-core');

async function debug() {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: "new"
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log('LOG:', msg.text()));

    const loginRes = await fetch('http://localhost:3006/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'Admin', password: 'Oscar1982', force: true })
    });
    const loginData = await loginRes.json();

    await page.goto('http://localhost:3006/views/duels/npc/duel-npc.html?npcId=1');
    await page.evaluate((user, token) => {
        localStorage.setItem('ani_dimension_user', JSON.stringify(user));
        sessionStorage.setItem('ani_dimension_user', JSON.stringify(user));
        localStorage.setItem('ani_dimension_token', token);
    }, loginData.user, loginData.sessionToken);

    await page.goto('http://localhost:3006/views/duels/npc/duel-npc.html?npcId=1');
    await new Promise(r => setTimeout(r, 2000));

    const res = await page.evaluate(async () => {
        const syncRes = await window.DeckManager.syncFromServer();
        const sock = window.getSocket ? window.getSocket() : window.socket;
        return {
            syncResDeck: syncRes.deck ? { mainCount: syncRes.deck.mainDeck?.length } : null,
            getDeck: window.DeckManager.getDeck() ? { mainCount: window.DeckManager.getDeck().mainDeck?.length } : null,
            socketConnected: sock?.connected,
            socketId: sock?.id
        };
    });

    console.log('DEBUG RESULT:', JSON.stringify(res, null, 2));

    await browser.close();
}

debug();
