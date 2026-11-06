' Stop ViralClip AI Studio
' Shuts down the backend server running on port 8001 cleanly.
Set shell = CreateObject("WScript.Shell")
cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command " & _
  """Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue | " & _
  "Select-Object -Expand OwningProcess -Unique | " & _
  "ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"""
shell.Run cmd, 0, True
MsgBox "ViralClip AI Studio has been stopped.", 64, "ViralClip AI"
