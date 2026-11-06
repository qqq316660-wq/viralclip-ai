' ViralClip AI Studio Launcher
' Launches ViralClip AI in hidden background mode with no command line flashes.
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
Set shell = CreateObject("WScript.Shell")
cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & dir & "\Launch.ps1"""
shell.Run cmd, 0, False
