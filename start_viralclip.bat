@echo off
cd /d "%~dp0"
title ViralClip AI Studio Launcher
echo ========================================================
echo          Starting ViralClip AI Studio...
echo ========================================================

wscript.exe "%~dp0ViralClip.vbs"
exit
