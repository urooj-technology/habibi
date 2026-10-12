"""
Default chart of accounts — not seeded in migrations.

Registered from ApiConfig.ready() via ``import api.signals.chart`` (no DB queries in ready).
Uses post_migrate so ``migrate`` can populate rows after schema is ready.
"""

from django.db.models.signals import post_migrate
from django.dispatch import receiver


@receiver(post_migrate, dispatch_uid="api.ensure_default_chart_post_migrate")
def ensure_default_chart_after_migrate(sender, **kwargs):
    if sender.label != "api":
        return
    from api.services.accounting.chart import ensure_default_chart

    ensure_default_chart()
