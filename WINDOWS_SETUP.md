# Run Poshak Habibi on Windows (client PC)

This app has two parts:

| Part | Technology | URL |
|------|------------|-----|
| Backend API | Django (Python) | http://127.0.0.1:8000 |
| Frontend UI | React (Vite / Node.js) | http://localhost:5173 |

Use **SQLite** on the client PC (default). No MySQL install needed.

---

## Important: Python version

**Do not use Python 3.15.0** on the client machine for this project.

| Python | Status with this project (Django 5.1) |
|--------|----------------------------------------|
| **3.12 or 3.13** | Supported — use one of these |
| 3.14 | May work; prefer 3.13 |
| **3.15** | **Not supported** — packages/Django wheels will fail |

Install **Python 3.13** (recommended):

1. Download: https://www.python.org/downloads/release/python-3139/  
   (or any 3.13.x Windows installer, 64-bit)
2. Run the installer.
3. Check **“Add python.exe to PATH”**.
4. Check **“Install pip”**.
5. Finish install, then open a **new** Command Prompt.

Also install **Node.js LTS** (includes npm): https://nodejs.org/

---

## First-time setup (once)

1. Copy the whole project folder to the Windows PC (e.g. `C:\habibi`).
2. Open Command Prompt in that folder.
3. Run:

```bat
scripts\windows\setup.bat
```

This will:

- create `.venv`
- install Python packages from `requirements.txt`
- create `.env` and `frontend\.env` from examples (if missing)
- run database migrations
- run `npm install` in `frontend`

4. Create an admin user (login for the app):

```bat
scripts\windows\create-admin.bat
```

Follow the prompts (username, email, password).

---

## Start the app every day

### Option A — Manual (each time you need it)

Double-click or run:

```bat
scripts\windows\start-all.bat
```

Or start each part separately:

```bat
scripts\windows\start-backend.bat
scripts\windows\start-frontend.bat
```

Then open a browser: **http://localhost:5173**

### Option B — Auto-start when Windows turns on

By default the app does **not** start after reboot. To enable that (once):

```bat
scripts\windows\enable-autostart.bat
```

After you log into Windows, backend + frontend start minimized. Open:

**http://localhost:5173**

To turn auto-start off:

```bat
scripts\windows\disable-autostart.bat
```

**Note:** Auto-start runs after you **log in** to Windows (user account). If nobody logs in, it will not start. Keep two small console windows minimized in the taskbar while the app is running.

---

## Config files (optional edits)

### Root `.env`

Created from `.env.example`. Important defaults:

- `DB_ENGINE=sqlite` — local file database (`db.sqlite3`)
- `CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`
- `FRONTEND_URL=http://localhost:5173`

### `frontend\.env`

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

If you change the backend host/port, update this and restart the frontend.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `pip install` fails on Python 3.15 | Uninstall 3.15 for this project; install **3.13** and re-run `setup.bat` |
| `python` not found | Reinstall Python with “Add to PATH”, open a **new** CMD |
| `npm` not found | Install Node.js LTS, open a **new** CMD |
| Frontend loads but API errors | Ensure backend window is running; check `frontend\.env` URL |
| Port 8000 or 5173 in use | Close the other program, or change ports in the start scripts / Vite config |
| Blank login / CORS errors | Confirm `.env` CORS origins include `http://localhost:5173` |

---

## Backup tip for the client

With SQLite, the main data file is:

`db.sqlite3`

Copy that file (while the app is stopped) to back up shop data. Uploaded files live in the `media\` folder.
