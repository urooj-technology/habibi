import React, { useMemo } from "react";
import { Landmark, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import MoneyAmount from "../../../components/accounting/MoneyAmount";
import { MONEY_SIDE, moneySideHeaderClass } from "../../../utils/moneySide";

export function formatMoney(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n) || n === 0) return null;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function sumField(rows, field) {
  return rows.reduce((sum, r) => sum + (Number(r[field]) || 0), 0);
}

function MoneyCell({ value, side }) {
  return <MoneyAmount value={value} side={side} className="text-sm" />;
}

const thLeft =
  "px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";
const thRight =
  "px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";
const thGroup =
  "px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border/60";

export default function TrialBalanceTable({
  t,
  loading,
  trial,
  groupedRows,
  maxHeight = 640,
  currency = "",
}) {
  const flatRows = useMemo(
    () => groupedRows.flatMap((g) => g.rows || []),
    [groupedRows]
  );

  const totals = useMemo(() => {
    if (!flatRows.length) return null;
    return {
      opening_debit: sumField(flatRows, "opening_debit"),
      opening_credit: sumField(flatRows, "opening_credit"),
      period_debit: sumField(flatRows, "period_debit"),
      period_credit: sumField(flatRows, "period_credit"),
      closing_debit: sumField(flatRows, "closing_debit"),
      closing_credit: sumField(flatRows, "closing_credit"),
    };
  }, [flatRows]);

  return (
    <div className="overflow-auto" style={{ maxHeight }}>
      <table className="w-full min-w-[56rem] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-[7%]" />
          <col className="w-[21%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
          <tr className="border-b border-border">
            <th rowSpan={2} className={cn(thLeft, "align-bottom px-4 md:px-5")}>
              {t("accounting.accountCode", "Code")}
            </th>
            <th rowSpan={2} className={cn(thLeft, "align-bottom")}>
              {t("accounting.accountName", "Account")}
            </th>
            <th colSpan={2} className={thGroup}>
              {t("accounting.opening", "Opening")}
            </th>
            <th colSpan={2} className={thGroup}>
              {t("accounting.periodMovement", "Period")}
            </th>
            <th colSpan={2} className={thGroup}>
              {t("accounting.closing", "Closing")}
            </th>
          </tr>
          <tr className="border-b border-border">
            <th className={cn(thRight, moneySideHeaderClass(MONEY_SIDE.DEBIT))}>
              {t("journal.debit", "Debit")}
            </th>
            <th className={cn(thRight, moneySideHeaderClass(MONEY_SIDE.CREDIT))}>
              {t("journal.credit", "Credit")}
            </th>
            <th className={cn(thRight, moneySideHeaderClass(MONEY_SIDE.DEBIT))}>
              {t("journal.debit", "Debit")}
            </th>
            <th className={cn(thRight, moneySideHeaderClass(MONEY_SIDE.CREDIT))}>
              {t("journal.credit", "Credit")}
            </th>
            <th className={cn(thRight, moneySideHeaderClass(MONEY_SIDE.DEBIT))}>
              {t("journal.debit", "Debit")}
            </th>
            <th className={cn(thRight, moneySideHeaderClass(MONEY_SIDE.CREDIT))}>
              {t("journal.credit", "Credit")}
            </th>
          </tr>
        </thead>
        <tbody>
          {loading && !trial ? (
            <tr>
              <td colSpan={8} className="py-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("common.loading", "Loading")}…
                </p>
              </td>
            </tr>
          ) : groupedRows.length > 0 ? (
            <>
              {groupedRows.map(({ type, label, rows }) => (
                <React.Fragment key={type}>
                  <tr>
                    <td
                      colSpan={8}
                      className="border-b border-border/50 bg-muted/40 px-4 py-2 md:px-5"
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
                        {label || type}
                      </span>
                    </td>
                  </tr>
                  {rows.map((r, idx) => (
                    <tr
                      key={r.code}
                      className={cn(
                        "border-b border-border/40 hover:bg-muted/30",
                        idx % 2 === 1 && "bg-muted/15"
                      )}
                    >
                      <td className="whitespace-nowrap px-4 py-2 text-left font-medium tabular-nums text-foreground md:px-5">
                        {r.code}
                      </td>
                      <td className="truncate px-3 py-2 text-left text-foreground">
                        {r.name}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <MoneyCell value={r.opening_debit} side={MONEY_SIDE.DEBIT} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <MoneyCell value={r.opening_credit} side={MONEY_SIDE.CREDIT} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <MoneyCell value={r.period_debit} side={MONEY_SIDE.DEBIT} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <MoneyCell value={r.period_credit} side={MONEY_SIDE.CREDIT} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <MoneyCell value={r.closing_debit} side={MONEY_SIDE.DEBIT} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <MoneyCell value={r.closing_credit} side={MONEY_SIDE.CREDIT} />
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </>
          ) : trial ? (
            <tr>
              <td colSpan={8} className="px-5 py-12 text-center">
                <Landmark className="mx-auto h-10 w-10 text-muted-foreground/25" />
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {t("common.noData", "No activity in this period")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(
                    "dashboard.trialBalanceEmptyHint",
                    "Try a different date range or currency."
                  )}
                </p>
              </td>
            </tr>
          ) : null}
        </tbody>
        {totals ? (
          <tfoot>
            <tr className="border-t border-border bg-muted/30 text-sm font-semibold">
              <td
                className="px-4 py-3 text-left md:px-5"
                colSpan={2}
              >
                {t("common.total", "Total")}
                {currency ? (
                  <span className="ms-1 text-xs font-normal text-muted-foreground">
                    ({currency})
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-3 text-right">
                <MoneyAmount value={totals.opening_debit} side={MONEY_SIDE.DEBIT} showZero />
              </td>
              <td className="px-3 py-3 text-right">
                <MoneyAmount value={totals.opening_credit} side={MONEY_SIDE.CREDIT} showZero />
              </td>
              <td className="px-3 py-3 text-right">
                <MoneyAmount value={totals.period_debit} side={MONEY_SIDE.DEBIT} showZero />
              </td>
              <td className="px-3 py-3 text-right">
                <MoneyAmount value={totals.period_credit} side={MONEY_SIDE.CREDIT} showZero />
              </td>
              <td className="px-3 py-3 text-right">
                <MoneyAmount value={totals.closing_debit} side={MONEY_SIDE.DEBIT} showZero />
              </td>
              <td className="px-3 py-3 text-right">
                <MoneyAmount value={totals.closing_credit} side={MONEY_SIDE.CREDIT} showZero />
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
