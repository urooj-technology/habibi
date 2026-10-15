export const REPORT_IDS = {
  BALANCE_SHEET: "balance-sheet",
  PROFIT_AND_LOSS: "profit-and-loss",
  GENERAL_JOURNAL: "general-journal",
  SALES_BY_CUSTOMER: "sales-by-customer",
  SALES_RETURNS: "sales-returns",
  PURCHASES_BY_VENDOR: "purchases-by-vendor",
  COLLECTIONS: "collections",
  OUTSTANDING_RECEIVABLES: "outstanding-receivables",
  AGING_DETAIL: "aging-detail",
  STOCK_LEDGER: "stock-ledger",
  STOCK_VALUATION: "stock-valuation",
  PAYROLL_REGISTER: "payroll-register",
  EMPLOYEE_LEDGER: "employee-ledger",
  BANK_BOOK: "bank-book",
  CASH_FLOW: "cash-flow",
  OUTSTANDING_PAYABLES: "outstanding-payables",
  PROFIT_BY_CATEGORY: "profit-by-category",
};

export const REPORT_CATEGORIES = {
  FINANCE: "finance",
  SALES: "sales",
  PURCHASES: "purchases",
  INVENTORY: "inventory",
  PAYROLL: "payroll",
};

const defaultFrom = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const defaultTo = () => new Date().toISOString().split("T")[0];

export const defaultReportFilters = {
  from: defaultFrom(),
  to: defaultTo(),
  as_of: defaultTo(),
  kind: "customer",
  employee_id: "",
  account_id: "",
};

