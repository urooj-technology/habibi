' Starts backend + frontend minimized (used by Windows Startup).
Option Explicit
Dim sh, root, backend, frontend
Set sh = CreateObject("WScript.Shell")
root = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
backend = root & "\start-backend.bat"
frontend = root & "\start-frontend.bat"

' 7 = minimized window
sh.Run """" & backend & """", 7, False
WScript.Sleep 2000
sh.Run """" & frontend & """", 7, False
