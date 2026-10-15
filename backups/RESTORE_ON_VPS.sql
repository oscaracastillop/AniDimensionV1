-- =====================================================================
-- SCRIPT DE RESTAURACIÓN MAESTRA EN EL VPS
-- Ejecutar en SQL Server Management Studio (SSMS) o sqlcmd en el VPS
-- =====================================================================
USE [master];
GO

-- 1. Cerrar conexiones activas si la base de datos ya existe
IF DB_ID('AniDimensionDB') IS NOT NULL
BEGIN
    ALTER DATABASE [AniDimensionDB] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [AniDimensionDB];
END
GO

-- 2. Inspeccionar nombres lógicos de los archivos del backup
RESTORE FILELISTONLY FROM DISK = N'/var/opt/mssql/backup/AniDimensionDB_fresh.bak';
-- (En Windows Server VPS la ruta suele ser: N'C:\backups\AniDimensionDB_fresh.bak')
GO

-- 3. Restaurar la base de datos completa con estructura y datos idénticos
RESTORE DATABASE [AniDimensionDB]
FROM DISK = N'C:\backups\AniDimensionDB_fresh.bak' -- <-- Ajustar a la ruta en tu VPS
WITH 
    REPLACE,
    STATS = 10;
GO

-- 4. Verificar integridad y tablas
USE [AniDimensionDB];
GO
SELECT COUNT(*) AS TotalTablas FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';
SELECT COUNT(*) AS TotalProcedimientos FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_TYPE = 'PROCEDURE';
GO
