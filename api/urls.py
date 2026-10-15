from django.urls import path, include
from rest_framework import routers

from api.views.data.category import CategoryViewSet
from api.views.data.inventory import InventoryViewSet
from api.views.data.notification import NotificationViewSet
from api.views.data.product import ProductViewSet
from api.views.data.purchase import PurchaseViewSet
from api.views.data.sale import SaleViewSet
from api.views.data.sale_return import SaleReturnViewSet
from api.views.data.supplier import SupplierViewSet
from api.views.data.customer import CustomerViewSet
from api.views.data.employee import EmployeeViewSet
from api.views.accounting.account import AccountingAccountViewSet
from api.views.accounting.journal import JournalEntryViewSet
from api.views.accounting.customer_ledger import (
    CustomerLedgerAPIView,
    CustomerLedgerExportCsvAPIView,
    CustomerLedgerExportExcelAPIView,
    CustomerLedgerExportPdfAPIView,
)
from api.views.accounting.supplier_ledger import (
    SupplierLedgerAPIView,
    SupplierLedgerExportCsvAPIView,
    SupplierLedgerExportExcelAPIView,
    SupplierLedgerExportPdfAPIView,
)
from api.views.accounting.reports import (
    AccountingTrialBalanceAPIView,
    AccountingTrialBalanceExportExcelAPIView,
    AccountingTrialBalanceExportPdfAPIView,
)
from api.views.accounting.operational_reports import (
    AgingDetailReportAPIView,
    BalanceSheetReportAPIView,
    BankBookReportAPIView,
    CashFlowReportAPIView,
    CollectionReportAPIView,
    EmployeeLedgerReportAPIView,
    GeneralJournalReportAPIView,
    OutstandingPayablesReportAPIView,
    OutstandingReceivablesReportAPIView,
    PayrollRegisterReportAPIView,
    ProfitAndLossReportAPIView,
    ProfitByCategoryReportAPIView,
    PurchasesByVendorReportAPIView,
    SalesByCustomerReportAPIView,
    SalesReturnsReportAPIView,
    StockLedgerReportAPIView,
    StockValuationReportAPIView,
)
from api.views.payroll import PayrollRunViewSet
from api.views.accounting_utils import OpeningBalanceEntryViewSet
from api.views.dashboard import DailyOpsDashboardAPIView

router = routers.DefaultRouter()

# Core documents (invoices & bills)
router.register(r"sales", SaleViewSet)
router.register(r"sales-returns", SaleReturnViewSet, basename="sales-return")
router.register(r"purchases", PurchaseViewSet)

router.register(r"suppliers", SupplierViewSet)
router.register(r"inventory", InventoryViewSet)
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"employees", EmployeeViewSet)
router.register(r"products", ProductViewSet)
router.register(r"category", CategoryViewSet)
router.register(r"customers", CustomerViewSet)

router.register(r"accounting/accounts", AccountingAccountViewSet, basename="accounting-account")
router.register(
    r"accounting/journal-entries", JournalEntryViewSet, basename="accounting-journal-entry"
)

router.register(r"payroll/runs", PayrollRunViewSet, basename="payroll-run")

router.register(r"accounting/opening-balances", OpeningBalanceEntryViewSet, basename="opening-balance")


