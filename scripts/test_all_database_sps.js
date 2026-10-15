const { getPool, sql } = require('../backend/config/db');

async function testAllSps() {
    console.log('====================================================');
    console.log('VERIFICANDO TODOS LOS PROCEDIMIENTOS ALMACENADOS');
    console.log('====================================================');
    
    let pool;
    try {
        pool = await getPool();
    } catch (err) {
        console.error('ERROR CONEXION:', err);
        return;
    }

    const tests = [
        {
            name: 'sp_ObtenerDetallePerfilUsuario',
            run: async () => {
                const res = await pool.request()
                    .input('UserId', sql.Int, 1)
                    .input('Username', sql.VarChar(50), 'admin')
                    .execute('dbo.sp_ObtenerDetallePerfilUsuario');
                return res.recordsets.length > 0;
            }
        },
        {
            name: 'sp_ObtenerCatalogoAventura',
            run: async () => {
                const res = await pool.request().execute('dbo.sp_ObtenerCatalogoAventura');
                return res.recordsets.length === 3;
            }
        },
        {
            name: 'sp_ObtenerMedallasUsuario',
            run: async () => {
                const res = await pool.request()
                    .input('UserId', sql.Int, 1)
                    .execute('dbo.sp_ObtenerMedallasUsuario');
                return res.recordsets.length >= 2;
            }
        },
        {
            name: 'sp_ObtenerDeckNpc',
            run: async () => {
                const res = await pool.request()
                    .input('NpcId', sql.Int, 1)
                    .execute('dbo.sp_ObtenerDeckNpc');
                return res.recordsets.length >= 2;
            }
        },
        {
            name: 'sp_ObtenerDeckEInventario',
            run: async () => {
                const res = await pool.request()
                    .input('UserId', sql.Int, 1)
                    .execute('dbo.sp_ObtenerDeckEInventario');
                return res.recordsets.length >= 2;
            }
        },
        {
            name: 'sp_ObtenerCosmeticosUsuario',
            run: async () => {
                const res = await pool.request()
                    .input('UserId', sql.Int, 1)
                    .execute('dbo.sp_ObtenerCosmeticosUsuario');
                return res.recordsets.length >= 3;
            }
        },
        {
            name: 'sp_ObtenerBuzonYStats',
            run: async () => {
                const res = await pool.request()
                    .input('UserId', sql.Int, 1)
                    .execute('dbo.sp_ObtenerBuzonYStats');
                return res.recordsets.length >= 2;
            }
        },
        {
            name: 'sp_ObtenerEstadisticasDuelosUsuario',
            run: async () => {
                const res = await pool.request()
                    .input('UserId', sql.Int, 1)
                    .input('Username', sql.NVarChar(50), 'admin')
                    .execute('dbo.sp_ObtenerEstadisticasDuelosUsuario');
                return res.recordsets.length >= 2;
            }
        },
        {
            name: 'sp_ObtenerListaClanes',
            run: async () => {
                const res = await pool.request()
                    .input('UserId', sql.Int, 1)
                    .execute('dbo.sp_ObtenerListaClanes');
                return res.recordsets.length >= 1;
            }
        },
        {
            name: 'sp_ObtenerTorneos',
            run: async () => {
                const res = await pool.request().execute('dbo.sp_ObtenerTorneos');
                return res.recordsets.length >= 1;
            }
        },
        {
            name: 'sp_ObtenerHistorialChat',
            run: async () => {
                const res = await pool.request()
                    .input('UserId', sql.Int, 1)
                    .input('TargetUsername', sql.NVarChar(50), null)
                    .input('Limit', sql.Int, 50)
                    .execute('dbo.sp_ObtenerHistorialChat');
                return res.recordsets.length >= 1;
            }
        },
        {
            name: 'sp_GetBoosterPacks',
            run: async () => {
                const res = await pool.request().execute('dbo.sp_GetBoosterPacks');
                return res.recordsets.length >= 1;
            }
        },
        {
            name: 'sp_GetCardInfo',
            run: async () => {
                const res = await pool.request()
                    .input('CardId', sql.Int, 89631139) // Blue-Eyes
                    .execute('dbo.sp_GetCardInfo');
                return res.recordsets.length >= 1 && res.recordsets[0].length > 0;
            }
        },
        {
            name: 'sp_ObtenerEstadoRompecabezasUsuario',
            run: async () => {
                const res = await pool.request()
                    .input('UserId', sql.Int, 1)
                    .input('EventId', sql.Int, 1)
                    .execute('dbo.sp_ObtenerEstadoRompecabezasUsuario');
                return res.recordsets.length >= 1;
            }
        },
        {
            name: 'sp_ObtenerHistorialComprasSingles',
            run: async () => {
                const res = await pool.request()
                    .input('UsuarioId', sql.Int, 1)
                    .input('Limit', sql.Int, 10)
                    .execute('dbo.sp_ObtenerHistorialComprasSingles');
                return res.recordsets.length >= 1;
            }
        },
        {
            name: 'sp_VerificarSesionYRol',
            run: async () => {
                const res = await pool.request()
                    .input('UserId', sql.Int, 1)
                    .input('SessionToken', sql.NVarChar(100), 'dummy')
                    .execute('dbo.sp_VerificarSesionYRol');
                return res.recordsets.length >= 1;
            }
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const t of tests) {
        try {
            const ok = await t.run();
            if (ok) {
                console.log(`✅ [OK] ${t.name}`);
                passed++;
            } else {
                console.warn(`⚠️ [WARN] ${t.name}: retornó respuesta inesperada`);
                failed++;
            }
        } catch (err) {
            console.error(`❌ [FAIL] ${t.name}:`, err.message);
            failed++;
        }
    }

    console.log(`\nRESUMEN: ${passed} pasados, ${failed} fallados de ${tests.length} SPs testeados.`);
    await pool.close();
}

testAllSps();
