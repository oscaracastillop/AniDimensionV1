const { getPool } = require('../backend/config/db');

async function inspectUsers() {
    try {
        const pool = await getPool();
        const res = await pool.request().query('SELECT * FROM dbo.Usuarios');
        console.log('Usuarios encontrados:', res.recordset.length);
        res.recordset.forEach(u => {
            console.log('ID:', u.Id, '| Username:', u.Username, '| Email:', u.Email, '| Rol/Admin:', u.Rol || u.RolId || u.EsAdmin || u.Role);
        });
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

inspectUsers();
