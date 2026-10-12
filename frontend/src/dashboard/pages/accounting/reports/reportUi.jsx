import React from "react";
import { useTranslation } from "react-i18next";
import { Play, Printer, RotateCcw, Download, Search } from "lucide-react";
import { formatCurrency } from "../../../../utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  inferMoneySide,
  moneySideHeaderClass,
  moneySideTextClass,
  MONEY_SIDE,
} from "../../../../utils/moneySide";

export const formatReportMoney = (value, currency = "") => {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  const code = (currency || "").trim();
  if (!code || code === "MIXED") {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return formatCurrency(n, code);
};

export const applyPeriodPreset = (preset) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = fmt(now);

  switch (preset) {
    case "thisMonth":
      return { from: `${y}-${pad(m + 1)}-01`, to: today };
    case "lastMonth": {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return { from: fmt(start), to: fmt(end) };
    }
    case "thisQuarter": {
      const qStart = Math.floor(m / 3) * 3;
      return { from: fmt(new Date(y, qStart, 1)), to: today };
    }
    case "ytd":
      return { from: `${y}-01-01`, to: today };
    default:
      return {};
  }
};

export function exportRowsToCsv(filename, columns, rows, formatCell) {
  const escape = (v) => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => escape(c.label)).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const raw = formatCell ? formatCell(row, col) : row[col.id];
          return escape(raw);
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Shared field shell — full width inside responsive filter grids. */
export const reportFilterFieldClass = "flex min-w-0 w-full flex-col gap-1.5";

export const reportFilterControlClass = "w-full bg-background h-10";

