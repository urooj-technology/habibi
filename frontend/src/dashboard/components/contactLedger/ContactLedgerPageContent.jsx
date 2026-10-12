import React, { useMemo } from "react";
import { ArrowLeft, BookUser, ChevronDown, ChevronLeft, ChevronRight, Download, Printer, RefreshCw } from "lucide-react";

import { InlineAlert } from "../../../components/AlertMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ReportLoadingState } from "../../pages/accounting/reports/reportUi";
import {
  PosBody,
  PosDocBar,
  PosField,
  PosHeader,
  PosItems,
  PosMain,
  PosShell,
  PosSummary,
  PosTotalRow,
} from "@/components/pos/PosShell";
import { printContactLedger } from "./printContactLedger";
import MoneyAmount from "../../../components/accounting/MoneyAmount";
import { MONEY_SIDE, moneySideHeaderClass } from "../../../utils/moneySide";

const TXN_LABEL_KEYS = {
  SALE_INVOICE: "ledger.txn.saleInvoice",
  PAYMENT_RECEIVED: "ledger.txn.paymentReceived",
  CUSTOMER_RETURN: "ledger.txn.customerReturn",
  PURCHASE_INVOICE: "ledger.txn.purchaseInvoice",
  PAYMENT_MADE: "ledger.txn.paymentMade",
  PURCHASE_RETURN: "ledger.txn.purchaseReturn",
  ADVANCE_PAYMENT: "ledger.txn.advancePayment",
  DISCOUNT: "ledger.txn.discount",
  DEBIT_NOTE: "ledger.txn.debitNote",
  CREDIT_NOTE: "ledger.txn.creditNote",
  ADJUSTMENT: "ledger.txn.adjustment",
  CURRENCY_CONVERSION: "ledger.txn.currencyConversion",
  OPENING_BALANCE: "ledger.txn.openingBalance",
};

const STATUS_LABEL_KEYS = {
  Paid: "ledger.status.paid",
  Pending: "ledger.status.pending",
  Partial: "ledger.status.partial",
  Overdue: "ledger.status.overdue",
  Current: "ledger.status.current",
  Critical: "ledger.status.critical",
};

const headCellClass =
  "whitespace-nowrap border-b border-border bg-muted/60 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground";

const bodyCellClass = "px-3 py-2 text-sm";

/**
 * Shared ERP-style layout for customer & supplier ledger pages.
 */