urlpatterns = [
    path("", include(router.urls)),
    path(
        "dashboard/daily/",
        DailyOpsDashboardAPIView.as_view(),
        name="dashboard-daily",
    ),
    path(
        "customers/<int:customer_id>/ledger/",
        CustomerLedgerAPIView.as_view(),
        name="customer-ledger",
    ),
    path(
        "customers/<int:customer_id>/ledger/export/excel/",
        CustomerLedgerExportExcelAPIView.as_view(),
        name="customer-ledger-export-excel",
    ),
    path(
        "customers/<int:customer_id>/ledger/export/pdf/",
        CustomerLedgerExportPdfAPIView.as_view(),
        name="customer-ledger-export-pdf",
    ),
    path(
        "customers/<int:customer_id>/ledger/export/csv/",
        CustomerLedgerExportCsvAPIView.as_view(),
        name="customer-ledger-export-csv",
    ),
    path(
        "suppliers/<int:supplier_id>/ledger/",
        SupplierLedgerAPIView.as_view(),
        name="supplier-ledger",
    ),
    path(
        "suppliers/<int:supplier_id>/ledger/export/excel/",
        SupplierLedgerExportExcelAPIView.as_view(),
        name="supplier-ledger-export-excel",
    ),
    path(
        "suppliers/<int:supplier_id>/ledger/export/pdf/",
        SupplierLedgerExportPdfAPIView.as_view(),
        name="supplier-ledger-export-pdf",
    ),
    path(
        "suppliers/<int:supplier_id>/ledger/export/csv/",
        SupplierLedgerExportCsvAPIView.as_view(),
        name="supplier-ledger-export-csv",
    ),
    path(
        "accounting/trial-balance/",
        AccountingTrialBalanceAPIView.as_view(),
        name="accounting-trial-balance",
    ),
    path(
        "accounting/trial-balance/export/excel/",
        AccountingTrialBalanceExportExcelAPIView.as_view(),
        name="accounting-trial-balance-export-excel",
    ),
    path(
        "accounting/trial-balance/export/pdf/",
        AccountingTrialBalanceExportPdfAPIView.as_view(),
        name="accounting-trial-balance-export-pdf",
    ),
    path(
        "accounting/reports/general-journal/",
        GeneralJournalReportAPIView.as_view(),
        name="accounting-general-journal-report",
    ),
    path(
        "accounting/reports/sales-by-customer/",
        SalesByCustomerReportAPIView.as_view(),
        name="accounting-sales-by-customer",
    ),
    path(
        "accounting/reports/purchases-by-vendor/",
        PurchasesByVendorReportAPIView.as_view(),
        name="accounting-purchases-by-vendor",
    ),
    path(
        "accounting/reports/collections/",
        CollectionReportAPIView.as_view(),
        name="accounting-collection-report",
    ),
    path(
        "accounting/reports/sales-returns/",
        SalesReturnsReportAPIView.as_view(),
        name="accounting-sales-returns-report",
    ),
    path(
        "accounting/reports/aging-detail/",
        AgingDetailReportAPIView.as_view(),
        name="accounting-aging-detail",
    ),
    path(
        "accounting/reports/stock-ledger/",
        StockLedgerReportAPIView.as_view(),
        name="accounting-stock-ledger",
    ),
    path(
        "accounting/reports/stock-valuation/",
        StockValuationReportAPIView.as_view(),
        name="accounting-stock-valuation",
    ),
    path(
        "accounting/reports/payroll-register/",
        PayrollRegisterReportAPIView.as_view(),
        name="accounting-payroll-register",
    ),
    path(
        "accounting/reports/employees/<int:employee_id>/ledger/",
        EmployeeLedgerReportAPIView.as_view(),
        name="accounting-employee-ledger",
    ),
    path(
        "accounting/reports/bank-book/<int:account_id>/",
        BankBookReportAPIView.as_view(),
        name="accounting-bank-book",
    ),
    path(
        "accounting/reports/cash-flow/",
        CashFlowReportAPIView.as_view(),
        name="accounting-cash-flow",
    ),
    path(
        "accounting/reports/outstanding-payables/",
        OutstandingPayablesReportAPIView.as_view(),
        name="accounting-outstanding-payables",
    ),
    path(
        "accounting/reports/outstanding-receivables/",
        OutstandingReceivablesReportAPIView.as_view(),
        name="accounting-outstanding-receivables",
    ),
    path(
        "accounting/reports/balance-sheet/",
        BalanceSheetReportAPIView.as_view(),
        name="accounting-balance-sheet",
    ),
    path(
        "accounting/reports/profit-and-loss/",
        ProfitAndLossReportAPIView.as_view(),
        name="accounting-profit-and-loss",
    ),
    path(
        "accounting/reports/profit-by-category/",
        ProfitByCategoryReportAPIView.as_view(),
        name="accounting-profit-by-category",
    ),
]
