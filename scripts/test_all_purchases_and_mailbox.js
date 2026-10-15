/**
 * ============================================================================
 * ANI-DIMENSION: TEST SUITE COMPLETO DE COMPRAS Y BUZÓN (END-TO-END)
 * ============================================================================
 */
const http = require('http');

function apiRequest(method, path, body) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const req = http.request({
            hostname: '127.0.0.1',
            port: 3006,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': '1',
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch(e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Iniciando prueba de compras y buzón contra el servidor en puerto 3006...');

    // 1. Probar compra de cosmético (Avatar)
    console.log('\n1. Test POST /api/game/cosmetics/buy (Comprar Avatar)');
    const buyAvatarRes = await apiRequest('POST', '/api/game/cosmetics/buy', {
        userId: 1,
        itemType: 'AVATAR',
        itemCode: 'AVA-004',
        costStarships: 100,
        expBoost: 10.0,
        starshipsBoost: 10.0,
        luckBoost: 2.0
    });
    console.log('   Status:', buyAvatarRes.status, 'Response:', buyAvatarRes.data);

    // 2. Probar compra de Tapete
    console.log('\n2. Test POST /api/game/cosmetics/buy (Comprar Playmat)');
    const buyMatRes = await apiRequest('POST', '/api/game/cosmetics/buy', {
        userId: 1,
        itemType: 'PLAYMAT',
        itemCode: 'MAT-002',
        costStarships: 100
    });
    console.log('   Status:', buyMatRes.status, 'Response:', buyMatRes.data);

    // 3. Probar compra de Funda
    console.log('\n3. Test POST /api/game/cosmetics/buy (Comprar Sleeve)');
    const buySleeveRes = await apiRequest('POST', '/api/game/cosmetics/buy', {
        userId: 1,
        itemType: 'SLEEVE',
        itemCode: 'SLEEVE-002',
        costStarships: 100
    });
    console.log('   Status:', buySleeveRes.status, 'Response:', buySleeveRes.data);

    // 4. Probar compra de Potenciador
    console.log('\n4. Test POST /api/game/potenciadores/buy');
    const buyPotRes = await apiRequest('POST', '/api/game/potenciadores/buy', {
        userId: 1,
        potenciadorId: 'POT-001',
        costStarships: 500,
        expBoost: 15.0,
        starshipsBoost: 0,
        luckBoost: 0
    });
    console.log('   Status:', buyPotRes.status, 'Response:', buyPotRes.data);

    // 5. Consultar Buzón
    console.log('\n5. Test GET /api/admin/mailbox?userId=1');
    const mailboxRes = await apiRequest('GET', '/api/admin/mailbox?userId=1');
    console.log('   Status:', mailboxRes.status, 'Total Regalos:', mailboxRes.data && mailboxRes.data.gifts ? mailboxRes.data.gifts.length : 0);
    if (mailboxRes.data && mailboxRes.data.gifts && mailboxRes.data.gifts.length > 0) {
        console.log('   Primer regalo:', mailboxRes.data.gifts[0]);
        const giftId = mailboxRes.data.gifts[0].id;
        
        // 6. Probar reclamo de regalo
        console.log(`\n6. Test POST /api/admin/mailbox/claim (Reclamar regalo ID ${giftId})`);
        const claimRes = await apiRequest('POST', '/api/admin/mailbox/claim', {
            giftId: giftId,
            userId: 1,
            username: 'Admin'
        });
        console.log('   Status:', claimRes.status, 'Response:', claimRes.data);
    }

    console.log('\n🎉 ¡TODAS LAS PRUEBAS COMPLETADAS!');
    process.exit(0);
}

runTests().catch(e => {
    console.error('❌ Error en test suite:', e);
    process.exit(1);
});