export default function ContactLedgerPageContent({
  t,
  navigate,
  pageTitleKey,
  pageTitleDefault,
  contactName,
  contactId,
  from,
  setFrom,
  to,
  setTo,
  loading,
  error,
  ledgerData,
  backPath,
  exportAnchorEl,
  setExportAnchorEl,
  exportOpen,
  downloadExport,
  handleRefresh,
  ledgerVariant,
  currencyFilter,
  onCurrencyFilterChange,
  search,
  setSearch,
  transactionType,
  setTransactionType,
  status,
  setStatus,
  amountMin,
  setAmountMin,
  amountMax,
  setAmountMax,
  setPage,
  pageSize,
  setPageSize,
}) {
  const formatDecimal = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return "0.00";
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const labelTxn = (type) => t(TXN_LABEL_KEYS[type] || `ledger.txn.${type}`, type);
  const labelStatus = (value) => t(STATUS_LABEL_KEYS[value] || `ledger.status.${value}`, value || "—");

  /** Per-currency sections when All is selected; otherwise one section. */
  const currencySections = useMemo(() => {
    if (!ledgerData) return [];
    if (Array.isArray(ledgerData.sections) && ledgerData.sections.length > 0) {
      return ledgerData.sections;
    }
    return [
      {
        currency: ledgerData.currency && ledgerData.currency !== "MIXED"
          ? ledgerData.currency
          : currencyFilter || "AFN",
        opening_balance: ledgerData.opening_balance,
        period_debit: ledgerData.period_debit,
        period_credit: ledgerData.period_credit,
        closing_balance: ledgerData.closing_balance,
        current_balance: ledgerData.closing_balance,
        summary: ledgerData.summary || {},
        pagination: ledgerData.pagination || {},
        lines: ledgerData.lines || [],
      },
    ];
  }, [ledgerData, currencyFilter]);

  const isMultiCurrency = currencySections.length > 1;
  const primarySection = currencySections[0] || null;
  const displayCurrency = isMultiCurrency
    ? null
    : primarySection?.currency || currencyFilter || "—";
  const amountSuffix =
    displayCurrency && displayCurrency !== "—" ? ` ${displayCurrency}` : "";

  const profile = ledgerData?.profile || {};
  const summary = (!isMultiCurrency && primarySection?.summary) || ledgerData?.summary || {};
  const availableTypes = ledgerData?.available_transaction_types || [];
  const availableStatuses = ledgerData?.available_statuses || [];
  const pagination = primarySection?.pagination || ledgerData?.pagination || {};
  const histories =
    ledgerVariant === "customer" ? ledgerData?.invoice_history || [] : ledgerData?.purchase_history || [];
  const payments = ledgerData?.payment_history || [];

  const balanceItems = !isMultiCurrency && primarySection
    ? [
        {
          label: t("accounting.openingBalance", "Opening balance"),
          value: `${formatDecimal(primarySection.opening_balance)}${amountSuffix}`,
          tone: "balance",
        },
        {
          label: t("accounting.totalDebit", "Total debit"),
          value: `${formatDecimal(primarySection.period_debit)}${amountSuffix}`,
          tone: "debit",
        },
        {
          label: t("accounting.totalCredit", "Total credit"),
          value: `${formatDecimal(primarySection.period_credit)}${amountSuffix}`,
          tone: "credit",
        },
        {
          label: t("accounting.closingBalance", "Closing balance"),
          value: `${formatDecimal(primarySection.closing_balance)}${amountSuffix}`,
          tone: "balance",
        },
      ]
    : [];

  const summaryItems =
    ledgerVariant === "customer"
      ? [
          [t("ledger.totalSales", "Total Sales"), summary.total_sales],
          [t("ledger.totalPaymentsReceived", "Total Payments Received"), summary.total_payments_received],
          [t("ledger.outstandingBalance", "Outstanding Balance"), summary.outstanding_balance],
          [t("ledger.advanceBalance", "Advance Balance"), summary.advance_balance],
          [t("ledger.totalReturns", "Total Returns"), summary.total_returns],
        ]
      : [
          [t("ledger.totalPurchases", "Total Purchases"), summary.total_purchases],
          [t("ledger.totalPayments", "Total Payments"), summary.total_payments],
          [t("ledger.outstandingBalance", "Outstanding Balance"), summary.outstanding_balance],
          [t("ledger.advancePaid", "Advance Paid"), summary.advance_paid],
        ];

  const currentPage = Math.max((pagination.page || 1) - 1, 0);
  const totalCount = pagination.total || 0;
  const totalPages = pageSize ? Math.max(Math.ceil(totalCount / pageSize), 1) : 1;
  const hasResult = Boolean(ledgerData);

  const handlePrint = () => {
    if (!ledgerData || !currencySections.length) return;
    printContactLedger({
      title: t(pageTitleKey, pageTitleDefault),
      contactLabel:
        ledgerVariant === "customer"
          ? t("customer.name", "Customer")
          : t("supplier.name", "Supplier"),
      contactName: contactName || profile.name || "",
      contactId,
      profile,
      from,
      to,
      sections: currencySections,
      labelTxn,
      labelStatus,
    });
  };

  const statusClass = (value) => {
    const v = String(value || "").toLowerCase();
    if (v.includes("paid") || v.includes("current")) return "bg-emerald-500/15 text-emerald-700";
    if (v.includes("partial") || v.includes("pending")) return "bg-amber-500/15 text-amber-700";
    if (v.includes("overdue") || v.includes("critical")) return "bg-destructive/15 text-destructive";
    return "bg-muted text-foreground";
  };

  const renderLedgerTable = (section) => {
    const lines = section.lines || [];
    const ccy = section.currency || "";
    return (
      <div className={cn("max-h-[560px] overflow-auto [@media_print]:max-h-none", loading && ledgerData ? "opacity-70" : "")}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={headCellClass}>{t("journal.entryDate", "Date")}</th>
              <th className={headCellClass}>{t("ledger.voucherNo", "Voucher No")}</th>
              <th className={headCellClass}>{t("ledger.referenceNo", "Reference No")}</th>
              <th className={headCellClass}>{t("ledger.transactionType", "Transaction Type")}</th>
              <th className={headCellClass}>{t("journal.lineMemo", "Description")}</th>
              <th className={cn(headCellClass, "text-right", moneySideHeaderClass(MONEY_SIDE.DEBIT))}>
                {t("journal.debit", "Debit")}
                {ccy ? ` (${ccy})` : ""}
              </th>
              <th className={cn(headCellClass, "text-right", moneySideHeaderClass(MONEY_SIDE.CREDIT))}>
                {t("journal.credit", "Credit")}
                {ccy ? ` (${ccy})` : ""}
              </th>
              <th className={cn(headCellClass, "text-right")}>
                {t("accounting.runningBalance", "Balance")}
                {ccy ? ` (${ccy})` : ""}
              </th>
              <th className={headCellClass}>{t("ledger.createdBy", "Created By")}</th>
              <th className={headCellClass}>{t("common.status", "Status")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && !ledgerData ? (
              <tr>
                <td colSpan={10} className="py-6 text-center text-sm text-muted-foreground">
                  {t("common.loading", "Loading")}…
                </td>
              </tr>
            ) : lines.length > 0 ? (
              lines.map((line) => (
                <tr key={`${ccy}-${line.id}`} className="border-t border-border hover:bg-muted/40">
                  <td className={cn(bodyCellClass, "whitespace-nowrap")}>{line.date || line.entry_date}</td>
                  <td className={bodyCellClass}>{line.voucher_no || line.reference || "—"}</td>
                  <td className={bodyCellClass}>{line.reference_no || line.reference || "—"}</td>
                  <td className={bodyCellClass}>{labelTxn(line.transaction_type || line.source_type)}</td>
                  <td className={cn(bodyCellClass, "max-w-[260px]")}>
                    <span className="block truncate">{line.description || line.line_memo || "—"}</span>
                  </td>
                  <td className={cn(bodyCellClass, "text-right")}>
                    <MoneyAmount value={line.debit || line.debit_home} side={MONEY_SIDE.DEBIT} />
                  </td>
                  <td className={cn(bodyCellClass, "text-right")}>
                    <MoneyAmount value={line.credit || line.credit_home} side={MONEY_SIDE.CREDIT} />
                  </td>
                  <td className={cn(bodyCellClass, "text-right")}>
                    <MoneyAmount value={line.running_balance} side={MONEY_SIDE.BALANCE} showZero />
                  </td>
                  <td className={bodyCellClass}>{line.created_by || "—"}</td>
                  <td className={bodyCellClass}>
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold",
                        statusClass(line.status)
                      )}
                    >
                      {line.status ? labelStatus(line.status) : t("sales.status.pending")}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="py-6 text-center text-sm text-muted-foreground">
                  {t("ledger.periodEmptyTitle", "No activity in this period")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <PosShell className="w-full pb-8 [@media_print]:[&_.no-print]:hidden">
      <div className="no-print">
        <PosHeader
          icon={<BookUser className="h-4 w-4" />}
          title={t(pageTitleKey, pageTitleDefault)}
          subtitle={`${contactName || `#${contactId}`} · ${from && to ? `${from} — ${to}` : "…"}`}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => navigate(backPath)}>
                <ArrowLeft className="h-4 w-4" />
                {t("common.back", "Back")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={!from || !to || loading}>
                <RefreshCw className="h-4 w-4" />
                {t("common.refresh", "Refresh")}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={!hasResult}>
                <Printer className="h-4 w-4" />
                {t("common.print", "Print")}
              </Button>
            </>
          }
        />
      </div>

      {error ? (
        <InlineAlert severity="error" message={error} title={t("common.error")} sx={{ marginBottom: "1rem" }} />
      ) : null}

      <PosBody>
        <PosMain>
          <PosDocBar
            title={t("common.filters", "Filters")}
            className="no-print"
            footer={
              <div className="flex flex-wrap justify-end gap-2">
                <DropdownMenu open={exportOpen} onOpenChange={(open) => !open && setExportAnchorEl(null)}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!from || !to || loading}
                      onClick={(e) => setExportAnchorEl(e.currentTarget)}
                    >
                      <Download className="h-4 w-4" />
                      {t("common.export", "Export")}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setExportAnchorEl(null);
                        void downloadExport("excel");
                      }}
                    >
                      {t("common.exportExcel", "Export Excel")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setExportAnchorEl(null);
                        void downloadExport("pdf");
                      }}
                    >
                      {t("common.exportPdf", "Export PDF")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setExportAnchorEl(null);
                        void downloadExport("csv");
                      }}
                    >
                      {t("common.exportCsv", "Export CSV")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" variant="outline" disabled={!hasResult} onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                  {t("common.print", "Print")}
                </Button>
                <Button size="sm" disabled={!from || !to || loading} onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4" />
                  {t("common.refresh", "Refresh")}
                </Button>
              </div>
            }
          >
            <PosField label={t("accounting.filterByCurrency", "Currency")}>
              <Select value={currencyFilter || "ALL"} onValueChange={(v) => onCurrencyFilterChange(v === "ALL" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("accounting.filterByCurrency", "Currency")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("accounting.currencyAll", "All (AFN & USD)")}</SelectItem>
                  <SelectItem value="AFN">AFN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </PosField>
            <PosField label={t("common.from", "From")}>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </PosField>
            <PosField label={t("common.to", "To")}>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </PosField>
            <PosField label={t("common.search", "Search")}>
              <Input
                placeholder={t("common.search", "Search")}
                value={search}
                onChange={(e) => {
                  setPage(0);
                  setSearch(e.target.value);
                }}
              />
            </PosField>
            <PosField label={t("ledger.transactionType", "Transaction Type")}>
              <Select
                value={transactionType || "ALL"}
                onValueChange={(v) => {
                  setPage(0);
                  setTransactionType(v === "ALL" ? "" : v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("ledger.transactionType", "Transaction Type")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("common.all", "All")}</SelectItem>
                  {availableTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {labelTxn(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PosField>
            <PosField label={t("common.status", "Status")}>
              <Select
                value={status || "ALL"}
                onValueChange={(v) => {
                  setPage(0);
                  setStatus(v === "ALL" ? "" : v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("common.status", "Status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("common.all", "All")}</SelectItem>
                  {availableStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {labelStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PosField>
            <PosField label={t("ledger.amountMin", "Amount Min")}>
              <Input
                type="number"
                placeholder={t("ledger.amountMin", "Amount Min")}
                value={amountMin}
                onChange={(e) => {
                  setPage(0);
                  setAmountMin(e.target.value);
                }}
              />
            </PosField>
            <PosField label={t("ledger.amountMax", "Amount Max")}>
              <Input
                type="number"
                placeholder={t("ledger.amountMax", "Amount Max")}
                value={amountMax}
                onChange={(e) => {
                  setPage(0);
                  setAmountMax(e.target.value);
                }}
              />
            </PosField>
          </PosDocBar>

          {loading && !ledgerData ? <ReportLoadingState /> : null}

          {ledgerData || loading ? (
            isMultiCurrency ? (
              <div className={cn("space-y-4", loading && ledgerData ? "opacity-70" : "")}>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "ledger.multiCurrencyHint",
                    "AFN and USD are shown in separate ledgers so balances are not mixed."
                  )}
                </p>
                {currencySections.map((section) => {
                  const ccy = section.currency || "";
                  const lineCount = section.lines?.length || 0;
                  return (
                    <PosItems
                      key={ccy}
                      title={`${t("ledger.ledgerEntries", "Ledger entries")} — ${ccy}`}
                      count={lineCount}
                    >
                      <div className="grid grid-cols-2 gap-2 border-b border-border px-4 py-2 text-xs sm:grid-cols-4">
                        <div>
                          <p className="text-muted-foreground">{t("accounting.openingBalance", "Opening balance")}</p>
                          <p className="font-semibold tabular-nums">
                            {formatDecimal(section.opening_balance)} {ccy}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("accounting.totalDebit", "Total debit")}</p>
                          <p>
                            <MoneyAmount
                              value={section.period_debit}
                              side={MONEY_SIDE.DEBIT}
                              currency={ccy}
                              showZero
                            />
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("accounting.totalCredit", "Total credit")}</p>
                          <p>
                            <MoneyAmount
                              value={section.period_credit}
                              side={MONEY_SIDE.CREDIT}
                              currency={ccy}
                              showZero
                            />
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("accounting.closingBalance", "Closing balance")}</p>
                          <p className="font-semibold tabular-nums">
                            {formatDecimal(section.closing_balance)} {ccy}
                          </p>
                        </div>
                      </div>
                      {renderLedgerTable(section)}
                    </PosItems>
                  );
                })}
              </div>
            ) : (
              <PosItems
                title={t("ledger.ledgerEntries", "Ledger entries")}
                count={primarySection?.lines?.length || 0}
              >
                {renderLedgerTable(
                  primarySection || {
                    currency: displayCurrency,
                    lines: [],
                  }
                )}

                {ledgerData ? (
                  <div className="no-print flex flex-col items-center justify-between gap-2 border-t border-border px-4 py-3 sm:flex-row">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{t("common.rowsPerPage", "Rows per page")}:</span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(v) => {
                          setPage(0);
                          setPageSize(Number(v));
                        }}
                      >
                        <SelectTrigger className="h-8 w-[80px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 25, 50, 100].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>
                        {currentPage * pageSize + 1}
                        {"–"}
                        {Math.min((currentPage + 1) * pageSize, totalCount)} {t("common.of", "of")}{" "}
                        {totalCount}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={currentPage <= 0}
                          onClick={() => setPage(currentPage - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={currentPage + 1 >= totalPages}
                          onClick={() => setPage(currentPage + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </PosItems>
            )
          ) : null}

          {ledgerData ? (
            <div className="no-print mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-full rounded-xl border border-border p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {ledgerVariant === "customer"
                ? t("customer.invoiceHistory", "Invoice history")
                : t("supplier.purchaseHistory", "Purchase history")}
            </p>
            <div className="mt-2 max-h-[280px] overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={headCellClass}>
                      {ledgerVariant === "customer"
                        ? t("ledger.invoiceNumber", "Invoice Number")
                        : t("ledger.purchaseNo", "Purchase No")}
                    </th>
                    <th className={headCellClass}>{t("ledger.products", "Products")}</th>
                    <th className={headCellClass}>{t("ledger.qty", "Qty")}</th>
                    <th className={cn(headCellClass, "text-right")}>{t("common.total", "Total")}</th>
                    {isMultiCurrency ? (
                      <th className={headCellClass}>{t("common.currency", "Currency")}</th>
                    ) : null}
                    <th className={headCellClass}>{t("common.status", "Status")}</th>
                    <th className={headCellClass}>{t("common.date", "Date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {histories.length ? (
                    histories.map((row) => (
                      <tr key={row.invoice_number || row.purchase_no} className="border-t border-border hover:bg-muted/40">
                        <td className={bodyCellClass}>{row.invoice_number || row.purchase_no}</td>
                        <td className={bodyCellClass}>{row.products}</td>
                        <td className={bodyCellClass}>{row.qty}</td>
                        <td className={cn(bodyCellClass, "text-right font-semibold tabular-nums")}>
                          {formatDecimal(row.total)}
                          {row.currency ? ` ${row.currency}` : ""}
                        </td>
                        {isMultiCurrency ? (
                          <td className={bodyCellClass}>{row.currency || "—"}</td>
                        ) : null}
                        <td className={bodyCellClass}>
                          <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-semibold", statusClass(row.status))}>
                            {labelStatus(row.status)}
                          </span>
                        </td>
                        <td className={bodyCellClass}>{row.invoice_date || row.purchase_date}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isMultiCurrency ? 7 : 6} className="py-3 text-center text-sm text-muted-foreground">
                        {t("common.noData", "No data")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="h-full rounded-xl border border-border p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("ledger.paymentHistory", "Payment history")}
            </p>
            <div className="mt-2 max-h-[280px] overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={headCellClass}>{t("ledger.paymentDate", "Payment Date")}</th>
                    <th className={headCellClass}>{t("journal.reference", "Reference")}</th>
                    <th className={cn(headCellClass, "text-right")}>{t("reports.amount", "Amount")}</th>
                    {isMultiCurrency ? (
                      <th className={headCellClass}>{t("common.currency", "Currency")}</th>
                    ) : null}
                    <th className={headCellClass}>{t("ledger.createdBy", "Created By")}</th>
                    <th className={headCellClass}>{t("journal.lineMemo", "Description")}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length ? (
                    payments.map((row, idx) => (
                      <tr key={`${row.reference}-${idx}`} className="border-t border-border hover:bg-muted/40">
                        <td className={bodyCellClass}>{row.payment_date}</td>
                        <td className={bodyCellClass}>{row.reference || "—"}</td>
                        <td className={cn(bodyCellClass, "text-right font-semibold tabular-nums")}>
                          {formatDecimal(row.amount)}
                          {row.currency ? ` ${row.currency}` : ""}
                        </td>
                        {isMultiCurrency ? (
                          <td className={bodyCellClass}>{row.currency || "—"}</td>
                        ) : null}
                        <td className={bodyCellClass}>{row.created_by || "—"}</td>
                        <td className={bodyCellClass}>{row.description || "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isMultiCurrency ? 6 : 5} className="py-3 text-center text-sm text-muted-foreground">
                        {t("common.noData", "No data")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
            </div>
          ) : null}
        </PosMain>

        <PosSummary title={t("accounting.summary", "Summary")} className="no-print">
          <PosField label={ledgerVariant === "customer" ? t("customer.name", "Customer") : t("supplier.name", "Supplier")}>
            <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2 text-xs font-medium">
              {contactName || `#${contactId}`}
            </div>
          </PosField>
          <PosField label={t("common.period", "Period")}>
            <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2 text-xs font-medium">
              {from && to ? `${from} — ${to}` : "…"}
            </div>
          </PosField>
          {isMultiCurrency ? (
            currencySections.map((section) => {
              const ccy = section.currency || "";
              const sectionSummary = section.summary || {};
              const sectionSummaryItems =
                ledgerVariant === "customer"
                  ? [
                      [t("ledger.totalSales", "Total Sales"), sectionSummary.total_sales],
                      [
                        t("ledger.totalPaymentsReceived", "Total Payments Received"),
                        sectionSummary.total_payments_received,
                      ],
                      [t("ledger.outstandingBalance", "Outstanding Balance"), sectionSummary.outstanding_balance],
                      [t("ledger.advanceBalance", "Advance Balance"), sectionSummary.advance_balance],
                      [t("ledger.totalReturns", "Total Returns"), sectionSummary.total_returns],
                    ]
                  : [
                      [t("ledger.totalPurchases", "Total Purchases"), sectionSummary.total_purchases],
                      [t("ledger.totalPayments", "Total Payments"), sectionSummary.total_payments],
                      [t("ledger.outstandingBalance", "Outstanding Balance"), sectionSummary.outstanding_balance],
                      [t("ledger.advancePaid", "Advance Paid"), sectionSummary.advance_paid],
                    ];
              return (
                <div key={ccy} className="space-y-1 border-t border-border pt-2 first:border-t-0 first:pt-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {ccy}
                  </p>
                  <PosTotalRow
                    label={t("accounting.openingBalance", "Opening balance")}
                    value={`${formatDecimal(section.opening_balance)} ${ccy}`}
                  />
                  <PosTotalRow
                    label={t("accounting.closingBalance", "Closing balance")}
                    value={`${formatDecimal(section.closing_balance)} ${ccy}`}
                  />
                  {sectionSummaryItems
                    .filter(([, value]) => value != null && value !== "")
                    .map(([label, value]) => (
                      <PosTotalRow
                        key={`${ccy}-${label}`}
                        label={label}
                        value={`${formatDecimal(value)} ${ccy}`}
                      />
                    ))}
                  <PosTotalRow
                    label={t("accounting.currentBalance", "Current Balance")}
                    value={`${formatDecimal(section.current_balance ?? section.closing_balance)} ${ccy}`}
                    emphasize
                  />
                </div>
              );
            })
          ) : (
            <>
              {balanceItems.map((item) => (
                <PosTotalRow
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  tone={item.tone}
                />
              ))}
              {summaryItems
                .filter(([, value]) => value != null && value !== "")
                .map(([label, value]) => (
                  <PosTotalRow key={label} label={label} value={`${formatDecimal(value)}${amountSuffix}`} />
                ))}
              <PosTotalRow
                label={t("accounting.currentBalance", "Current Balance")}
                value={`${formatDecimal(profile.current_balance)}${amountSuffix}`}
                emphasize
              />
              <div className="border-t border-border pt-2">
                <p className="text-[10px] text-muted-foreground">
                  {t("common.rowsPerPage", "Rows per page")}: {pageSize}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {currentPage * pageSize + 1}
                  {"–"}
                  {Math.min((currentPage + 1) * pageSize, totalCount)} {t("common.of", "of")} {totalCount}
                </p>
              </div>
            </>
          )}
        </PosSummary>
      </PosBody>
    </PosShell>
  );
}
