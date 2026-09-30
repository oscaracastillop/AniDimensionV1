@echo off
set "JAVA_HOME=C:\Program Files\Android\openjdk\jdk-21.0.8"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "%~dp0..\android"
call gradlew.bat assembleDebug
if %ERRORLEVEL% equ 0 (
    copy /y "app\build\outputs\apk\debug\app-debug.apk" "..\AniDimension.apk"
    echo APK_BUILD_SUCCESS
) else (
    echo APK_BUILD_FAILED
)
