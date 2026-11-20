@echo off
echo ====================================================
echo  Publishing ViralClip AI v1.7.1 OTA Update to Users
echo ====================================================
echo [1/2] Pushing release manifest and update package to origin...
git push origin distribution:main
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to push update to origin.
    pause
    exit /b %ERRORLEVEL%
)
echo [OK] Successfully published update v1.7.1 to origin!
echo.
echo [2/2] Pushing source code to private repo...
git push source main
echo ====================================================
echo  ALL DONE! Users will now receive v1.7.1 Update!
echo ====================================================
pause
