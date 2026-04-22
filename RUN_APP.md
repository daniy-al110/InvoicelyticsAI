# 🚀 Invoicelytics: Full Stack Run Guide

Use this guide to cleanly restart your application. This method ensures no "ghost" processes are left running and enables **Auto-Reload** so any future changes I make will apply instantly!

---

## 1. Clean Kill (Port Cleanup)
If you see "Port already in use" errors, run this in your terminal (PowerShell) to kill old processes:

```powershell
# Kill Backend (8001) and Frontend (3000)
Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
```

---

## 2. Start Backend (with Auto-Reload)
Open a terminal in the `backend` folder and run:

```bash
# Ensure you are in the backend directory
cd backend
# Run with uvicorn (Recommended method)
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001
```

---

## 3. Start Frontend
Open a **new** terminal window in the `frontend` folder and run:

```bash
# Ensure you are in the frontend directory
cd frontend
# Start the dev server
npx craco start
```

---

## 🛠️ Troubleshooting

### "Append failed: [object Object]" or "Not Found"
If you see these errors even after restarting:
1.  **Hard Refresh**: Press `Ctrl + F5` in your browser.
2.  **Verify Backend**: Visit `http://localhost:8001/api/ping` in your browser. You should see `{"status": "ok"}`.
3.  **Check Terminal**: Look for `[ROUTING] Registered /excel/analyze` in the backend console.

---

### Why use `uvicorn --reload`?
By running with the `--reload` flag, the server will **automatically watch for the code changes I make** and restart itself in less than a second. You will never have to manually restart with `Ctrl+C` again!