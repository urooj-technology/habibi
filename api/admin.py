from django.contrib import admin
from decimal import Decimal

from django.db.models import Count, DecimalField, Sum, Value
from django.db.models.functions import Coalesce
from api.models.data.customer import Customer
from api.models.data.product import Product
from api.models.data.category import Category
from api.models.data.inventory import Inventory
from api.models.data.purchase import Purchase, PurchaseItem
from api.models.data.sale import Sale, SaleItems
from api.models.data.sale_return import SaleReturn, SaleReturnItem
from api.models.data.supplier import Supplier
from api.models.data.employee import Employee
from api.models.accounting.account import AccountingAccount
from api.models.accounting.journal import JournalEntry, JournalLine
from api.models.payroll import PayrollRun, PayrollRunLine
from api.models.accounting_utils import (
    AccountingPeriodLock,
    AuditLog,
    OpeningBalanceEntry,
)
from api.services.accounting.balances import annotate_account_balance_totals, signed_balance

# Register your models here.
admin.site.register(Customer)
admin.site.register(Inventory)
admin.site.register(Category)
admin.site.register(Purchase)
admin.site.register(Product)
admin.site.register(PurchaseItem)
admin.site.register(Sale)
admin.site.register(SaleItems)
admin.site.register(SaleReturn)
admin.site.register(SaleReturnItem)
admin.site.register(Supplier)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "fathername", "contact", "salary")
    search_fields = ("name", "fathername", "contact", "address")
    ordering = ("name",)


@admin.register(AccountingAccount)
class AccountingAccountAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "name",
        "currency",
        "account_type",
        "role",
        "total_debit",
        "total_credit",
        "balance",
        "balance_afn",
        "is_active",
    )
    list_filter = ("currency", "account_type", "role", "is_active")
    search_fields = ("code", "name")
    ordering = ("code",)

    def get_queryset(self, request):
        return annotate_account_balance_totals(super().get_queryset(request))

    @admin.display(description="Debit", ordering="_debit_ccy")
    def total_debit(self, obj):
        return obj._debit_ccy

    @admin.display(description="Credit", ordering="_credit_ccy")
    def total_credit(self, obj):
        return obj._credit_ccy

    @admin.display(description="Balance", ordering="_debit_ccy")
    def balance(self, obj):
        return signed_balance(obj._debit_ccy or 0, obj._credit_ccy or 0, obj.account_type)

    @admin.display(description="Balance (AFN book)", ordering="_debit_afn")
    def balance_afn(self, obj):
        return signed_balance(obj._debit_afn or 0, obj._credit_afn or 0, obj.account_type)


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    class JournalLineInline(admin.TabularInline):
        model = JournalLine
        extra = 0
        fields = (
            "account",
            "line_memo",
            "debit_home",
            "credit_home",
            "foreign_amount",
            "foreign_currency",
            "exchange_rate",
            "customer",
            "supplier",
        )
        show_change_link = True

    list_display = (
        "id",
        "entry_date",
        "source_type",
        "source_id",
        "reference",
        "created_by",
        "line_count",
        "total_debit_home",
        "total_credit_home",
        "is_balanced",
        "created_at",
    )
    list_filter = ("source_type", "entry_date", "created_at")
    search_fields = ("reference", "memo", "created_by__email", "source_id")
    ordering = ("-entry_date", "-id")
    date_hierarchy = "entry_date"
    list_per_page = 50
    list_select_related = ("created_by",)
    inlines = [JournalLineInline]
    readonly_fields = (
        "created_at",
        "line_count",
        "total_debit_home",
        "total_credit_home",
        "is_balanced",
    )
    fields = (
        "entry_date",
        "reference",
        "memo",
        "source_type",
        "source_id",
        "created_by",
        "created_at",
        "line_count",
        "total_debit_home",
        "total_credit_home",
        "is_balanced",
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        out = DecimalField(max_digits=18, decimal_places=2)
        zero = Value(Decimal("0.00"), output_field=out)
        debit = Coalesce(Sum("lines__debit_home", output_field=out), zero, output_field=out)
        credit = Coalesce(Sum("lines__credit_home", output_field=out), zero, output_field=out)
        return qs.annotate(
            _line_count=Count("lines"),
            _total_debit=debit,
            _total_credit=credit,
        )

    @admin.display(description="Lines", ordering="_line_count")
    def line_count(self, obj):
        return obj._line_count

    @admin.display(description="Debit (AFN)", ordering="_total_debit")
    def total_debit_home(self, obj):
        return obj._total_debit

    @admin.display(description="Credit (AFN)", ordering="_total_credit")
    def total_credit_home(self, obj):
        return obj._total_credit

    @admin.display(description="Balanced", boolean=True)
    def is_balanced(self, obj):
        return (obj._total_debit or 0) == (obj._total_credit or 0)


@admin.register(JournalLine)
class JournalLineAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "entry_id",
        "entry_date",
        "source_type",
        "account",
        "line_memo",
        "debit_home",
        "credit_home",
        "foreign_amount",
        "foreign_currency",
        "exchange_rate",
        "customer",
        "supplier",
    )
    list_filter = (
        "entry__source_type",
        "entry__entry_date",
        "account__account_type",
        "account__role",
        "foreign_currency",
    )
    search_fields = (
        "entry__reference",
        "line_memo",
        "account__code",
        "account__name",
        "customer__name",
        "supplier__name",
    )
    ordering = ("-entry__entry_date", "-entry_id", "-id")
    list_select_related = ("entry", "account", "customer", "supplier")
    list_per_page = 100
    readonly_fields = ("entry_date", "source_type")
    fields = (
        "entry",
        "entry_date",
        "source_type",
        "account",
        "line_memo",
        "debit_home",
        "credit_home",
        "foreign_amount",
        "foreign_currency",
        "exchange_rate",
        "customer",
        "supplier",
    )

    @admin.display(description="Date", ordering="entry__entry_date")
    def entry_date(self, obj):
        return obj.entry.entry_date

    @admin.display(description="Source", ordering="entry__source_type")
    def source_type(self, obj):
        return obj.entry.source_type


