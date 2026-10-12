"""Ensure Django discovers all model modules."""

from api.models.accounting import AccountingAccount, JournalEntry, JournalLine
from api.models.accounting_utils import (
    AccountingPeriodLock,
    AuditLog,
    OpeningBalanceEntry,
)
from api.models.data.notification import Notification
from api.models.data.sale_return import SaleReturn, SaleReturnItem
from api.models.payroll import PayrollRun, PayrollRunLine

__all__ = [
    "AccountingAccount",
    "JournalEntry",
    "JournalLine",
    "OpeningBalanceEntry",
    "AccountingPeriodLock",
    "AuditLog",
    "Notification",
    "PayrollRun",
    "PayrollRunLine",
    "SaleReturn",
    "SaleReturnItem",
]