/** Responsive grid for report filter controls. */
export function ReportFilterGrid({ children, className }) {
  return (
    <div
      className={cn(
        "grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>*]:min-w-0",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Span two columns on sm+ (employee / bank account pickers). */
export function ReportFilterWide({ children, className }) {
  return (
    <div className={cn(reportFilterFieldClass, "sm:col-span-2 lg:col-span-2", className)}>
      {children}
    </div>
  );
}

/** MUI Autocomplete wrapper — keeps full width on small screens. */
export function ReportAutocompleteField({ label, required = false, children }) {
  return (
    <ReportFilterWide>
      {label ? (
        <Label className="text-xs font-semibold">
          {label}
          {required ? " *" : ""}
        </Label>
      ) : null}
      <div className="w-full min-w-0 [&_.MuiAutocomplete-root]:w-full [&_.MuiFormControl-root]:w-full">
        {children}
      </div>
    </ReportFilterWide>
  );
}

/** Compact ERP parameter strip: responsive filter grid + action bar. */
export function ReportToolbar({
  children,
  onRun,
  onReset,
  onPrint,
  onExportCsv,
  canRun = true,
  loading = false,
  hasResult = false,
  runLabel,
  resetLabel,
  printLabel,
  exportLabel,
  extraActions,
}) {
  const { t } = useTranslation();

  const actionBtnClass = "h-10 w-full sm:w-auto sm:h-9";

  return (
    <Card className="no-print mb-4 rounded-md border border-border bg-muted/40 px-3 py-3 shadow-none sm:px-4 sm:py-4">
      <div className="flex min-w-0 flex-col gap-4">
        <ReportFilterGrid>{children}</ReportFilterGrid>

        <div className="grid grid-cols-2 gap-2 border-t border-border/70 pt-3 sm:flex sm:flex-wrap sm:justify-end sm:border-0 sm:pt-0">
          {onRun ? (
            <Button
              size="sm"
              onClick={onRun}
              disabled={!canRun || loading}
              className={cn(actionBtnClass, "col-span-2 font-bold sm:order-last")}
            >
              {loading ? (
                <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {runLabel || t("operationalReports.runReport")}
            </Button>
          ) : null}
          {onReset ? (
            <Button size="sm" variant="outline" onClick={onReset} className={actionBtnClass}>
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="truncate">{resetLabel || t("operationalReports.resetFilters")}</span>
            </Button>
          ) : null}
          {onExportCsv ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onExportCsv}
              disabled={!hasResult}
              className={actionBtnClass}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="truncate">{exportLabel || t("common.exportCsv")}</span>
            </Button>
          ) : null}
          {onPrint ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onPrint}
              disabled={!hasResult}
              className={actionBtnClass}
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="truncate">{printLabel || t("common.print")}</span>
            </Button>
          ) : null}
          {extraActions}
        </div>
      </div>
    </Card>
  );
}

export function ReportPeriodSelect({ value, onChange, presets = ["thisMonth", "lastMonth", "thisQuarter", "ytd"], className }) {
  const { t } = useTranslation();
  return (
    <Select value={value || "__custom__"} onValueChange={(v) => onChange(v === "__custom__" ? "" : v)}>
      <SelectTrigger className={cn(reportFilterControlClass, className)}>
        <SelectValue placeholder={t("operationalReports.periodPreset", "Period")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__custom__">
          <em>{t("operationalReports.customPeriod", "Custom")}</em>
        </SelectItem>
        {presets.map((p) => (
          <SelectItem key={p} value={p}>
            {t(`operationalReports.presets.${p}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ReportPeriodField({ value, onChange, className }) {
  const { t } = useTranslation();
  return (
    <div className={cn(reportFilterFieldClass, className)}>
      <Label className="text-xs font-semibold">
        {t("operationalReports.periodPreset", "Period")}
      </Label>
      <ReportPeriodSelect value={value} onChange={onChange} />
    </div>
  );
}

export function ReportDateField({ name, label, className, ...props }) {
  return (
    <div className={reportFilterFieldClass}>
      {label ? (
        <Label htmlFor={name} className="text-xs font-semibold">
          {label}
        </Label>
      ) : null}
      <Input
        id={name}
        name={name}
        type="date"
        className={cn(reportFilterControlClass, className)}
        {...props}
      />
    </div>
  );
}

export const REPORT_CURRENCY_OPTIONS = [
  { value: "AFN", label: "AFN" },
  { value: "USD", label: "USD" },
];

export function ReportSelectField({
  name,
  label,
  value,
  onChange,
  onValueChange,
  placeholder,
  options = [],
  className,
}) {
  const handleChange = (next) => {
    if (onChange && name) {
      onChange({ target: { name, value: next } });
      return;
    }
    onValueChange?.(next);
  };

  return (
    <div className={cn(reportFilterFieldClass, className)}>
      {label ? (
        <Label htmlFor={name} className="text-xs font-semibold">
          {label}
        </Label>
      ) : null}
      <Select value={value || ""} onValueChange={handleChange}>
        <SelectTrigger id={name} className={reportFilterControlClass}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ReportCurrencyField({ name = "currency", label, value, onChange, className }) {
  const { t } = useTranslation();
  return (
    <ReportSelectField
      name={name}
      label={label ?? t("common.currency")}
      value={value}
      onChange={onChange}
      options={REPORT_CURRENCY_OPTIONS}
      className={className}
    />
  );
}

/** Printable document canvas with company / title / period header. */
export function ReportDocument({
  title,
  subtitle,
  metaLines = [],
  children,
  className,
}) {
  const { t } = useTranslation();
  const company = t("operationalReports.companyTitle", "ERP");

  return (
    <Card
      className={cn(
        "report-print-area rounded-md border border-border bg-card overflow-hidden shadow-none print:border-none print:shadow-none print:rounded-none",
        className
      )}
    >
      <div className="px-4 md:px-6 pt-5 pb-4 text-center border-b border-border">
        <span className="block text-xs font-bold tracking-widest text-muted-foreground mb-1 uppercase">
          {company}
        </span>
        <h6 className="text-lg font-extrabold tracking-tight uppercase leading-tight">
          {title}
        </h6>
        {subtitle ? (
          <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>
        ) : null}
        {metaLines.length > 0 ? (
          <div className="flex flex-row flex-wrap justify-center gap-4 mt-2.5">
            {metaLines.map((line) => (
              <span
                key={line.label || line}
                className="text-xs tabular-nums text-muted-foreground font-semibold"
              >
                {line.label ? (
                  <>
                    <span className="text-muted-foreground/70 me-1">{line.label}:</span>
                    {line.value}
                  </>
                ) : (
                  line
                )}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div>{children}</div>
    </Card>
  );
}

/** Compact key/value strip under document header (opening/closing, aging buckets). */
export function ReportBalanceStrip({ items = [] }) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border-b border-border bg-muted/30">
      {items.map((item) => (
        <div key={item.label} className="px-4 py-2.5 min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {item.label}
          </span>
          <p className="text-sm font-bold tabular-nums mt-0.5 break-words">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

/** Key/value summary table for summary-only reports (cash flow). */
export function ReportKeyValueTable({ rows = [], currency }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-border last:border-0">
              <td className="py-2.5 ps-6 w-3/5 font-semibold">{row.label}</td>
              <td className="py-2.5 pe-6 text-end tabular-nums font-bold">
                {row.money ? formatReportMoney(row.value, currency) : row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Balance sheet / P&L sectioned account listing. */
export function ReportFinancialStatement({
  sections = [],
  currency,
  footerRows = [],
  balanced,
  balancedLabel,
  unbalancedLabel,
}) {
  const { t } = useTranslation();

  return (
    <div className="w-full">
      {typeof balanced === "boolean" && !balanced ? (
        <div className="mx-4 mt-4 mb-0 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          {unbalancedLabel || t("operationalReports.balanceSheetUnbalanced")}
        </div>
      ) : null}

      {sections.map((section) => (
        <div key={section.title} className="border-b border-border last:border-b-0">
          <div className="px-4 md:px-6 py-2.5 bg-muted/50 border-b border-border">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {section.title}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-start font-semibold text-xs uppercase py-2 px-4 md:px-6 w-24">
                    {t("accounting.accountCode")}
                  </th>
                  <th className="text-start font-semibold text-xs uppercase py-2 px-3">
                    {t("accounting.accountName")}
                  </th>
                  <th className="text-end font-semibold text-xs uppercase py-2 px-4 md:px-6 w-40">
                    {t("common.amount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(section.rows || []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-muted-foreground">
                      {t("operationalReports.noData")}
                    </td>
                  </tr>
                ) : (
                  section.rows.map((row, idx) => (
                    <tr
                      key={`${row.code || "row"}-${idx}`}
                      className="border-t border-border/60 hover:bg-muted/30"
                    >
                      <td className="py-1.5 px-4 md:px-6 tabular-nums text-muted-foreground">
                        {row.code || "—"}
                      </td>
                      <td className="py-1.5 px-3">{row.name}</td>
                      <td className="py-1.5 px-4 md:px-6 text-end tabular-nums font-medium">
                        {formatReportMoney(row.balance ?? row.amount, currency)}
                      </td>
                    </tr>
                  ))
                )}
                {section.total != null ? (
                  <tr className="bg-muted/40 border-t-2 border-border font-bold">
                    <td colSpan={2} className="py-2 px-4 md:px-6 text-end uppercase text-xs tracking-wide">
                      {section.totalLabel || t("common.total")}
                    </td>
                    <td className="py-2 px-4 md:px-6 text-end tabular-nums">
                      {formatReportMoney(section.total, currency)}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {footerRows.length > 0 ? (
        <div className="border-t-2 border-border bg-muted/30">
          <table className="w-full text-sm">
            <tbody>
              {footerRows.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <td className="py-2.5 ps-6 font-bold">{row.label}</td>
                  <td className="py-2.5 pe-6 text-end tabular-nums font-extrabold w-40">
                    {formatReportMoney(row.value, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {typeof balanced === "boolean" && balanced ? (
        <p className="text-xs text-center text-muted-foreground py-2 border-t border-border">
          {balancedLabel || t("operationalReports.balanceSheetBalanced")}
        </p>
      ) : null}
    </div>
  );
}

export function ReportEmptyState({ title, description }) {
  return (
    <Card className="p-8 text-center rounded-md border border-dashed border-border shadow-none">
      <p className="text-base font-bold mb-1">{title}</p>
      {description ? (
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      ) : null}
    </Card>
  );
}

export function ReportLoadingState() {
  return (
    <Card className="p-4 rounded-md border border-border shadow-none">
      <Skeleton className="h-2 w-full mb-4" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
    </Card>
  );
}

/** Dense ERP ledger table with optional totals and in-table search. */
export function ReportLedgerTable({
  columns,
  rows,
  renderCell,
  currency,
  searchPlaceholder,
  showSearch = false,
  maxHeight = 560,
  emptyLabel,
}) {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState("");

  const filteredRows = React.useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => {
        const val = row[col.id];
        if (val == null) return false;
        return String(val).toLowerCase().includes(q);
      })
    );
  }, [rows, search, columns]);

  const rowCurrencies = React.useMemo(() => {
    const set = new Set(
      filteredRows.map((r) => r.currency).filter((c) => c && c !== "MIXED")
    );
    return set;
  }, [filteredRows]);

  // Never sum AFN + USD into one total row.
  const singleCurrency =
    rowCurrencies.size === 1
      ? [...rowCurrencies][0]
      : rowCurrencies.size === 0 && currency && currency !== "MIXED"
        ? currency
        : null;

  const columnTotals = React.useMemo(() => {
    if (!singleCurrency) return {};
    const totals = {};
    columns.forEach((col) => {
      if (!col.money) return;
      totals[col.id] = filteredRows.reduce((sum, row) => {
        const n = Number(row[col.id]);
        return sum + (Number.isNaN(n) ? 0 : n);
      }, 0);
    });
    return totals;
  }, [columns, filteredRows, singleCurrency]);

  const hasMoneyTotals = Object.keys(columnTotals).length > 0;

  const alignClass = (align) =>
    align === "right" ? "text-end" : align === "center" ? "text-center" : "text-start";

  return (
    <div>
      {showSearch && rows.length > 0 ? (
        <div className="no-print px-4 py-2 border-b border-border flex justify-end">
          <div className="relative min-w-[200px]">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder || t("operationalReports.searchRows")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-8 h-9"
            />
          </div>
        </div>
      ) : null}

      <div className="overflow-auto print:overflow-visible print:max-h-none" style={{ maxHeight }}>
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              {columns.map((col) => {
                const side = col.money ? inferMoneySide(col.id) : MONEY_SIDE.NEUTRAL;
                return (
                  <th
                    key={col.id}
                    className={cn(
                      "font-bold text-xs uppercase tracking-wide whitespace-nowrap py-2 px-3 bg-muted text-muted-foreground border-b border-border",
                      alignClass(col.align),
                      col.money && moneySideHeaderClass(side)
                    )}
                  >
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-10">
                  <span className="text-sm text-muted-foreground">
                    {emptyLabel || t("operationalReports.noData")}
                  </span>
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => (
                <tr
                  key={row.id || row.entry_id || row.payment_id || row.run_id || idx}
                  className="hover:bg-muted/40 [&>td]:border-border/70 [&>td]:py-1.5 [&>td]:px-3 [&>td]:text-[13px] [&>td]:border-b"
                >
                  {columns.map((col) => {
                    const side = col.money ? inferMoneySide(col.id) : MONEY_SIDE.NEUTRAL;
                    const raw = row[col.id];
                    const colored =
                      col.money &&
                      side !== MONEY_SIDE.NEUTRAL &&
                      Number(raw) !== 0 &&
                      raw != null &&
                      raw !== "";
                    return (
                      <td
                        key={col.id}
                        className={cn(
                          alignClass(col.align),
                          (col.money || col.align === "right") && "tabular-nums",
                          colored && moneySideTextClass(side, raw),
                          col.id === "memo" &&
                            "max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap"
                        )}
                      >
                        {renderCell(row, col)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
            {hasMoneyTotals && filteredRows.length > 0 ? (
              <tr className="bg-muted/60 [&>td]:font-extrabold [&>td]:border-t-2 [&>td]:border-border [&>td]:py-2 [&>td]:px-3 [&>td]:tabular-nums">
                {columns.map((col, colIdx) => {
                  const side = col.money ? inferMoneySide(col.id) : MONEY_SIDE.NEUTRAL;
                  return (
                    <td
                      key={col.id}
                      className={cn(
                        alignClass(col.align),
                        col.money &&
                          side !== MONEY_SIDE.NEUTRAL &&
                          moneySideTextClass(side, columnTotals[col.id])
                      )}
                    >
                      {col.money
                        ? formatReportMoney(columnTotals[col.id], singleCurrency)
                        : colIdx === 0
                          ? t("common.total")
                          : ""}
                    </td>
                  );
                })}
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Back-compat alias used by older imports. */
export const ReportDataTable = ReportLedgerTable;
