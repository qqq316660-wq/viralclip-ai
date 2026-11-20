@echo off
title ViralClip AI - Production Website Preview
cd /d "%~dp0\website"
echo Starting ViralClip AI Production Preview...
echo Open http://localhost:4173/ in your browser
npm run preview -- --port 4173
pause
