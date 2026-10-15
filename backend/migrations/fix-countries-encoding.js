const { getPool, sql } = require('../config/db');

const COUNTRIES_LIST = [
    { iso: 'AR', name: 'Argentina', flag: '🇦🇷', prefix: '+54' },
    { iso: 'BO', name: 'Bolivia', flag: '🇧🇴', prefix: '+591' },
    { iso: 'BR', name: 'Brasil', flag: '🇧🇷', prefix: '+55' },
    { iso: 'CA', name: 'Canadá', flag: '🇨🇦', prefix: '+1' },
    { iso: 'CL', name: 'Chile', flag: '🇨🇱', prefix: '+56' },
    { iso: 'CO', name: 'Colombia', flag: '🇨🇴', prefix: '+57' },
    { iso: 'CR', name: 'Costa Rica', flag: '🇨🇷', prefix: '+506' },
    { iso: 'DE', name: 'Alemania', flag: '🇩🇪', prefix: '+49' },
    { iso: 'DO', name: 'República Dominicana', flag: '🇩🇴', prefix: '+1-809' },
    { iso: 'EC', name: 'Ecuador', flag: '🇪🇨', prefix: '+593' },
    { iso: 'ES', name: 'España', flag: '🇪🇸', prefix: '+34' },
    { iso: 'FR', name: 'Francia', flag: '🇫🇷', prefix: '+33' },
    { iso: 'GB', name: 'Reino Unido', flag: '🇬🇧', prefix: '+44' },
    { iso: 'GT', name: 'Guatemala', flag: '🇬🇹', prefix: '+502' },
    { iso: 'HN', name: 'Honduras', flag: '🇭🇳', prefix: '+504' },
    { iso: 'IT', name: 'Italia', flag: '🇮🇹', prefix: '+39' },
    { iso: 'JP', name: 'Japón', flag: '🇯🇵', prefix: '+81' },
    { iso: 'KR', name: 'Corea del Sur', flag: '🇰🇷', prefix: '+82' },
    { iso: 'MX', name: 'México', flag: '🇲🇽', prefix: '+52' },
    { iso: 'NI', name: 'Nicaragua', flag: '🇳🇮', prefix: '+505' },
    { iso: 'PA', name: 'Panamá', flag: '🇵🇦', prefix: '+507' },
    { iso: 'PE', name: 'Perú', flag: '🇵🇪', prefix: '+51' },
    { iso: 'PR', name: 'Puerto Rico', flag: '🇵🇷', prefix: '+1-787' },
    { iso: 'PY', name: 'Paraguay', flag: '🇵🇾', prefix: '+595' },
    { iso: 'SV', name: 'El Salvador', flag: '🇸🇻', prefix: '+503' },
    { iso: 'US', name: 'Estados Unidos', flag: '🇺🇸', prefix: '+1' },
    { iso: 'UY', name: 'Uruguay', flag: '🇺🇾', prefix: '+598' },
    { iso: 'VE', name: 'Venezuela', flag: '🇻🇪', prefix: '+58' }
];

async function fixCountriesEncoding() {
    try {
        console.log('⚡ Conectando a SQL Server...');
        const pool = await getPool();

        for (const c of COUNTRIES_LIST) {
            const svgUrl = `/assets/images/flags/${c.iso.toLowerCase()}.svg`;
            await pool.request()
                .input('iso', sql.NVarChar(5), c.iso)
                .input('name', sql.NVarChar(100), c.name)
                .input('flag', sql.NVarChar(10), c.flag)
                .input('svg', sql.NVarChar(255), svgUrl)
                .input('prefix', sql.NVarChar(10), c.prefix)
                .query(`
                    IF EXISTS (SELECT 1 FROM dbo.Countries WHERE IsoCode = @iso)
                    BEGIN
                        UPDATE dbo.Countries 
                        SET Name = @name, 
                            FlagEmoji = @flag, 
                            FlagSvgUrl = @svg, 
                            PhonePrefix = @prefix
                        WHERE IsoCode = @iso;
                    END
                    ELSE
                    BEGIN
                        INSERT INTO dbo.Countries (IsoCode, Name, FlagEmoji, FlagSvgUrl, PhonePrefix)
                        VALUES (@iso, @name, @flag, @svg, @prefix);
                    END
                `);
        }

        console.log('✅ Catálogo dbo.Countries actualizado exitosamente con codificación UTF-8 e insignias oficiales.');
        
        // Verificación
        const check = await pool.request().query('SELECT IsoCode, Name, FlagEmoji FROM dbo.Countries ORDER BY Name ASC');
        console.log('📋 Muestra verificada:');
        console.log(check.recordset);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error actualizando países:', err);
        process.exit(1);
    }
}

fixCountriesEncoding();
