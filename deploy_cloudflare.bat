@echo off
title Deploy ViralClip AI to Cloudflare Pages
cd /d "%~dp0\website"

echo ===================================================
echo   Deploying ViralClip AI to Cloudflare Pages
echo ===================================================
echo.
echo Step 1: Building latest website assets...
call npm run build

echo.
echo Step 2: Deploying to Cloudflare Pages...
echo (If this is your first time, a browser window will open to authorize Cloudflare)
echo.
call npx wrangler pages deploy dist --project-name viralclipai --commit-dirty=true

echo.
echo ===================================================
echo Deployment finished!
echo Go to Cloudflare Dashboard -> Workers & Pages -> viralclipai
echo and connect your custom domain: viralclipai.cyou
echo ===================================================
pause
