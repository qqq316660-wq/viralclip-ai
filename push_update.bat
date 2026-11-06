@echo off
cd /d "%~dp0"
title ViralClip AI - Push Live Update to Users
echo ========================================================
echo       ViralClip AI Studio - Push Live Update Tool
echo ========================================================
echo.

set "PY=python.exe"
if exist "%LOCALAPPDATA%\Programs\ViralClip AI\python\python.exe" (
    set "PY=%LOCALAPPDATA%\Programs\ViralClip AI\python\python.exe"
)

"%PY%" "%~dp0tools\push_update.py" %*

echo.
pause

