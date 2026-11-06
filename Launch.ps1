<#
  Launch.ps1 - Starts the ViralClip AI Studio backend hidden (no console window)
  and opens the standalone desktop app window (Chrome / Edge / Brave App Mode)
  once the backend server is ready.
#>
$ErrorActionPreference = "SilentlyContinue"
$Root = $PSScriptRoot

# Configure search paths for bundled runtime, removing untrusted mount points (.mavis etc.)
$cleanPaths = ($env:PATH -split ';') | Where-Object { $_ -and ($_ -notlike "*\.mavis\*") }
$env:PATH = "$Root\ffmpeg;$Root\tools;$Root\python;$Root\python\Scripts;" + ($cleanPaths -join ';')
$env:HF_HOME = "$Root\models"
$env:HF_HUB_DISABLE_TELEMETRY = "1"

# Check if backend is already listening on port 8001
$alreadyRunning = $false
try {
  $res = Invoke-WebRequest -Uri "http://127.0.0.1:8001/api/health" -UseBasicParsing -TimeoutSec 1
  if ($res.StatusCode -eq 200) { $alreadyRunning = $true }
} catch {}

if (-not $alreadyRunning) {
  # Prefer bundled python, fallback to system python
  $py = Join-Path $Root "python\python.exe"
  if (-not (Test-Path $py)) {
    # Check local machine installations if running in dev environment
    $autoPy = "$env:LocalAppData\Programs\ViralClip AI\python\python.exe"
    if (Test-Path $autoPy) {
      $py = $autoPy
    } else {
      $py = "python.exe"
    }
  }

  $backendDir = Join-Path $Root "backend"
  if (-not (Test-Path $backendDir)) {
    $backendDir = $Root
  }
  $env:PYTHONPATH = "$backendDir;$Root;$env:PYTHONPATH"

  $serverScript = Join-Path $backendDir "run_server.py"
  if (Test-Path $serverScript) {
    Start-Process -FilePath $py `
      -ArgumentList "`"$serverScript`"" `
      -WorkingDirectory $backendDir `
      -WindowStyle Hidden
  } else {
    Start-Process -FilePath $py `
      -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001" `
      -WorkingDirectory $backendDir `
      -WindowStyle Hidden
  }
}

# Wait until backend /api/health responds (up to 40 seconds)
$ready = $false
for ($i = 0; $i -lt 40; $i++) {
  try {
    $res = Invoke-WebRequest -Uri "http://127.0.0.1:8001/api/health" -UseBasicParsing -TimeoutSec 2
    if ($res.StatusCode -eq 200) {
      $ready = $true
      break
    }
  } catch {}
  Start-Sleep -Seconds 1
}

# Find a Chromium-based browser to launch in Dedicated Desktop App Mode (--app=...)
$candidateBrowsers = @(
  # Google Chrome
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LocalAppData\Google\Chrome\Application\chrome.exe",
  # Microsoft Edge
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:LocalAppData\Microsoft\Edge\Application\msedge.exe",
  # Brave Browser
  "$env:ProgramFiles\BraveSoftware\Brave-Browser\Application\brave.exe",
  "${env:ProgramFiles(x86)}\BraveSoftware\Brave-Browser\Application\brave.exe",
  "$env:LocalAppData\BraveSoftware\Brave-Browser\Application\brave.exe"
)

$appBrowser = $null
foreach ($browser in $candidateBrowsers) {
  if (Test-Path $browser) {
    $appBrowser = $browser
    break
  }
}

if ($appBrowser) {
  # Launch as a dedicated native desktop window without browser URL bar or tabs
  Start-Process -FilePath $appBrowser -ArgumentList "--app=http://127.0.0.1:8001/", "--window-size=1440,900"
} else {
  # Fallback to system default browser
  Start-Process "http://127.0.0.1:8001/"
}
