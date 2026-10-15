@echo off
title Compilador Oficial de APK - Ani-Dimension
cd /d "%~dp0"

echo ========================================================
echo   COMPILANDO APK OFICIAL: AniDimension.apk
echo ========================================================

echo 1. Sincronizando recursos web con Capacitor...
call npx cap sync android

echo 1.1 Optimizando peso del APK: Excluyendo audios pesados para descarga bajo demanda...
if exist "%~dp0android\app\src\main\assets\public\assets\audio" (
    rmdir /S /Q "%~dp0android\app\src\main\assets\public\assets\audio"
    mkdir "%~dp0android\app\src\main\assets\public\assets\audio"
    mkdir "%~dp0android\app\src\main\assets\public\assets\audio\bgm"
    mkdir "%~dp0android\app\src\main\assets\public\assets\audio\sfx"
)

set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo 2. Compilando aplicacion nativa Android...
cd /d "%~dp0android"
call gradlew.bat assembleDebug

cd /d "%~dp0"
if not exist "%~dp0apk" mkdir "%~dp0apk"

echo 3. Guardando APK final...
copy /Y "%~dp0android\app\build\outputs\apk\debug\app-debug.apk" "%~dp0apk\AniDimension.apk" >nul
copy /Y "%~dp0android\app\build\outputs\apk\debug\app-debug.apk" "%~dp0AniDimension.apk" >nul

echo ========================================================
echo   EXITO: Tu APK esta listo en:
echo   - %~dp0apk\AniDimension.apk
echo   - %~dp0AniDimension.apk
echo ========================================================
