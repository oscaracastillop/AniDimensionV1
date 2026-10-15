/**
 * Migración: Stored Procedures para Chat Global y Mensajería Privada (Estilo WhatsApp)
 * Base de Datos: AniDimensionDB (SQL Server)
 */
const { getPool, sql } = require('../config/db');

async function migrateChatStoredProcedures() {
    console.log('🚀 [MIGRACIÓN CHAT SP] Compilando Stored Procedures para Chat...');
    try {
        const pool = await getPool();

        // 1. Agregar columna IsDeleted si no existe
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ChatMessages' AND COLUMN_NAME = 'IsDeleted')
            BEGIN
                ALTER TABLE dbo.ChatMessages ADD IsDeleted BIT NOT NULL CONSTRAINT DF_ChatMessages_IsDeleted DEFAULT 0;
            END;
        `);

        // 2. dbo.sp_ObtenerHistorialChat (Filtra mensajes con IsDeleted = 1 para que no se muestren al usuario)
        console.log('⚡ Compilando dbo.sp_ObtenerHistorialChat...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ObtenerHistorialChat
                @UserId INT = NULL,
                @TargetUsername NVARCHAR(50) = NULL,
                @Limit INT = 100
            AS
            BEGIN
                SET NOCOUNT ON;
                
                IF @TargetUsername IS NOT NULL AND @TargetUsername <> ''
                BEGIN
                    -- Mensajes privados entre el usuario actual y @TargetUsername (solo no eliminados)
                    DECLARE @CurrentUsername NVARCHAR(50);
                    SELECT @CurrentUsername = Username FROM dbo.Usuarios WHERE Id = @UserId;

                    SELECT TOP (@Limit)
                        m.Id,
                        m.UserId,
                        m.Username,
                        m.AvatarCode,
                        m.ClanTag,
                        m.Message,
                        m.TextColor,
                        m.IsAdmin,
                        m.IsSystem,
                        m.IsPinned,
                        m.IsPrivate,
                        m.TargetUserId,
                        m.TargetUsername,
                        m.IsDeleted,
                        m.CreatedAt
                    FROM dbo.ChatMessages m
                    WHERE m.IsPrivate = 1
                      AND ISNULL(m.IsDeleted, 0) = 0
                      AND (
                           (m.Username = @CurrentUsername AND m.TargetUsername = @TargetUsername)
                        OR (m.Username = @TargetUsername AND m.TargetUsername = @CurrentUsername)
                      )
                    ORDER BY m.CreatedAt DESC;
                END
                ELSE
                BEGIN
                    -- Mensajes del canal global (solo no eliminados)
                    SELECT TOP (@Limit)
                        m.Id,
                        m.UserId,
                        m.Username,
                        m.AvatarCode,
                        m.ClanTag,
                        m.Message,
                        m.TextColor,
                        m.IsAdmin,
                        m.IsSystem,
                        m.IsPinned,
                        m.IsPrivate,
                        m.TargetUserId,
                        m.TargetUsername,
                        m.IsDeleted,
                        m.CreatedAt
                    FROM dbo.ChatMessages m
                    WHERE ISNULL(m.IsPrivate, 0) = 0
                      AND ISNULL(m.IsDeleted, 0) = 0
                    ORDER BY m.CreatedAt DESC;
                END
            END;
        `);

        // 3. dbo.sp_GuardarMensajeChat
        console.log('⚡ Compilando dbo.sp_GuardarMensajeChat...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_GuardarMensajeChat
                @UserId INT,
                @Username NVARCHAR(50),
                @AvatarCode NVARCHAR(50) = NULL,
                @ClanTag NVARCHAR(20) = NULL,
                @Message NVARCHAR(MAX),
                @TextColor NVARCHAR(30) = NULL,
                @IsAdmin BIT = 0,
                @IsSystem BIT = 0,
                @IsPinned BIT = 0,
                @IsPrivate BIT = 0,
                @TargetUserId INT = NULL,
                @TargetUsername NVARCHAR(50) = NULL
            AS
            BEGIN
                SET NOCOUNT ON;
                INSERT INTO dbo.ChatMessages (
                    UserId, Username, AvatarCode, ClanTag, Message,
                    TextColor, IsAdmin, IsSystem, IsPinned, IsPrivate,
                    TargetUserId, TargetUsername, IsDeleted, CreatedAt
                )
                VALUES (
                    @UserId, @Username, @AvatarCode, @ClanTag, @Message,
                    @TextColor, @IsAdmin, @IsSystem, @IsPinned, @IsPrivate,
                    @TargetUserId, @TargetUsername, 0, GETDATE()
                );

                SELECT SCOPE_IDENTITY() AS MessageId, GETDATE() AS CreatedAt;
            END;
        `);

        // 4. dbo.sp_EliminarMensajeChat (Soft delete: queda en DB con IsDeleted = 1)
        console.log('⚡ Compilando dbo.sp_EliminarMensajeChat...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_EliminarMensajeChat
                @MessageId BIGINT,
                @UserId INT,
                @IsAdmin BIT = 0
            AS
            BEGIN
                SET NOCOUNT ON;
                
                DECLARE @MsgOwnerId INT;
                SELECT @MsgOwnerId = UserId FROM dbo.ChatMessages WHERE Id = @MessageId;

                IF @MsgOwnerId IS NULL
                BEGIN
                    SELECT 0 AS Success, 'Mensaje no encontrado.' AS Message;
                    RETURN;
                END

                IF @IsAdmin = 1 OR @MsgOwnerId = @UserId
                BEGIN
                    UPDATE dbo.ChatMessages
                    SET IsDeleted = 1
                    WHERE Id = @MessageId;

                    SELECT 1 AS Success, 'Mensaje eliminado.' AS Message;
                END
                ELSE
                BEGIN
                    SELECT 0 AS Success, 'No tienes permisos para eliminar este mensaje.' AS Message;
                END
            END;
        `);

        // 5. dbo.sp_LimpiarConversacionPrivada (Soft delete de conversación: mantiene registros en DB con IsDeleted = 1)
        console.log('⚡ Compilando dbo.sp_LimpiarConversacionPrivada...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_LimpiarConversacionPrivada
                @UserId INT,
                @TargetUsername NVARCHAR(50) = NULL
            AS
            BEGIN
                SET NOCOUNT ON;
                DECLARE @CurrentUsername NVARCHAR(50);
                SELECT @CurrentUsername = Username FROM dbo.Usuarios WHERE Id = @UserId;

                IF @TargetUsername IS NOT NULL AND @TargetUsername <> '' AND @TargetUsername <> 'GLOBAL'
                BEGIN
                    UPDATE dbo.ChatMessages
                    SET IsDeleted = 1
                    WHERE IsPrivate = 1
                      AND (
                           (Username = @CurrentUsername AND TargetUsername = @TargetUsername)
                        OR (Username = @TargetUsername AND TargetUsername = @CurrentUsername)
                      );
                END
                ELSE
                BEGIN
                    UPDATE dbo.ChatMessages
                    SET IsDeleted = 1
                    WHERE ISNULL(IsPrivate, 0) = 0;
                END

                SELECT 1 AS Success, 'Conversación vaciada exitosamente.' AS Message;
            END;
        `);

        console.log('✅ [MIGRACIÓN CHAT SP] Todos los Stored Procedures de Chat compilados exitosamente en AniDimensionDB.');
    } catch (err) {
        console.error('❌ [ERROR MIGRACIÓN CHAT SP]', err);
        throw err;
    }
}

if (require.main === module) {
    migrateChatStoredProcedures().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { migrateChatStoredProcedures };
