import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Phone,
  MapPin,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
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

function formatDecimal(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return "0.00";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function statusTone(value) {
  const v = String(value || "").toLowerCase();
  if (v.includes("paid") || v.includes("current"))
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (v.includes("partial") || v.includes("pending"))
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  if (v.includes("overdue") || v.includes("critical"))
    return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
}

function StatusPill({ children, value }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wide",
        statusTone(value)
      )}
    >
      {children}
    </span>
  );
}

function Metric({ label, children, emphasize = false }) {
  return (
    <div className={cn("min-w-0", emphasize && "sm:col-span-1")}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <div
        className={cn(
          "mt-1 tabular-nums tracking-tight",
          emphasize
            ? "font-display text-2xl font-bold text-foreground sm:text-3xl"
            : "text-base font-semibold text-foreground"
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Customer / supplier statement ledger — clean statement layout.
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
  setExportAnchorEl,
  exportOpen,
  downloadExport,
  handleRefresh,
  ledgerVariant,
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("ledger");

  const labelTxn = (type) =>
    t(TXN_LABEL_KEYS[type] || `ledger.txn.${type}`, type);
  const labelStatus = (value) =>
    t(STATUS_LABEL_KEYS[value] || `ledger.status.${value}`, value || "—");

  const ledgerSection = useMemo(() => {
    if (!ledgerData) return null;
    if (Array.isArray(ledgerData.sections) && ledgerData.sections.length > 0) {
      if (ledgerData.sections.length === 1) return ledgerData.sections[0];
      const lines = ledgerData.sections.flatMap((s) => s.lines || []);
      return {
        opening_balance:
          ledgerData.opening_balance ?? ledgerData.sections[0]?.opening_balance,
        period_debit:
          ledgerData.period_debit ??
          ledgerData.sections.reduce(
            (s, sec) => s + Number(sec.period_debit || 0),
            0
          ),
        period_credit:
          ledgerData.period_credit ??
          ledgerData.sections.reduce(
            (s, sec) => s + Number(sec.period_credit || 0),
            0
          ),
        closing_balance:
          ledgerData.closing_balance ??
          ledgerData.sections[ledgerData.sections.length - 1]?.closing_balance,
        summary: ledgerData.summary || ledgerData.sections[0]?.summary || {},
        pagination:
          ledgerData.pagination || ledgerData.sections[0]?.pagination || {},
        lines,
      };
    }
    return {
      opening_balance: ledgerData.opening_balance,
      period_debit: ledgerData.period_debit,
      period_credit: ledgerData.period_credit,
      closing_balance: ledgerData.closing_balance,
      summary: ledgerData.summary || {},
      pagination: ledgerData.pagination || {},
      lines: ledgerData.lines || [],
    };
  }, [ledgerData]);

  const profile = ledgerData?.profile || {};
  const summary = ledgerSection?.summary || ledgerData?.summary || {};
  const availableTypes = ledgerData?.available_transaction_types || [];
  const availableStatuses = ledgerData?.available_statuses || [];
  const pagination = ledgerSection?.pagination || ledgerData?.pagination || {};
  const histories =
    ledgerVariant === "customer"
      ? ledgerData?.invoice_history || []
      : ledgerData?.purchase_history || [];
  const payments = ledgerData?.payment_history || [];
  const lines = ledgerSection?.lines || [];

  const displayName = contactName || profile.name || `#${contactId}`;
  const phone = profile.contact || profile.phone || "";
  const address = profile.address || "";
  const currentBalance =
    profile.current_balance ?? ledgerSection?.closing_balance;

  const secondaryMetrics =
    ledgerVariant === "customer"
      ? [
          [t("ledger.totalSales", "Total sales"), summary.total_sales],
          [
            t("ledger.totalPaymentsReceived", "Payments received"),
            summary.total_payments_received,
          ],
          [
            t("ledger.outstandingBalance", "Outstanding"),
            summary.outstanding_balance,
          ],
          [t("ledger.advanceBalance", "Advance"), summary.advance_balance],
        ]
      : [
          [t("ledger.totalPurchases", "Total purchases"), summary.total_purchases],
          [t("ledger.totalPayments", "Payments"), summary.total_payments],
          [
            t("ledger.outstandingBalance", "Outstanding"),
            summary.outstanding_balance,
          ],
          [t("ledger.advancePaid", "Advance paid"), summary.advance_paid],
        ];

  const currentPage = Math.max((pagination.page || 1) - 1, 0);
  const totalCount = pagination.total || 0;
  const totalPages = pageSize ? Math.max(Math.ceil(totalCount / pageSize), 1) : 1;
  const hasResult = Boolean(ledgerData);
  const advancedActive = Boolean(
    transactionType || status || amountMin || amountMax
  );

  const handlePrint = () => {
    if (!ledgerData || !ledgerSection) return;
    printContactLedger({
      title: t(pageTitleKey, pageTitleDefault),
      contactLabel:
        ledgerVariant === "customer"
          ? t("customer.name", "Customer")
          : t("supplier.name", "Supplier"),
      contactName: displayName,
      contactId,
      profile,
      from,
      to,
      sections: [ledgerSection],
      labelTxn,
      labelStatus,
    });
  };

  const clearAdvanced = () => {
    setPage(0);
    setTransactionType("");
    setStatus("");
    setAmountMin("");
    setAmountMax("");
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 pb-10 [@media_print]:[&_.no-print]:hidden">
      {/* Top bar */}
      <header className="no-print flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("common.back", "Back")}
          </button>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {t(pageTitleKey, pageTitleDefault)}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{displayName}</p>
          {(phone || address) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3 w-3" />
                  {phone}
                </span>
              ) : null}
              {address ? (
                <span className="inline-flex max-w-md items-center gap-1.5 truncate">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {address}
                </span>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DropdownMenu
            open={exportOpen}
            onOpenChange={(open) => !open && setExportAnchorEl(null)}
          >
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={!from || !to || loading}
                onClick={(e) => setExportAnchorEl(e.currentTarget)}
              >
                <Download className="h-3.5 w-3.5" />
                {t("common.export", "Export")}
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setExportAnchorEl(null);
                  void downloadExport("excel");
                }}
              >
                {t("common.exportExcel", "Excel")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setExportAnchorEl(null);
                  void downloadExport("pdf");
                }}
              >
                {t("common.exportPdf", "PDF")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setExportAnchorEl(null);
                  void downloadExport("csv");
                }}
              >
                {t("common.exportCsv", "CSV")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            variant="outline"
            disabled={!hasResult}
            onClick={handlePrint}
          >
            <Printer className="h-3.5 w-3.5" />
            {t("common.print", "Print")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!from || !to || loading}
            onClick={handleRefresh}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            {t("common.refresh", "Refresh")}
          </Button>
        </div>
      </header>

      {error ? (
        <InlineAlert
          severity="error"
          message={error}
          title={t("common.error")}
        />
      ) : null}

      {/* Statement balance */}
      <section className="border-y border-border py-5">
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))]">
          <Metric
            label={t("accounting.currentBalance", "Current balance")}
            emphasize
          >
            <MoneyAmount
              value={currentBalance}
              side={MONEY_SIDE.BALANCE}
              showZero
            />
          </Metric>
          <Metric label={t("accounting.openingBalance", "Opening")}>
            <MoneyAmount
              value={ledgerSection?.opening_balance}
              side={MONEY_SIDE.BALANCE}
              showZero
            />
          </Metric>
          <Metric label={t("accounting.totalDebit", "Debit")}>
            <span className={moneySideHeaderClass(MONEY_SIDE.DEBIT)}>
              <MoneyAmount
                value={ledgerSection?.period_debit}
                side={MONEY_SIDE.DEBIT}
                showZero
              />
            </span>
          </Metric>
          <Metric label={t("accounting.totalCredit", "Credit")}>
            <span className={moneySideHeaderClass(MONEY_SIDE.CREDIT)}>
              <MoneyAmount
                value={ledgerSection?.period_credit}
                side={MONEY_SIDE.CREDIT}
                showZero
              />
            </span>
          </Metric>
        </div>

        {hasResult ? (
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-border/70 pt-4 text-xs text-muted-foreground">
            {secondaryMetrics
              .filter(([, v]) => v != null && v !== "")
              .map(([label, value]) => (
                <span key={label} className="inline-flex items-baseline gap-1.5">
                  <span>{label}</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatDecimal(value)}
                  </span>
                </span>
              ))}
            <span className="ms-auto tabular-nums">
              {from && to
                ? `${from} — ${to}`
                : t("common.period", "Period")}
            </span>
          </div>
        ) : null}
      </section>

      {/* Period + search */}
      <section className="no-print space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="grid flex-1 grid-cols-2 gap-2 sm:max-w-xs">
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("common.from", "From")}
              </span>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("common.to", "To")}
              </span>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9"
              />
            </label>
          </div>

          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 ps-8"
              placeholder={t(
                "ledger.searchPlaceholder",
                "Search voucher, reference, description…"
              )}
              value={search}
              onChange={(e) => {
                setPage(0);
                setSearch(e.target.value);
              }}
            />
          </div>

          <Button
            type="button"
            size="sm"
            variant={filtersOpen || advancedActive ? "default" : "outline"}
            className="h-9 shrink-0"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t("common.filters", "Filters")}
            {advancedActive ? (
              <span className="ms-1 rounded-full bg-primary-foreground/20 px-1.5 text-[10px]">
                !
              </span>
            ) : null}
          </Button>
        </div>

        {filtersOpen ? (
          <div className="grid gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("ledger.transactionType", "Type")}
              </span>
              <Select
                value={transactionType || "ALL"}
                onValueChange={(v) => {
                  setPage(0);
                  setTransactionType(v === "ALL" ? "" : v);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
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
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("common.status", "Status")}
              </span>
              <Select
                value={status || "ALL"}
                onValueChange={(v) => {
                  setPage(0);
                  setStatus(v === "ALL" ? "" : v);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
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
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("ledger.amountMin", "Min amount")}
              </span>
              <Input
                type="number"
                className="h-9"
                value={amountMin}
                onChange={(e) => {
                  setPage(0);
                  setAmountMin(e.target.value);
                }}
              />
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("ledger.amountMax", "Max amount")}
              </span>
              <Input
                type="number"
                className="h-9"
                value={amountMax}
                onChange={(e) => {
                  setPage(0);
                  setAmountMax(e.target.value);
                }}
              />
            </label>

            {advancedActive ? (
              <div className="flex items-end sm:col-span-2 lg:col-span-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-muted-foreground"
                  onClick={clearAdvanced}
                >
                  <Filter className="h-3.5 w-3.5" />
                  {t("common.clearAll", "Clear filters")}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Main content tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="min-w-0"
      >
        <TabsList className="no-print h-9 w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="ledger" className="text-xs sm:text-sm">
            {t("ledger.ledgerEntries", "Ledger")}
            {lines.length ? (
              <span className="ms-1.5 text-[10px] opacity-60">{lines.length}</span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="docs" className="text-xs sm:text-sm">
            {ledgerVariant === "customer"
              ? t("customer.invoiceHistory", "Invoices")
              : t("supplier.purchaseHistory", "Purchases")}
            {histories.length ? (
              <span className="ms-1.5 text-[10px] opacity-60">
                {histories.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="payments" className="text-xs sm:text-sm">
            {t("ledger.paymentHistory", "Payments")}
            {payments.length ? (
              <span className="ms-1.5 text-[10px] opacity-60">
                {payments.length}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="mt-3 focus-visible:ring-0">
          <div
            className={cn(
              "overflow-hidden rounded-xl border border-border bg-card",
              loading && ledgerData && "opacity-70"
            )}
          >
            {loading && !ledgerData ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                {t("common.loading", "Loading")}…
              </div>
            ) : (
              <>
                <div className="max-h-[min(62vh,640px)] overflow-auto">
                  <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
                      <tr className="border-b border-border text-left">
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {t("journal.entryDate", "Date")}
                        </th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {t("journal.lineMemo", "Particulars")}
                        </th>
                        <th
                          className={cn(
                            "px-4 py-2.5 text-end text-[10px] font-bold uppercase tracking-wider",
                            moneySideHeaderClass(MONEY_SIDE.DEBIT)
                          )}
                        >
                          {t("journal.debit", "Debit")}
                        </th>
                        <th
                          className={cn(
                            "px-4 py-2.5 text-end text-[10px] font-bold uppercase tracking-wider",
                            moneySideHeaderClass(MONEY_SIDE.CREDIT)
                          )}
                        >
                          {t("journal.credit", "Credit")}
                        </th>
                        <th className="px-4 py-2.5 text-end text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {t("accounting.runningBalance", "Balance")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.length > 0 ? (
                        lines.map((line, idx) => {
                          const voucher =
                            line.voucher_no || line.reference || "";
                          const refNo = line.reference_no || "";
                          const desc =
                            line.description || line.line_memo || "";
                          const txn = labelTxn(
                            line.transaction_type || line.source_type
                          );
                          return (
                            <tr
                              key={line.id ?? idx}
                              className="border-b border-border/60 last:border-0 hover:bg-muted/30"
                            >
                              <td className="whitespace-nowrap px-4 py-3 align-top tabular-nums text-muted-foreground">
                                {line.date || line.entry_date || "—"}
                              </td>
                              <td className="max-w-[340px] px-4 py-3 align-top">
                                <div className="font-medium text-foreground">
                                  {desc || txn}
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                                  <span>{txn}</span>
                                  {voucher ? (
                                    <span className="tabular-nums">
                                      · {voucher}
                                    </span>
                                  ) : null}
                                  {refNo && refNo !== voucher ? (
                                    <span className="tabular-nums">
                                      · {refNo}
                                    </span>
                                  ) : null}
                                  {line.status ? (
                                    <StatusPill value={line.status}>
                                      {labelStatus(line.status)}
                                    </StatusPill>
                                  ) : null}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-end align-top">
                                <MoneyAmount
                                  value={line.debit || line.debit_home}
                                  side={MONEY_SIDE.DEBIT}
                                />
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-end align-top">
                                <MoneyAmount
                                  value={line.credit || line.credit_home}
                                  side={MONEY_SIDE.CREDIT}
                                />
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-end align-top font-medium">
                                <MoneyAmount
                                  value={line.running_balance}
                                  side={MONEY_SIDE.BALANCE}
                                  showZero
                                />
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-16 text-center text-sm text-muted-foreground"
                          >
                            {t(
                              "ledger.periodEmptyTitle",
                              "No activity in this period"
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {ledgerData ? (
                  <div className="no-print flex flex-col items-center justify-between gap-2 border-t border-border px-4 py-2.5 sm:flex-row">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{t("common.rowsPerPage", "Rows")}</span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(v) => {
                          setPage(0);
                          setPageSize(Number(v));
                        }}
                      >
                        <SelectTrigger className="h-8 w-[72px]">
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
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        {totalCount === 0
                          ? "0"
                          : `${currentPage * pageSize + 1}–${Math.min(
                              (currentPage + 1) * pageSize,
                              totalCount
                            )}`}{" "}
                        {t("common.of", "of")} {totalCount}
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
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="docs" className="mt-3 focus-visible:ring-0">
          <HistoryTable
            empty={t("common.noData", "No data")}
            columns={[
              {
                key: "no",
                label:
                  ledgerVariant === "customer"
                    ? t("ledger.invoiceNumber", "Invoice")
                    : t("ledger.purchaseNo", "Purchase"),
                render: (row) => row.invoice_number || row.purchase_no,
              },
              {
                key: "products",
                label: t("ledger.products", "Products"),
                render: (row) => row.products || "—",
              },
              {
                key: "qty",
                label: t("ledger.qty", "Qty"),
                render: (row) => row.qty ?? "—",
              },
              {
                key: "total",
                label: t("common.total", "Total"),
                align: "end",
                render: (row) => (
                  <span className="font-semibold tabular-nums">
                    {formatDecimal(row.total)}
                  </span>
                ),
              },
              {
                key: "status",
                label: t("common.status", "Status"),
                render: (row) => (
                  <StatusPill value={row.status}>
                    {labelStatus(row.status)}
                  </StatusPill>
                ),
              },
              {
                key: "date",
                label: t("common.date", "Date"),
                render: (row) => row.invoice_date || row.purchase_date || "—",
              },
            ]}
            rows={histories}
            rowKey={(row) => row.invoice_number || row.purchase_no}
          />
        </TabsContent>

        <TabsContent value="payments" className="mt-3 focus-visible:ring-0">
          <HistoryTable
            empty={t("common.noData", "No data")}
            columns={[
              {
                key: "date",
                label: t("ledger.paymentDate", "Date"),
                render: (row) => row.payment_date || "—",
              },
              {
                key: "ref",
                label: t("journal.reference", "Reference"),
                render: (row) => row.reference || "—",
              },
              {
                key: "amount",
                label: t("reports.amount", "Amount"),
                align: "end",
                render: (row) => (
                  <span className="font-semibold tabular-nums">
                    {formatDecimal(row.amount)}
                  </span>
                ),
              },
              {
                key: "by",
                label: t("ledger.createdBy", "By"),
                render: (row) => row.created_by || "—",
              },
              {
                key: "desc",
                label: t("journal.lineMemo", "Note"),
                render: (row) => row.description || "—",
              },
            ]}
            rows={payments}
            rowKey={(row, idx) => `${row.reference}-${idx}`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HistoryTable({ columns, rows, rowKey, empty }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="max-h-[min(62vh,640px)] overflow-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
            <tr className="border-b border-border text-left">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
                    col.align === "end" && "text-end"
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows?.length ? (
              rows.map((row, idx) => (
                <tr
                  key={rowKey(row, idx)}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/30"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 align-middle",
                        col.align === "end" && "text-end"
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-16 text-center text-sm text-muted-foreground"
                >
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
