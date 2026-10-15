@echo off
if not defined JAVA_HOME (
    if exist "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot" (
        set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
    ) else if exist "C:\Program Files\Android\openjdk\jdk-21.0.8" (
        set "JAVA_HOME=C:\Program Files\Android\openjdk\jdk-21.0.8"
    )
)
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "%~dp0"

echo Purgando recursos de audio para mantener APK ligero...
if exist "app\src\main\assets\public\assets\audio" rd /s /q "app\src\main\assets\public\assets\audio"

echo Compilando APK con Gradle Wrapper (Modo Ligero)...
call gradlew.bat assembleDebug

if %ERRORLEVEL% equ 0 (
    if not exist "..\release" mkdir "..\release"
    copy /y "app\build\outputs\apk\debug\app-debug.apk" "..\AniDimension.apk"
    copy /y "app\build\outputs\apk\debug\app-debug.apk" "..\release\AniDimension.apk"
    echo ========================================================
    echo  APK COMPILADO EXITOSAMENTE:
    echo  1. ..\AniDimension.apk
    echo  2. ..\release\AniDimension.apk
    echo ========================================================
) else (
    echo ========================================================
    echo  ERROR COMPILANDO APK CON GRADLE
    echo ========================================================
    exit /b 1
)
