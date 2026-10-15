@echo off
title Ani-Dimension :: Game Server Control Panel (Mu-Server Style)
cd /d "%~dp0"

echo ==============================================================================
echo   ANI-DIMENSION :: GAME SERVER SUPERVISOR ^& CONTROL PANEL
echo ==============================================================================
echo  Iniciando supervisor en puerto 3007 y servidor de juego en puerto 3006...
echo ==============================================================================

:: Iniciar el supervisor en segundo plano con Node.js
start /b node backend/manager/server-supervisor.js

:: Esperar 2 segundos a que el supervisor levante
timeout /t 2 /nobreak >nul

:: Abrir el panel de control como ventana de aplicacion de escritorio nativa (Chrome App Mode)
set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if exist %CHROME_PATH% (
    start "" %CHROME_PATH% --app="http://localhost:3007" --window-size=1150,780
) else (
    start http://localhost:3007
)

echo.
echo  [OK] Panel de control interactivo desplegado en tu pantalla.
echo  Puedes minimizar esta ventana o presionar cualquier tecla para cerrar el launcher.
echo ==============================================================================
pause