export const operationalReports = [
  {
    id: REPORT_IDS.BALANCE_SHEET,
    category: REPORT_CATEGORIES.FINANCE,
    i18nKey: "operationalReports.balanceSheet",
    endpoint: "accounting/reports/balance-sheet/",
    filters: ["asOf"],
    displayType: "balanceSheet",
  },
  {
    id: REPORT_IDS.PROFIT_AND_LOSS,
    category: REPORT_CATEGORIES.FINANCE,
    i18nKey: "operationalReports.profitAndLoss",
    endpoint: "accounting/reports/profit-and-loss/",
    filters: ["dateRange"],
    displayType: "profitAndLoss",
  },
  {
    id: REPORT_IDS.GENERAL_JOURNAL,
    category: REPORT_CATEGORIES.FINANCE,
    i18nKey: "operationalReports.generalJournal",
    endpoint: "accounting/reports/general-journal/",
    filters: ["dateRange"],
    dataKey: "lines",
    columns: [
      { id: "date", label: "operationalReports.date" },
      { id: "entry_id", label: "common.id" },
      { id: "reference", label: "operationalReports.reference" },
      { id: "source_type", label: "operationalReports.sourceType" },
      { id: "account_code", label: "accounting.accountCode" },
      { id: "account_name", label: "accounting.accountName" },
      { id: "memo", label: "common.notes" },
      { id: "debit", label: "accounting.totalDebit", align: "right", money: true },
      { id: "credit", label: "accounting.totalCredit", align: "right", money: true },
    ],
  },
  {
    id: REPORT_IDS.SALES_BY_CUSTOMER,
    category: REPORT_CATEGORIES.SALES,
    i18nKey: "operationalReports.salesByCustomer",
    endpoint: "accounting/reports/sales-by-customer/",
    filters: ["dateRange"],
    dataKey: "rows",
    columns: [
      { id: "name", label: "sales.customer" },
      { id: "gross", label: "operationalReports.grossSales", align: "right", money: true },
      { id: "returns", label: "operationalReports.salesReturns", align: "right", money: true },
      { id: "total", label: "operationalReports.netSales", align: "right", money: true },
    ],
  },
  {
    id: REPORT_IDS.PROFIT_BY_CATEGORY,
    category: REPORT_CATEGORIES.SALES,
    i18nKey: "operationalReports.profitByCategory",
    endpoint: "accounting/reports/profit-by-category/",
    filters: ["dateRange"],
    dataKey: "rows",
    summaryType: "categoryProfit",
    columns: [
      { id: "category", label: "product.category" },
      { id: "qty_sold", label: "operationalReports.qtySold", align: "right" },
      { id: "qty_returned", label: "operationalReports.qtyReturned", align: "right" },
      { id: "sales", label: "operationalReports.grossSales", align: "right", money: true },
      { id: "returns", label: "operationalReports.salesReturns", align: "right", money: true },
      { id: "net_sales", label: "operationalReports.netSales", align: "right", money: true },
      { id: "cogs", label: "operationalReports.cogs", align: "right", money: true },
      { id: "gross_profit", label: "operationalReports.grossProfit", align: "right", money: true },
      { id: "margin_pct", label: "operationalReports.marginPct", align: "right", suffix: "%" },
    ],
  },
  {
    id: REPORT_IDS.SALES_RETURNS,
    category: REPORT_CATEGORIES.SALES,
    i18nKey: "operationalReports.salesReturnsRegister",
    endpoint: "accounting/reports/sales-returns/",
    filters: ["dateRange"],
    dataKey: "rows",
    totalField: "total",
    columns: [
      { id: "date", label: "operationalReports.date" },
      { id: "reference", label: "operationalReports.reference" },
      { id: "sale_id", label: "saleReturn.sale" },
      { id: "customer", label: "sales.customer" },
      { id: "total", label: "saleReturn.totalAmount", align: "right", money: true },
      { id: "refunded", label: "saleReturn.refundedAmount", align: "right", money: true },
      { id: "credited", label: "saleReturn.creditedAmount", align: "right", money: true },
    ],
  },
  {
    id: REPORT_IDS.PURCHASES_BY_VENDOR,
    category: REPORT_CATEGORIES.PURCHASES,
    i18nKey: "operationalReports.purchasesByVendor",
    endpoint: "accounting/reports/purchases-by-vendor/",
    filters: ["dateRange"],
    dataKey: "rows",
    columns: [
      { id: "name", label: "purchases.supplier" },
      { id: "total", label: "common.total", align: "right", money: true },
    ],
  },
  {
    id: REPORT_IDS.COLLECTIONS,
    category: REPORT_CATEGORIES.SALES,
    i18nKey: "operationalReports.collections",
    endpoint: "accounting/reports/collections/",
    filters: ["dateRange"],
    dataKey: "rows",
    totalField: "total",
    columns: [
      { id: "date", label: "operationalReports.date" },
      { id: "customer", label: "sales.customer" },
      { id: "reference", label: "operationalReports.reference" },
      { id: "type", label: "operationalReports.type" },
      { id: "amount", label: "common.amount", align: "right", money: true },
    ],
  },
  {
    id: REPORT_IDS.OUTSTANDING_RECEIVABLES,
    category: REPORT_CATEGORIES.SALES,
    i18nKey: "operationalReports.outstandingReceivables",
    endpoint: "accounting/reports/outstanding-receivables/",
    filters: ["asOf"],
    dataKey: "rows",
    totalField: "total",
    columns: [
      { id: "name", label: "sales.customer" },
      { id: "balance", label: "accounting.currentBalance", align: "right", money: true },
    ],
  },
  {
    id: REPORT_IDS.AGING_DETAIL,
    category: REPORT_CATEGORIES.SALES,
    i18nKey: "operationalReports.agingDetail",
    endpoint: "accounting/reports/aging-detail/",
    filters: ["asOf", "agingKind"],
    dataKey: "rows",
    summaryType: "agingTotals",
    columns: [
      { id: "name", label: "operationalReports.contact" },
      { id: "balance", label: "accounting.currentBalance", align: "right", money: true },
      { id: "age_days", label: "operationalReports.ageDays", align: "right" },
      { id: "bucket", label: "operationalReports.bucket", translateBucket: true },
    ],
  },
  {
    id: REPORT_IDS.STOCK_LEDGER,
    category: REPORT_CATEGORIES.INVENTORY,
    i18nKey: "operationalReports.stockLedger",
    endpoint: "accounting/reports/stock-ledger/",
    filters: [],
    dataKey: "rows",
    columns: [
      { id: "product", label: "sales.product" },
      { id: "barcode", label: "product.barcode" },
      { id: "category", label: "product.category" },
      { id: "quantity", label: "common.quantity", align: "right" },
      { id: "buy_price", label: "inventory.buyPrice", align: "right", money: true },
      { id: "sell_price", label: "pricing.sellPrice", align: "right", money: true },
      { id: "min_quantity", label: "inventory.minQuantity", align: "right" },
    ],
  },
  {
    id: REPORT_IDS.STOCK_VALUATION,
    category: REPORT_CATEGORIES.INVENTORY,
    i18nKey: "operationalReports.stockValuation",
    endpoint: "accounting/reports/stock-valuation/",
    filters: [],
    dataKey: "rows",
    totalField: "total",
    columns: [
      { id: "product", label: "sales.product" },
      { id: "barcode", label: "product.barcode" },
      { id: "category", label: "product.category" },
      { id: "quantity", label: "common.quantity", align: "right" },
      { id: "buy_price", label: "inventory.buyPrice", align: "right", money: true },
      { id: "sell_price", label: "pricing.sellPrice", align: "right", money: true },
      { id: "value", label: "operationalReports.stockValue", align: "right", money: true },
    ],
  },
  {
    id: REPORT_IDS.PAYROLL_REGISTER,
    category: REPORT_CATEGORIES.PAYROLL,
    i18nKey: "operationalReports.payrollRegister",
    endpoint: "accounting/reports/payroll-register/",
    filters: ["dateRange"],
    dataKey: "rows",
    columns: [
      { id: "run_date", label: "operationalReports.date" },
      { id: "employee", label: "hr.employees" },
      { id: "gross", label: "operationalReports.gross", align: "right", money: true },
      { id: "deductions", label: "operationalReports.deductions", align: "right", money: true },
      { id: "net", label: "operationalReports.net", align: "right", money: true },
    ],
  },
  {
    id: REPORT_IDS.EMPLOYEE_LEDGER,
    category: REPORT_CATEGORIES.PAYROLL,
    i18nKey: "operationalReports.employeeLedger",
    endpoint: "accounting/reports/employees/:employeeId/ledger/",
    filters: ["dateRange", "employee"],
    dataKey: "lines",
    pathParam: "employeeId",
    pathFilter: "employee_id",
    columns: [
      { id: "date", label: "operationalReports.date" },
      { id: "type", label: "operationalReports.type" },
      { id: "reference", label: "operationalReports.reference" },
      { id: "amount", label: "common.amount", align: "right", money: true },
    ],
  },
  {
    id: REPORT_IDS.BANK_BOOK,
    category: REPORT_CATEGORIES.FINANCE,
    i18nKey: "operationalReports.bankBook",
    endpoint: "accounting/reports/bank-book/:accountId/",
    filters: ["dateRange", "bankAccount"],
    dataKey: "lines",
    pathParam: "accountId",
    pathFilter: "account_id",
    summaryType: "bankBook",
    columns: [
      { id: "date", label: "operationalReports.date" },
      { id: "reference", label: "operationalReports.reference" },
      { id: "memo", label: "common.notes" },
      { id: "debit", label: "accounting.totalDebit", align: "right", money: true },
      { id: "credit", label: "accounting.totalCredit", align: "right", money: true },
      { id: "balance", label: "accounting.runningBalance", align: "right", money: true },
    ],
  },
  {
    id: REPORT_IDS.CASH_FLOW,
    category: REPORT_CATEGORIES.FINANCE,
    i18nKey: "operationalReports.cashFlow",
    endpoint: "accounting/reports/cash-flow/",
    filters: ["dateRange"],
    displayType: "summary",
    summaryFields: [
      { id: "net_profit", label: "operationalReports.netProfit" },
      { id: "cash_opening", label: "operationalReports.cashOpening" },
      { id: "cash_closing", label: "operationalReports.cashClosing" },
      { id: "net_cash_change", label: "operationalReports.netCashChange" },
    ],
  },
  {
    id: REPORT_IDS.OUTSTANDING_PAYABLES,
    category: REPORT_CATEGORIES.PURCHASES,
    i18nKey: "operationalReports.outstandingPayables",
    endpoint: "accounting/reports/outstanding-payables/",
    filters: ["asOf"],
    dataKey: "rows",
    totalField: "total",
    columns: [
      { id: "name", label: "purchases.supplier" },
      { id: "balance", label: "accounting.currentBalance", align: "right", money: true },
    ],
  },
];

export const getReportConfig = (reportId) =>
  operationalReports.find((r) => r.id === reportId);

export const buildReportUrl = (config, filters) => {
  let path = config.endpoint;
  if (config.pathParam && config.pathFilter) {
    const val = filters[config.pathFilter];
    if (!val) return null;
    path = path.replace(`:${config.pathParam}`, val);
  }
  const params = new URLSearchParams();
  if (config.filters.includes("dateRange")) {
    if (!filters.from || !filters.to) return null;
    params.set("from", filters.from);
    params.set("to", filters.to);
  }
  if (config.filters.includes("asOf")) {
    params.set("as_of", filters.as_of || defaultTo());
  }
  if (config.filters.includes("agingKind")) {
    params.set("kind", filters.kind || "customer");
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};
