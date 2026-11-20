$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd `"$root`"; .\.venv\Scripts\python.exe -m uvicorn backend.app:app --host 0.0.0.0 --port 8000" -WindowStyle Normal
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd `"$root\frontend`"; npm install; npm run dev -- --host 0.0.0.0" -WindowStyle Normal
