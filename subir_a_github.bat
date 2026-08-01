@echo off
title Subir Famifinanzas a GitHub
cd /d "%~dp0"
echo ========================================================
echo   SUBIENDO Famifinanzas A GITHUB (alexandergomezsif)
echo ========================================================
echo.
git branch -M main
git remote remove origin >nul 2>&1
git remote add origin https://github.com/alexandergomezsif/Famifinanzas.git
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo   EXITO! Codigo subido correctamente a tu repositorio.
    echo ========================================================
) else (
    echo.
    echo Revisa el mensaje superior de autenticacion de GitHub.
)
echo.
pause
