@echo off
title Ani-Dimension Server - Puerto 3006
cd /d "%~dp0"
echo ========================================================
echo  Iniciando Servidor Ani-Dimension (Node.js + SQL Server)
echo ========================================================
node backend/server.js
pause
