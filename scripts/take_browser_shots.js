const { execFileSync } = require('child_process');
const path = require('path');
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function capture(url, outPath, w = 1100, h = 650) {
    execFileSync(edge, [
        '--headless',
        '--disable-gpu',
        `--window-size=${w},${h}`,
        `--screenshot=${path.resolve(outPath)}`,
        '--hide-scrollbars',
        url
    ]);
    console.log(`Captured ${url} -> ${outPath}`);
}

capture('http://localhost:3005/views/rankings/rankings.html', 'frontend/assets/images/rankings_preview.png');
capture('http://localhost:3005/views/login/login.html', 'frontend/assets/images/login_preview.png');
capture('http://localhost:3005/views/register/register.html', 'frontend/assets/images/register_preview.png');
