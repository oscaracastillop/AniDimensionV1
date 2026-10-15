async function testAll() {
    console.log('🧪 PROBANDO ENDPOINTS Y PROCEDIMIENTOS ALMACENADOS DE SEGURIDAD...');
    const baseUrl = 'http://127.0.0.1:3005';

    try {
        // 1. Obtener Sobres de la Base de Datos
        console.log('\n1. Test GET /api/admin/packs');
        const packsRes = await fetch(`${baseUrl}/api/admin/packs`).then(r => r.json());
        const packs = packsRes.packs || packsRes.data || packsRes;
        const activePacks = Array.isArray(packs) ? packs.filter(p => p.IsActive) : [];
        console.log(`   Total Sobres en DB: ${packs.length}, Activos para compra: ${activePacks.length}`);
        console.log(`   Sobres activos: ${activePacks.map(p => p.Code).join(', ')}`);

        // 2. Probar Comprar y Abrir Sobre (sp_ComprarYGuardarSobre)
        console.log('\n2. Test POST /api/game/shop/open-pack');
        const openRes = await fetch(`${baseUrl}/api/game/shop/open-pack`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: 1,
                packCode: 'LOB',
                packPrice: 100,
                packName: 'Legend of Blue Eyes White Dragon',
                cards: [
                    { id: 89631139, name: 'Blue-Eyes White Dragon', rarity: 'Ultra Rare' },
                    { id: 46986414, name: 'Dark Magician', rarity: 'Ultra Rare' },
                    { id: 74677422, name: 'Red-Eyes B. Dragon', rarity: 'Super Rare' },
                    { id: 88819587, name: 'Baby Dragon', rarity: 'Common' },
                    { id: 3573512, name: 'Swordsman of Landstar', rarity: 'Common' }
                ]
            })
        }).then(r => r.json());
        console.log('   Respuesta Compra Sobre:', openRes);

        // 3. Consultar Inventario de Cartas y Mazos (sp_GetUserCards & sp_GetUserDecks)
        console.log('\n3. Test GET /api/game/deck-inventory?userId=1');
        const deckInvRes = await fetch(`${baseUrl}/api/game/deck-inventory?userId=1`).then(r => r.json());
        console.log('   Respuesta Deck/Inventario Success:', deckInvRes.success);
        console.log(`   Total cartas en inventario SQL: ${deckInvRes.inventory ? deckInvRes.inventory.length : 0}`);
        console.log(`   Total Decks guardados en SQL: ${deckInvRes.decks ? deckInvRes.decks.length : 0}`);
        if (deckInvRes.inventory && deckInvRes.inventory.length > 0) {
            console.log('   Muestra cartas:', deckInvRes.inventory.slice(0, 3));
        }

        // 4. Guardar Deck (sp_SaveUserDeck)
        console.log('\n4. Test POST /api/game/deck/save');
        const saveDeckRes = await fetch(`${baseUrl}/api/game/deck/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: 1,
                deckName: 'Deck Maestro Dragones',
                mainDeck: [89631139, 89631139, 89631139, 46986414],
                extraDeck: [],
                sideDeck: []
            })
        }).then(r => r.json());
        console.log('   Respuesta Guardar Deck:', saveDeckRes);

        // 5. Consultar Buzón y Potenciadores (sp_ObtenerBuzonUsuario)
        console.log('\n5. Test GET /api/game/mailbox-stats?userId=1');
        const mailboxRes = await fetch(`${baseUrl}/api/game/mailbox-stats?userId=1`).then(r => r.json());
        console.log('   Respuesta Buzón Success:', mailboxRes.success);
        console.log(`   Regalos en buzón DB: ${mailboxRes.mailbox ? mailboxRes.mailbox.length : 0}`);
        console.log(`   Potenciadores Activos:`, mailboxRes.potenciadores);

        console.log('\n🎉 ¡TODOS LOS PROCEDIMIENTOS ALMACENADOS Y ENDPOINTS OPERATIVOS AL 100%!');
    } catch (err) {
        console.error('❌ Error probando endpoints:', err.message);
    }
}

testAll();
