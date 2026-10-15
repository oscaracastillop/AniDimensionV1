const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'backend', 'engine', 'card_effects');
const files = fs.readdirSync(dir);

let modifiedCount = 0;

files.forEach(f => {
    if (!f.endsWith('.js')) return;
    const p = path.join(dir, f);
    let content = fs.readFileSync(p, 'utf8');
    let original = content;

    // Pattern 1: Sangan / searchers
    content = content.replace(
        /\(c\.atk !== undefined && c\.atk <= 1500\) \|\| \(c\.card_data\?\.atk !== undefined && c\.card_data\.atk <= 1500\)/g,
        "((c.type || c.card_data?.type || '').toLowerCase().includes('monster') && ((c.atk !== null && c.atk !== undefined && c.atk <= 1500) || (c.card_data?.atk !== null && c.card_data?.atk !== undefined && c.card_data.atk <= 1500)))"
    );

    // Pattern 2: (c.type || '').toLowerCase().includes('monster') || c.atk !== undefined
    content = content.replace(
        /\(c\.type \|\| ''\)\.toLowerCase\(\)\.includes\('monster'\) \|\| c\.atk !== undefined/g,
        "(!((c.type || '').toLowerCase().includes('spell') || (c.type || '').toLowerCase().includes('trap')) && ((c.type || '').toLowerCase().includes('monster') || (c.atk !== null && c.atk !== undefined)))"
    );

    // Pattern 3: (c.type || '').includes('Monster') || c.atk !== undefined || c.card_data?.atk !== undefined
    content = content.replace(
        /\(c\.type \|\| ''\)\.includes\('Monster'\) \|\| c\.atk !== undefined \|\| c\.card_data\?\.atk !== undefined/g,
        "(!((c.type || '').toLowerCase().includes('spell') || (c.type || '').toLowerCase().includes('trap')) && ((c.type || '').toLowerCase().includes('monster') || (c.atk !== null && c.atk !== undefined)))"
    );

    // Pattern 4: (rCard.type || '').toLowerCase().includes('monster') || rCard.atk !== undefined
    content = content.replace(
        /\(rCard\.type \|\| ''\)\.toLowerCase\(\)\.includes\('monster'\) \|\| rCard\.atk !== undefined/g,
        "(!((rCard.type || '').toLowerCase().includes('spell') || (rCard.type || '').toLowerCase().includes('trap')) && ((rCard.type || '').toLowerCase().includes('monster') || (rCard.atk !== null && rCard.atk !== undefined)))"
    );

    // Pattern 5: (c.type || '').includes('Monster') || c.atk !== undefined
    content = content.replace(
        /\(c\.type \|\| ''\)\.includes\('Monster'\) \|\| c\.atk !== undefined/g,
        "(!((c.type || '').toLowerCase().includes('spell') || (c.type || '').toLowerCase().includes('trap')) && ((c.type || '').toLowerCase().includes('monster') || (c.atk !== null && c.atk !== undefined)))"
    );

    if (content !== original) {
        fs.writeFileSync(p, content, 'utf8');
        modifiedCount++;
    }
});

console.log('Successfully patched monster checks in', modifiedCount, 'card modules.');
