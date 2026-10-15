const { getPool, sql } = require('../config/db');

async function updateSpEquiparCosmetico() {
    try {
        const pool = await getPool();
        const cols = await pool.request().query(`
            SELECT TABLE_NAME, COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME IN ('Usuarios', 'UserAvatars', 'UserPlaymats', 'UserSleeves', 'AvataresCatalogo')
            ORDER BY TABLE_NAME, ORDINAL_POSITION
        `);
        console.log('[COLUMNS]', cols.recordset);

        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_EquiparCosmetico
                @UserId INT = NULL,
                @UsuarioId INT = NULL,
                @ItemType VARCHAR(20) = NULL,
                @ItemCode VARCHAR(50) = NULL,
                @AvatarId NVARCHAR(50) = NULL,
                @MatId NVARCHAR(50) = NULL,
                @FundaId NVARCHAR(50) = NULL
            AS
            BEGIN
                SET NOCOUNT ON;
                
                DECLARE @TargetUserId INT = COALESCE(@UserId, @UsuarioId);
                IF @TargetUserId IS NULL
                BEGIN
                    SELECT 0 AS Success, 'Usuario no especificado.' AS Message;
                    RETURN;
                END

                IF @AvatarId IS NOT NULL OR @MatId IS NOT NULL OR @FundaId IS NOT NULL
                BEGIN
                    UPDATE dbo.Usuarios
                    SET 
                        AvatarActivoId = ISNULL(@AvatarId, AvatarActivoId),
                        MatActivoId = ISNULL(@MatId, MatActivoId),
                        FundaActivaId = ISNULL(@FundaId, FundaActivaId)
                    WHERE Id = @TargetUserId;

                    SELECT 
                        1 AS Success, 
                        AvatarActivoId, 
                        MatActivoId, 
                        FundaActivaId, 
                        'Cosméticos activos actualizados.' AS Message
                    FROM dbo.Usuarios WHERE Id = @TargetUserId;
                    RETURN;
                END

                DECLARE @Type VARCHAR(20) = UPPER(LTRIM(RTRIM(ISNULL(@ItemType, ''))));
                DECLARE @Code VARCHAR(50) = LTRIM(RTRIM(ISNULL(@ItemCode, '')));
                
                IF @Code = 'NONE' OR @Code = 'DEFAULT' OR @Code = 'null' OR @Code = 'EMPTY' OR @Code = ''
                BEGIN
                    SET @Code = NULL;
                END

                IF @Type = 'AVATAR'
                BEGIN
                    UPDATE dbo.Usuarios SET AvatarActivoId = @Code WHERE Id = @TargetUserId;
                    SELECT 1 AS Success, 'Avatar activado exitosamente.' AS Message;
                    RETURN;
                END
                ELSE IF @Type = 'PLAYMAT'
                BEGIN
                    UPDATE dbo.Usuarios SET MatActivoId = @Code WHERE Id = @TargetUserId;
                    SELECT 1 AS Success, 'Tapete activado exitosamente.' AS Message;
                    RETURN;
                END
                ELSE IF @Type = 'SLEEVE'
                BEGIN
                    UPDATE dbo.Usuarios SET FundaActivaId = @Code WHERE Id = @TargetUserId;
                    SELECT 1 AS Success, 'Funda protectora activada exitosamente.' AS Message;
                    RETURN;
                END

                SELECT 0 AS Success, 'Tipo de cosmético desconocido.' AS Message;
            END
        `);

        console.log('✅ dbo.sp_EquiparCosmetico actualizado exitosamente.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

updateSpEquiparCosmetico();