# ── Payroll ──────────────────────────────────────────────────────────────


class PayrollRunLineInline(admin.TabularInline):
    model = PayrollRunLine
    extra = 0
    autocomplete_fields = ("employee",)
    fields = ("employee", "gross_amount", "deductions", "net_amount", "note")
    readonly_fields = ("net_amount",)


@admin.register(PayrollRun)
class PayrollRunAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "run_date",
        "period_start",
        "period_end",
        "total_amount",
        "status",
        "reference",
    )
    list_filter = ("status", "run_date")
    search_fields = ("reference", "memo", "id")
    ordering = ("-run_date", "-id")
    date_hierarchy = "run_date"
    inlines = [PayrollRunLineInline]
    readonly_fields = ("total_amount", "created_at", "updated_at")


@admin.register(PayrollRunLine)
class PayrollRunLineAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "payroll_run",
        "employee",
        "gross_amount",
        "deductions",
        "net_amount",
        "note",
    )
    list_filter = ("payroll_run__status",)
    search_fields = ("employee__name", "note", "payroll_run__reference")
    autocomplete_fields = ("employee", "payroll_run")
    readonly_fields = ("net_amount",)


# ── Accounting utilities ─────────────────────────────────────────────────


@admin.register(OpeningBalanceEntry)
class OpeningBalanceEntryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "entry_date",
        "account",
        "debit_amount",
        "credit_amount",
        "status",
        "memo",
    )
    list_filter = ("status", "entry_date")
    search_fields = ("memo", "account__code", "account__name")
    autocomplete_fields = ("account",)
    ordering = ("-entry_date", "-id")
    date_hierarchy = "entry_date"


@admin.register(AccountingPeriodLock)
class AccountingPeriodLockAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "period_start",
        "period_end",
        "is_locked",
        "locked_at",
        "note",
    )
    list_filter = ("is_locked",)
    search_fields = ("note",)
    ordering = ("-period_end",)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "created_at",
        "action",
        "module",
        "object_type",
        "object_id",
        "user",
        "summary",
    )
    list_filter = ("action", "module", "created_at")
    search_fields = ("summary", "object_type", "object_id", "user__email", "module")
    ordering = ("-created_at", "-id")
    readonly_fields = (
        "user",
        "action",
        "module",
        "object_type",
        "object_id",
        "summary",
        "created_at",
    )
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
