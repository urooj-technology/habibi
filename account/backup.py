from rest_framework.decorators import api_view, permission_classes
from django.http import JsonResponse
import subprocess
import os
from django.conf import settings
from django.utils import timezone
from datetime import datetime
from django.core.files.storage import default_storage
from account.permissions import HasPerm


@api_view(["POST"])
@permission_classes([HasPerm("backup.manage")])
def backup_database(request):
    # MySQL credentials from settings.py
    db_name = settings.DATABASES["default"]["NAME"]
    db_user = settings.DATABASES["default"]["USER"]
    db_password = settings.DATABASES["default"]["PASSWORD"]
    db_host = settings.DATABASES["default"]["HOST"]
    db_port = settings.DATABASES["default"]["PORT"]

    # Directory where the backup file will be stored
    backup_dir = os.path.join(settings.BASE_DIR, "backups")
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)

    # Backup filename with timestamp
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_file = os.path.join(backup_dir, f"backup_{timestamp}.sql")

    # mysqldump command
    dump_command = [
        "mysqldump",
        "-u",
        db_user,
        f"-p{db_password}",  # password should be given directly after -p flag
        "-h",
        db_host,
        "--port",
        str(db_port),
        db_name,
    ]

    with open(backup_file, "w") as f:
        subprocess.run(dump_command, stdout=f, stderr=subprocess.PIPE)

    return JsonResponse(
        {"message": "Database backup successful!", "backup_file": backup_file}
    )


@api_view(["POST"])
@permission_classes([HasPerm("backup.manage")])
def restore_database(request):
    # Get the backup file path from request data
    backup_file = request.data.get("backup_file")

    if not backup_file:
        return JsonResponse({"error": "No backup file provided"}, status=400)

    # Get the full path for the backup file
    backup_dir = os.path.join(settings.BASE_DIR, "backups")
    backup_file_path = os.path.join(
        backup_dir, backup_file
    )  # Full path to the backup file

    # Check if the file exists
    if not os.path.exists(backup_file_path):
        return JsonResponse({"error": "Backup file does not exist"}, status=400)

    # MySQL credentials from settings.py
    db_name = settings.DATABASES["default"]["NAME"]
    db_user = settings.DATABASES["default"]["USER"]
    db_password = settings.DATABASES["default"]["PASSWORD"]
    db_host = settings.DATABASES["default"]["HOST"]
    db_port = settings.DATABASES["default"]["PORT"]

    # Restore the database using the mysql command
    restore_command = [
        "mysql",
        "-u",
        db_user,
        f"-p{db_password}",  # password should be given directly after -p flag
        "-h",
        db_host,
        "--port",
        str(db_port),
        db_name,
    ]

    # Restore the database using the selected backup file
    with open(backup_file_path, "rb") as f:
        subprocess.run(restore_command, stdin=f, stderr=subprocess.PIPE)

    return JsonResponse({"message": "Database restoration successful!"})


@api_view(["GET"])
@permission_classes([HasPerm("backup.view")])
def list_backups(request):
    # Directory where the backup files are stored
    backup_dir = os.path.join(settings.BASE_DIR, "backups")

    if not os.path.exists(backup_dir):
        return JsonResponse({"message": "No backups found"}, status=404)

    # List all backup files in the backup directory
    backup_files = [f for f in os.listdir(backup_dir) if f.endswith(".sql")]

    if not backup_files:
        return JsonResponse({"message": "No backup files found"}, status=404)

    return JsonResponse({"backup_files": backup_files})


@api_view(["DELETE"])
@permission_classes([HasPerm("backup.manage")])
def delete_backup(request):
    # Get the backup file path from request data
    backup_file = request.data.get("backup_file")

    if not backup_file:
        return JsonResponse({"error": "No backup file provided"}, status=400)

    # Get the full path for the backup file
    backup_dir = os.path.join(settings.BASE_DIR, "backups")
    backup_file_path = os.path.join(
        backup_dir, backup_file
    )  # Full path to the backup file

    # Check if the file exists
    if not os.path.exists(backup_file_path):
        return JsonResponse({"error": "Backup file does not exist"}, status=400)

    # Delete the backup file
    try:
        os.remove(backup_file_path)
        return JsonResponse({"message": "Backup file deleted successfully!"})
    except Exception as e:
        return JsonResponse(
            {"error": f"Failed to delete backup file: {str(e)}"}, status=500
        )
