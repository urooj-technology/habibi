# Run Poshak Habibi on Windows (client PC)

Django serves everything on one address:

| What | URL |
|------|-----|
| The app (React) | http://127.0.0.1:8000 |
| API | http://127.0.0.1:8000/api/ |
| Django admin | http://127.0.0.1:8000/admin/ |

The React app is built into `static\frontend\` and served by Django. Only one
window (the Django server) needs to run. Data is stored in SQLite (`db.sqlite3`).

---

## Requirements

- **Python 3.12 or 3.13.** Do **not** use Python 3.15: Django 5.1 does not support it.
  ```powershell
  winget install --id Python.Python.3.12 -e --source winget
  ```
- **Node.js LTS** is only needed to *build* the React app. If you copy the project
  with `static\frontend\index.html` already built, the client PC does not need Node.js.

---

## First-time setup (once)

1. Copy the whole project folder to the PC (e.g. `D:\habibi`).
2. Open Command Prompt (CMD) in that folder and run:

```bat
scripts\windows\setup.bat
```

This creates/uses the virtual environment (`.venv` or `venv`), installs Python
packages, creates `.env` from `.env.example`, runs migrations, and builds the
React app if `static\frontend` is missing.

3. Create the login user:

```bat
scripts\windows\create-admin.bat
```

---

## Start the app

```bat
scripts\windows\start-all.bat
```

This starts Django and opens http://127.0.0.1:8000 in the browser. Keep the
"Poshak Habibi" window open while using the app.

### Auto-start when Windows starts

```bat
scripts\windows\enable-autostart.bat
```

After you log into Windows, the server starts minimized. Open
http://127.0.0.1:8000. To turn it off: `scripts\windows\disable-autostart.bat`.

---

## After changing React code

Rebuild, then restart the server:

```bat
scripts\windows\build-frontend.bat
```

Or manually: `cd frontend` then `npm run build`. The output goes to
`static\frontend\` (not `frontend\dist\`).

For development with hot reload you can still use `npm run dev` (Vite on
http://localhost:5173, talking to Django on port 8000).

---

## Manual commands (PowerShell)

If PowerShell blocks `Activate.ps1`, call the venv Python directly:

```powershell
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Page says "Frontend is not built" | Run `scripts\windows\build-frontend.bat` |
| `pip install` fails | Use Python 3.12/3.13, not 3.15 |
| `No module named 'whitenoise'` | Run `scripts\windows\setup.bat` again (installs new requirements) |
| `invalid literal for int()` on start | Fill in empty numbers in `.env` (e.g. `EMAIL_PORT=465`) |
| Open from another PC on the network | Run server on `0.0.0.0:8000` and add the PC's IP to `ALLOWED_HOSTS` in `.env` |
| Port 8000 in use | Close the other program, or change the port in `start-backend.bat` |

---

## Backup

Stop the app, then copy `db.sqlite3` (all shop data) and the `media\` folder.
