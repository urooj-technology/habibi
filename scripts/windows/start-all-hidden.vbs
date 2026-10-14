' Starts the Django server minimized (used by Windows Startup).
' Django serves both the API and the built React app on http://127.0.0.1:8000
Option Explicit
Dim sh, root
Set sh = CreateObject("WScript.Shell")
root = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' 7 = minimized window
sh.Run """" & root & "\start-backend.bat""", 7, False
