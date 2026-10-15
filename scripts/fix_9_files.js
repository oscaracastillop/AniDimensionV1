const fs = require('fs');
const path = require('path');
const dir = path.resolve(__dirname, '..', 'backend', 'engine', 'card_effects');

const files = [
    'c10000080.js',
    'c11082056.js',
    'c1784686.js',
    'c46232525.js',
    'c57728570.js',
    'c75347539.js',
    'c80019195.js',
    'c85800949.js',
    'c89397517.js'
];

files.forEach(f => {
    const p = path.join(dir, f);
    let content = fs.readFileSync(p, 'utf8');
    
    // Normalizar líneas con ocgCardReader
    content = content.replace(/\(utils\.ocgCardReader \? utils\.ocgCardReader\([^)]*\) : \)/g, '{ name: "Carta" }');
    content = content.replace(/utils\.ocgCardReader \? \(utils\.ocgCardReader \? utils\.ocgCardReader\(([^)]+)\) : ([^;]+);/g, '(utils.ocgCardReader ? utils.ocgCardReader($1) : $2);');
    content = content.replace(/utils\.ocgCardReader \? utils\.ocgCardReader\(([^)]+)\) : \)/g, '(utils.ocgCardReader ? utils.ocgCardReader($1) : { name: "Carta" })');
    content = content.replace(/\(utils\.ocgCardReader \? utils\.ocgCardReader\(([^)]+)\) : \)/g, '(utils.ocgCardReader ? utils.ocgCardReader($1) : { name: "Carta" })');

    fs.writeFileSync(p, content, 'utf8');
});

let allOk = true;
files.forEach(f => {
    const p = path.join(dir, f);
    const content = fs.readFileSync(p, 'utf8');
    try {
        new Function(content);
        console.log(`✅ ${f}: Sintaxis correcta`);
    } catch (e) {
        console.log(`❌ ${f}: ${e.message}`);
        allOk = false;
    }
});

if (allOk) {
    console.log('🎉 Los 9 archivos han sido reparados con éxito.');
}
