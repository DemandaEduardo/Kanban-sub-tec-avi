Set objShell = CreateObject("WScript.Shell")
objShell.CurrentDirectory = "C:\Users\eduardo.00284\IdeaProjects\fluxo-textil-kanban"
objShell.Run "cmd /c node serve.js 8081 >> server.log 2>&1", 0, False
