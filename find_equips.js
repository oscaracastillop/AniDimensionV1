const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'backend', 'engine', 'card_effects');
if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        if (!f.endsWith('.js')) continue;
        const full = path.join(dir, f);
        const c = fs.readFileSync(full, 'utf8');
        if (c.includes('Equip') || c.includes('canEquip') || c.includes('atkBonus')) {
            const m = c.match(/name:\s*["']([^"']+)["']/);
            console.log(f + ': ' + (m ? m[1] : ''));
        }
    }
}
