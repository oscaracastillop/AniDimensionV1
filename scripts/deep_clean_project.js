const fs = require('fs');
const path = require('path');

console.log('--- INICIANDO LIMPIEZA PROFUNDA DEL PROYECTO ANI DIMENSION ---');

let freedBytes = 0;

function removeFile(fileRel) {
    const full = path.join(__dirname, '..', fileRel);
    try {
        if (fs.existsSync(full)) {
            const size = fs.statSync(full).size;
            fs.unlinkSync(full);
            freedBytes += size;
            console.log(`✓ Archivo eliminado: ${fileRel} (${(size / 1024 / 1024).toFixed(2)} MB)`);
        }
    } catch (e) {
        console.warn(`! No se pudo eliminar ${fileRel}:`, e.message);
    }
}

function removeDir(dirRel) {
    const full = path.join(__dirname, '..', dirRel);
    try {
        if (fs.existsSync(full)) {
            let size = 0;
            function calc(d) {
                const list = fs.readdirSync(d);
                for (const item of list) {
                    const p = path.join(d, item);
                    const s = fs.statSync(p);
                    if (s.isDirectory()) calc(p);
                    else size += s.size;
                }
            }
            calc(full);
            fs.rmSync(full, { recursive: true, force: true });
            freedBytes += size;
            console.log(`✓ Carpeta eliminada: ${dirRel} (${(size / 1024 / 1024).toFixed(2)} MB)`);
        }
    } catch (e) {
        console.warn(`! No se pudo eliminar ${dirRel}:`, e.message);
    }
}

// 1. Archivos RAR pesados en la raíz
removeFile('Ani Dimension.rar');
removeFile('frontend.rar');
removeFile('backend.rar');

// 2. Archivos temporales de raíz y backups obsoletos
removeFile('diff_duel_board.txt');
removeDir('backup_checkpoint_pre_floating_info');

// 3. Backups .bak y scripts obsoletos
removeFile('backups/AniDimensionDB.bak');
removeFile('backups/AniDimensionDB_latest.bak');
removeFile('database/AniDimensionDB.bak');
removeFile('backups/AniDimensionDB_install.sql');

// 4. Logs viejos de duelos y bugs
removeDir('logs');
removeDir('backend/logs');

// 5. Carpeta scratch de pruebas temporales
removeDir('scratch');

// 6. Limpiar archivos de caché y build de android
removeDir('android/app/build/intermediates');
removeDir('android/app/build/tmp');

console.log(`\n🎉 LIMPIEZA FINALIZADA CON ÉXITO.`);
console.log(`Espacio total recuperado: ${(freedBytes / 1024 / 1024).toFixed(2)} MB (~${(freedBytes / 1024 / 1024 / 1024).toFixed(2)} GB)`);
