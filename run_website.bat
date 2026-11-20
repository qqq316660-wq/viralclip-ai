@echo off
title ViralClip AI - Landing Page Website
cd /d "%~dp0\website"
echo Starting ViralClip AI Landing Page Website...
echo Open http://localhost:5173/ in your browser
npm run dev -- --host --port 5173
pause
