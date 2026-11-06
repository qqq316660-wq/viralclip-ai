@echo off
cd /d "%~dp0"
echo Starting ViralClip AI Backend on http://127.0.0.1:8000 ...
"C:\Users\Akash\AppData\Local\Programs\Autoclip v2\python\python.exe" "%~dp0backend\run_server.py"
pause
