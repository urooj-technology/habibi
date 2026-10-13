import os
import subprocess
from datetime import datetime

from django.conf import settings
from django.http import FileResponse, JsonResponse
from rest_framework.decorators import api_view, permission_classes

from account.permissions import HasPerm


def _backup_dir():
    path = os.path.join(settings.BASE_DIR, "backups")
    os.makedirs(path, exist_ok=True)
    return path


def _safe_backup_path(filename):
    """Resolve a backup filename under backups/ only (no path traversal)."""
    if not filename or not isinstance(filename, str):
        return None
    name = os.path.basename(filename.strip())
    if not name or name != filename.strip():
        return None
    if not (name.endswith(".sql") or name.endswith(".sqlite3") or name.endswith(".db")):
        return None
    full = os.path.abspath(os.path.join(_backup_dir(), name))
    if not full.startswith(os.path.abspath(_backup_dir()) + os.sep):
        return None
    return full


@api_view(["POST"])
@permission_classes([HasPerm("backup.manage")])
def backup_database(request):
    db_settings = settings.DATABASES["default"]
    engine = db_settings.get("ENGINE", "")
    backup_dir = _backup_dir()
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

    if "sqlite" in engine:
        db_path = db_settings["NAME"]
        if not os.path.isabs(db_path):
            db_path = os.path.join(settings.BASE_DIR, db_path)
        if not os.path.exists(db_path):
            return JsonResponse({"error": "Database file not found"}, status=500)
        backup_name = f"backup_{timestamp}.sqlite3"
        backup_file = os.path.join(backup_dir, backup_name)
        with open(db_path, "rb") as src, open(backup_file, "wb") as dst:
            dst.write(src.read())
    else:
        backup_name = f"backup_{timestamp}.sql"
        backup_file = os.path.join(backup_dir, backup_name)
        dump_command = [
            "mysqldump",
            "-u",
            db_settings["USER"],
            f"-p{db_settings['PASSWORD']}",
            "-h",
            db_settings.get("HOST") or "127.0.0.1",
            "--port",
            str(db_settings.get("PORT") or 3306),
            db_settings["NAME"],
        ]
        with open(backup_file, "w") as f:
            result = subprocess.run(
                dump_command, stdout=f, stderr=subprocess.PIPE, text=True
            )
        if result.returncode != 0:
            if os.path.exists(backup_file):
                os.remove(backup_file)
            return JsonResponse(
                {"error": result.stderr or "Backup failed"}, status=500
            )

    return JsonResponse(
        {
            "message": "Database backup successful!",
            "backup_file": backup_name,
        }
    )


@api_view(["GET"])
@permission_classes([HasPerm("backup.view")])
def list_backups(request):
    backup_dir = _backup_dir()
    backup_files = sorted(
        (
            f
            for f in os.listdir(backup_dir)
            if f.endswith(".sql") or f.endswith(".sqlite3") or f.endswith(".db")
        ),
        reverse=True,
    )
    return JsonResponse({"backup_files": backup_files})


@api_view(["GET"])
@permission_classes([HasPerm("backup.view")])
def download_backup(request):
    backup_file = request.query_params.get("backup_file") or request.GET.get(
        "backup_file"
    )
    path = _safe_backup_path(backup_file)
    if not path or not os.path.exists(path):
        return JsonResponse({"error": "Backup file does not exist"}, status=404)
    return FileResponse(
        open(path, "rb"),
        as_attachment=True,
        filename=os.path.basename(path),
    )
