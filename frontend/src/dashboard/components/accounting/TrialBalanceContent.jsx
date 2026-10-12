import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Scale,
  Download,
  ChevronDown,
  Printer,
  RefreshCw,
  Loader2,
} from "lucide-react";

import { useAuth } from "../../../context/AuthContext";
import { API_BASE_URL } from "../../../config/env";
import PageHeader from "../../../components/PageHeader";
import { InlineAlert } from "../../../components/AlertMessage";
import {
  FormShell,
  FormBody,
  FormGrid,
  FormSection,
} from "../../../components/FormShell";
import TrialBalanceTable from "../dashboard/TrialBalanceTable";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  formatReportMoney,
  ReportFilterGrid,
  ReportDateField,
  reportFilterControlClass,
} from "../../pages/accounting/reports/reportUi";
import { printTrialBalance } from "./printTrialBalance";

const ACCOUNT_TYPE_ORDER = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

const TYPE_LABEL_KEYS = {
  ASSET: "accounting.accountTypeAsset",
  LIABILITY: "accounting.accountTypeLiability",
  EQUITY: "accounting.accountTypeEquity",
  INCOME: "accounting.accountTypeIncome",
  EXPENSE: "accounting.accountTypeExpense",
};

const NET_INCOME_TYPE_ROLE = {
  ASSET: "plus",
  EQUITY: "plus",
  LIABILITY: "minus",
  EXPENSE: "minus",
};

function defaultRange() {
  const n = new Date();
  const from = new Date(n.getFullYear(), n.getMonth(), 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: n.toISOString().slice(0, 10),
  };
}

async function downloadFile(url, token, kind, errorMessage) {
  const headers = token ? { Authorization: `Token ${token}` } : {};
  const resp = await fetch(url, { headers });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(txt || `${errorMessage} (${resp.status})`);
  }
  const blob = await resp.blob();
  const contentType = (resp.headers.get("content-type") || "").toLowerCase();
  const cd = resp.headers.get("content-disposition") || "";
  const m = cd.match(/filename="([^"]+)"/);
  let filename = m && m[1];
  if (!filename) {
    if (contentType.includes("pdf")) filename = "trial-balance.pdf";
    else if (
      contentType.includes("spreadsheet") ||
      contentType.includes("excel")
    )
      filename = "trial-balance.xlsx";
    else filename = kind === "pdf" ? "trial-balance.pdf" : "trial-balance.xlsx";
  }
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}

const MetaItem = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="mt-1 break-words text-sm font-medium text-foreground">
      {value || "—"}
    </p>
  </div>
);

