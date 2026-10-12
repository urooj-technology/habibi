from django.db.models.signals import post_migrate
from django.dispatch import receiver


@receiver(post_migrate)
def sync_permissions_on_migrate(sender, app_config, **kwargs):
    """
    After account migrations, ensure Permission matrix + system roles exist.
    Also runs when other apps migrate if account tables are already ready —
    guarded by checking sender / app label.
    """
    if app_config.name != "account":
        return

    try:
        from account.permission_sync import sync_permission_catalog

        sync_permission_catalog()
    except Exception:
        # Tables may not exist yet on very early migrate steps
        pass
