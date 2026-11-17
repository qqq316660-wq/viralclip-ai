; Inno Setup Script for ViralClip AI Studio
; Builds a complete standalone Windows Setup Installer with bundled Python runtime,
; bundled FFmpeg, production React frontend SPA, and silent background daemon launcher.

#define MyAppName "ViralClip AI Studio"
#define MyAppVersion "1.6.8"
#define MyAppPublisher "ViralClip AI"
#define MyAppURL "https://github.com"
#define MyAppExeName "ViralClip.vbs"

[Setup]
AppId={{C78440B3-5C42-4D39-880D-B043B80E4260}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\Programs\ViralClip AI
DefaultGroupName=ViralClip AI Studio
AllowNoIcons=yes
OutputDir=d:\ns1\installer_output
OutputBaseFilename=ViralClip-AI-Setup
SetupIconFile=d:\ns1\ViralClip.ico
Compression=lzma2/fast
SolidCompression=yes
LZMANumBlockThreads=4
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
DisableProgramGroupPage=yes
CloseApplications=force
RestartApplications=no
UninstallDisplayIcon={app}\ViralClip.ico
VersionInfoVersion=1.6.8.0
VersionInfoCompany=ViralClip AI
VersionInfoDescription=ViralClip AI Studio Installer
VersionInfoTextVersion=1.6.8

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce

[Files]
; Launcher scripts and root assets
Source: "d:\ns1\ViralClip.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "d:\ns1\Stop ViralClip.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "d:\ns1\Launch.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "d:\ns1\ViralClip.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "d:\ns1\start_viralclip.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "d:\ns1\VERSION"; DestDir: "{app}"; Flags: ignoreversion
Source: "d:\ns1\storage\firebase_config.json"; DestDir: "{app}\storage"; Flags: ignoreversion

; Production compiled Web Frontend SPA
Source: "d:\ns1\frontend\dist\*"; DestDir: "{app}\web"; Flags: ignoreversion recursesubdirs createallsubdirs

; Backend API code & pipeline
Source: "d:\ns1\backend\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "__pycache__\*,*.pyc,*.pyo,*.log"

; Tools directory (Colab, Kaggle GPU server scripts & Node JS challenge solver)
Source: "d:\ns1\tools\*"; DestDir: "{app}\tools"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "__pycache__\*,*.pyc,*.pyo,*.log,*.csv,*.txt,license_manager.py,push_update.py"

; Bundled FFmpeg & FFprobe standalone binaries
Source: "C:\Users\Akash\AppData\Local\Programs\ViralClip AI\ffmpeg\*"; DestDir: "{app}\ffmpeg"; Flags: ignoreversion recursesubdirs createallsubdirs

; Bundled Python Runtime with CUDA / faster-whisper / yt-dlp dependencies
Source: "C:\Users\Akash\AppData\Local\Programs\ViralClip AI\python\*"; DestDir: "{app}\python"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "__pycache__\*,*.pyc,*.pyo,*.log"

[Dirs]
Name: "{app}\storage"
Name: "{app}\storage\downloads"
Name: "{app}\storage\audio"
Name: "{app}\storage\clips"
Name: "{app}\storage\fonts"
Name: "{app}\storage\updates"
Name: "{app}\storage\backups"
Name: "{app}\models"

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\{#MyAppExeName}"""; WorkingDir: "{app}"; IconFilename: "{app}\ViralClip.ico"
Name: "{group}\Stop {#MyAppName}"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\Stop ViralClip.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\ViralClip.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\{#MyAppExeName}"""; WorkingDir: "{app}"; IconFilename: "{app}\ViralClip.ico"; Tasks: desktopicon

[Run]
Filename: "{sys}\wscript.exe"; Parameters: """{app}\{#MyAppExeName}"""; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{sys}\wscript.exe"; Parameters: """{app}\Stop ViralClip.vbs"""; Flags: runhidden

