# Poshak Habibi

ERP / shop app: Django API + React frontend. Django serves the built React app
at its root URL, so everything runs on one address.

## Build and run

```bash
cd frontend && npm install && npm run build   # outputs to ../static/frontend
cd .. && python manage.py migrate
python manage.py runserver
```

Open http://127.0.0.1:8000

For frontend development with hot reload, run `npm run dev` in `frontend`
(Vite on http://localhost:5173) alongside the Django server.

## Windows client install

See **[WINDOWS_SETUP.md](WINDOWS_SETUP.md)**.

```bat
scripts\windows\setup.bat
scripts\windows\create-admin.bat
scripts\windows\start-all.bat
```

**Note:** Python **3.15 is not supported** by this project's Django version. Use 3.12 or 3.13.