const TrialBalanceContent = ({ maxTableHeight = 640 }) => {
  const { t } = useTranslation();
  const auth = useAuth();
  const token = auth?.user?.token;
  const [{ from, to }, setRange] = useState(defaultRange);
  const [trial, setTrial] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const qs = useMemo(
    () => new URLSearchParams({ from, to }).toString(),
    [from, to]
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE_URL}/accounting/trial-balance/?${qs}`,
        { headers: { Authorization: `Token ${token}` } }
      );
      if (!res.ok)
        throw new Error((await res.text()) || t("common.errorLoadingData"));
      setTrial(await res.json());
    } catch (e) {
      setError(e?.message || t("common.errorOccurred"));
      setTrial(null);
    } finally {
      setLoading(false);
    }
  }, [token, qs, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onExport = async (kind) => {
    try {
      await downloadFile(
        `${API_BASE_URL}/accounting/trial-balance/export/${kind}/?${qs}`,
        token,
        kind,
        t("common.errorOccurred")
      );
    } catch (e) {
      window.alert(e?.message || t("common.errorOccurred"));
    }
  };

  const groupedRows = useMemo(() => {
    if (!trial?.rows?.length) return [];
    const byType = {};
    trial.rows.forEach((row) => {
      const type = row.account_type || "OTHER";
      if (!byType[type]) byType[type] = [];
      byType[type].push(row);
    });
    return ACCOUNT_TYPE_ORDER.filter((type) => byType[type]?.length).map(
      (type) => ({
        type,
        label: t(TYPE_LABEL_KEYS[type] || type, type),
        rows: byType[type],
      })
    );
  }, [trial, t]);

  const balanced = trial ? Boolean(trial.is_balanced) : null;
  const netProfit =
    trial?.net_profit != null ? Number(trial.net_profit) : null;

  return (
    <FormShell className="[@media_print]:[&_.no-print]:hidden">
      <PageHeader
        title={t("accounting.trialBalance")}
        subtitle={t(
          "accounting.trialBalanceHint",
          "Opening, period movement and closing balances by account"
        )}
        breadcrumbs={[
          { link: "/app/dashboard", label: "navigation.dashboard" },
          { link: "/app/accounting/accounts", label: "accounting.title" },
          {
            link: "/app/accounting/trial-balance",
            label: "accounting.trialBalance",
          },
        ]}
        actions={[
          <Button
            key="print"
            variant="outline"
            className="no-print"
            disabled={!trial}
            onClick={() =>
              printTrialBalance({
                title: t("accounting.trialBalance"),
                from,
                to,
                currency: "",
                trial,
                groupedRows,
                balancedLabel: t("journal.balanced", "Balanced"),
                unbalancedLabel: t("dashboard.notBalanced", "Not balanced"),
                netIncomeLabel: t("dashboard.netIncome", "Net income"),
              })
            }
          >
            <Printer className="h-4 w-4" />
            {t("common.print")}
          </Button>,
          <DropdownMenu key="export">
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="no-print"
                disabled={!trial}
              >
                <Download className="h-4 w-4" />
                {t("common.export", "Export")}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void onExport("excel")}>
                {t("accounting.exportTrialExcel", "Excel")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void onExport("pdf")}>
                {t("accounting.exportTrialPdf", "PDF")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>,
          <Button
            key="refresh"
            className="no-print"
            onClick={() => void load()}
            disabled={!token || loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t("common.refresh", "Refresh")}
          </Button>,
        ]}
      />

      <FormBody>
        {error ? (
          <InlineAlert
            severity="error"
            title={t("common.error")}
            message={error}
          />
        ) : null}

        <FormGrid>
          <FormSection
            span="full"
            className="no-print"
            icon={<Scale className="h-5 w-5" />}
            title={t("operationalReports.filters", "Filters")}
            description={t(
              "accounting.trialBalanceFiltersSub",
              "Choose period, then refresh"
            )}
          >
            <ReportFilterGrid>
              <ReportDateField
                name="tb-from"
                label={t("common.from", "From")}
                value={from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              />
              <ReportDateField
                name="tb-to"
                label={t("common.to", "To")}
                value={to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              />
              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                <Button
                  className={cn(reportFilterControlClass, "font-bold")}
                  onClick={() => void load()}
                  disabled={!token || loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {t("common.refresh", "Refresh")}
                </Button>
              </div>
            </ReportFilterGrid>
          </FormSection>

          {(trial || loading) && (
            <FormSection
              span="full"
              icon={<Scale className="h-5 w-5" />}
              title={t("accounting.trialBalance")}
              description={`${from} — ${to}`}
              noPadding
            >
              {trial ? (
                <div className="space-y-0 border-b border-border px-4 py-4 md:px-5">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <MetaItem
                      label={t("common.period", "Period")}
                      value={`${from} — ${to}`}
                    />
                    <MetaItem
                      label={t("dashboard.accountsWithActivity", "Accounts")}
                      value={String(
                        trial.account_count ?? trial.rows?.length ?? 0
                      )}
                    />
                    <MetaItem
                      label={t("journal.balanceStatus", "Status")}
                      value={
                        balanced
                          ? t("journal.balanced", "Balanced")
                          : t("dashboard.notBalanced", "Not balanced")
                      }
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-md bg-muted/40 px-3 py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("dashboard.netIncome", "Net income")}
                      </p>
                      <p className="text-sm font-semibold tabular-nums">
                        {formatReportMoney(netProfit, "")}
                      </p>
                    </div>
                    <div className="rounded-md bg-muted/40 px-3 py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("accounting.periodMovement", "Period")}
                      </p>
                      <p className="text-sm font-semibold tabular-nums">
                        {t("common.from", "From")} {from}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "rounded-md px-3 py-2",
                        balanced ? "bg-primary/10" : "bg-destructive/10"
                      )}
                    >
                      <p
                        className={cn(
                          "text-[10px] font-medium uppercase tracking-wide",
                          balanced ? "text-primary" : "text-destructive"
                        )}
                      >
                        {balanced
                          ? t("common.balanced", "Balanced")
                          : t("common.notBalanced", "Not balanced")}
                      </p>
                      <p
                        className={cn(
                          "text-base font-bold tabular-nums",
                          balanced ? "text-primary" : "text-destructive"
                        )}
                      >
                        {balanced
                          ? t("journal.balanced", "Balanced")
                          : t("dashboard.notBalanced", "Not balanced")}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <TrialBalanceTable
                t={t}
                loading={loading}
                trial={trial}
                groupedRows={groupedRows}
                maxHeight={maxTableHeight}
                currency=""
              />

              {trial?.period_net_by_type ? (
                <div className="no-print border-t border-border px-4 py-4 md:px-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t(
                      "dashboard.periodNetByType",
                      "Period net by account type"
                    )}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {ACCOUNT_TYPE_ORDER.map((typeKey) => {
                      const raw = trial.period_net_by_type?.[typeKey];
                      const role = NET_INCOME_TYPE_ROLE[typeKey];
                      return (
                        <div
                          key={typeKey}
                          className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-muted/20 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {t(TYPE_LABEL_KEYS[typeKey], typeKey)}
                            </p>
                            {role ? (
                              <p className="text-[11px] text-muted-foreground">
                                {role === "plus"
                                  ? t(
                                      "dashboard.inNetIncomePlus",
                                      "+ net income"
                                    )
                                  : t(
                                      "dashboard.inNetIncomeMinus",
                                      "− net income"
                                    )}
                              </p>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-sm font-semibold tabular-nums">
                            {formatReportMoney(raw, "")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </FormSection>
          )}
        </FormGrid>
      </FormBody>
    </FormShell>
  );
};

export default TrialBalanceContent;
