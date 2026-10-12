"""Accounting period lock checks."""

from __future__ import annotations

import datetime

from api.models.accounting_utils import AccountingPeriodLock


def assert_period_open(entry_date: datetime.date) -> None:
    """Raise ValueError if entry_date falls in a locked period."""
    if AccountingPeriodLock.objects.filter(
        is_locked=True,
        period_start__lte=entry_date,
        period_end__gte=entry_date,
    ).exists():
        raise ValueError(f"Accounting period is locked for date {entry_date.isoformat()}.")
