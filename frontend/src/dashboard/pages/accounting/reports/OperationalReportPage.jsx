import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Box,
  Autocomplete,
  TextField,
} from "@/compat/ui";

import { useAuth } from "../../../../context/AuthContext";
import { API_BASE_URL } from "../../../../config/env";
import useFetchObjects from "../../../../api/useFetchObjects";
import PageHeader from "../../../../components/PageHeader";
import { InlineAlert } from "../../../../components/AlertMessage";
import {
  getReportConfig,
  buildReportUrl,
  defaultReportFilters,
} from "./operationalReportsConfig";
import {
  ReportEmptyState,
  ReportLoadingState,
  ReportLedgerTable,
  ReportDocument,
  ReportToolbar,
  ReportPeriodField,
  ReportDateField,
  ReportSelectField,
  ReportAutocompleteField,
  ReportBalanceStrip,
  ReportKeyValueTable,
  ReportFinancialStatement,
  formatReportMoney,
  applyPeriodPreset,
  exportRowsToCsv,
} from "./reportUi";
import { printOperationalReport } from "./printOperationalReport";

const OperationalReportPage = () => {
  const { t } = useTranslation();
  const { reportId } = useParams();
  const [searchParams] = useSearchParams();
  const config = getReportConfig(reportId);
  const auth = useAuth();
  const token = auth?.user?.token;

  const [filters, setFilters] = useState({ ...defaultReportFilters });
  const [runKey, setRunKey] = useState(0);
  const [activePreset, setActivePreset] = useState("thisMonth");

  const reportUrl = useMemo(
    () => (config ? buildReportUrl(config, filters) : null),
    [config, filters, runKey]
  );

  const { data: employeesData } = useFetchObjects(
    ["employees-report"],
    config?.filters?.includes("employee") ? "employees/?page_size=200" : null,
    config?.filters?.includes("employee") ? token : null
  );
  const employees = useMemo(
    () => (Array.isArray(employeesData) ? employeesData : employeesData?.results || []),
    [employeesData]
  );

  const { data: accountsData } = useFetchObjects(
    ["bank-accounts-report"],
    config?.filters?.includes("bankAccount")
      ? "accounting/accounts/?page_size=500"
      : null,
    config?.filters?.includes("bankAccount") ? token : null
  );
  const bankAccounts = useMemo(() => {
    const arr = Array.isArray(accountsData) ? accountsData : accountsData?.results || [];
    return arr.filter((a) => a.role === "BANK" || a.role === "CASH");
  }, [accountsData]);

  const needsEmployee = config?.filters.includes("employee") && !filters.employee_id;
  const needsAccount = config?.filters.includes("bankAccount") && !filters.account_id;
  const canRun = config && !needsEmployee && !needsAccount && Boolean(buildReportUrl(config, filters));

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["operational-report", reportId, reportUrl, runKey],
    queryFn: async () => {
      const headers = token ? { Authorization: `Token ${token}` } : {};
      const res = await axios.get(`${API_BASE_URL}/${reportUrl}`, { headers });
      return res.data;
    },
    enabled: Boolean(config && reportUrl && runKey > 0),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setActivePreset("");
  };

  const handleRun = useCallback(() => {
    if (!buildReportUrl(config, filters)) return;
    setRunKey((k) => k + 1);
  }, [config, filters]);

  const handleReset = () => {
    setFilters({ ...defaultReportFilters });
    setActivePreset("thisMonth");
    setRunKey(0);
  };

  const applyPreset = (preset) => {
    if (!config?.filters.includes("dateRange")) return;
    if (!preset) {
      setActivePreset("");
      return;
    }
    const dates = applyPeriodPreset(preset);
    setFilters((prev) => ({ ...prev, ...dates }));
    setActivePreset(preset);
  };

  useEffect(() => {
    const dates = config?.filters.includes("dateRange") ? applyPeriodPreset("thisMonth") : {};
    const empId = searchParams.get("employee_id");
    const acctId = searchParams.get("account_id");
    setFilters((prev) => ({
      ...prev,
      ...dates,
      ...(empId ? { employee_id: empId } : {}),
      ...(acctId ? { account_id: acctId } : {}),
    }));
    if (empId || acctId) {
      setRunKey(1);
    }
  }, [reportId, config?.filters, searchParams]);

  useEffect(() => {
    if (!config?.filters.includes("bankAccount")) return;
    if (!filters.account_id) return;
    const stillValid = bankAccounts.some((a) => String(a.id) === String(filters.account_id));
    if (!stillValid) {
      setFilters((prev) => ({ ...prev, account_id: "" }));
      setRunKey(0);
    }
  }, [bankAccounts, config?.filters, filters.account_id]);

  useEffect(() => {
    if (canRun && runKey === 0 && !needsEmployee && !needsAccount) {
      setRunKey(1);
    }
  }, [canRun, runKey, needsEmployee, needsAccount]);

  if (!config) {
    return (
      <Box>
        <InlineAlert severity="error" message={t("operationalReports.notFound")} />
      </Box>
    );
  }

  const rows = config.dataKey && data ? data[config.dataKey] || [] : [];
  const tableColumns = config.columns?.map((col) => ({ ...col, label: t(col.label) })) || [];

  const renderCell = (row, col) => {
    let val = row[col.id];
    if (col.translateBucket && val) {
      return t(`operationalReports.buckets.${val}`, val);
    }
    if (col.money && val != null) {
      return formatReportMoney(val, "");
    }
    if (val == null || val === "") return "—";
    if (col.suffix) return `${val}${col.suffix}`;
    return val;
  };

  const periodLabel = config.filters.includes("dateRange")
    ? `${filters.from} — ${filters.to}`
    : config.filters.includes("asOf")
      ? `${t("operationalReports.asOf")}: ${filters.as_of}`
      : null;

  const buildBalanceItems = () => {
    if (!data) return [];
    if (config.summaryType === "bankBook") {
      return [
        {
          label: t("accounting.openingBalance"),
          value: formatReportMoney(data.opening_balance, ""),
        },
        {
          label: t("accounting.closingBalance"),
          value: formatReportMoney(data.closing_balance, ""),
        },
        {
          label: t("operationalReports.bankAccount"),
          value: data.account_name ? `${data.account_code} — ${data.account_name}` : "—",
        },
      ];
    }
    if (config.summaryType === "agingTotals" && data.totals) {
      return Object.entries(data.totals).map(([key, val]) => ({
        label: t(`operationalReports.buckets.${key}`, key),
        value: formatReportMoney(val, ""),
      }));
    }
    if (config.summaryType === "categoryProfit" && data.totals) {
      return [
        {
          label: t("operationalReports.netSales"),
          value: formatReportMoney(data.totals.net_sales, ""),
        },
        {
          label: t("operationalReports.cogs"),
          value: formatReportMoney(data.totals.cogs, ""),
        },
        {
          label: t("operationalReports.grossProfit"),
          value: formatReportMoney(data.totals.gross_profit, ""),
        },
        {
          label: t("operationalReports.marginPct"),
          value: `${data.totals.margin_pct ?? "0.00"}%`,
        },
      ];
    }
    if (config.summaryType === "catalogCount" && data.totals) {
      const items = [
        {
          label: t("operationalReports.productCount"),
          value: String(data.totals.product_count ?? 0),
        },
      ];
      if (data.totals.stock_qty != null) {
        items.push({
          label: t("operationalReports.stockQty"),
          value: String(data.totals.stock_qty),
        });
      }
      if (data.totals.stock_value != null) {
        items.push({
          label: t("operationalReports.stockValue"),
          value: formatReportMoney(data.totals.stock_value, ""),
        });
      }
      if (data.totals.purchase_qty != null) {
        items.push({
          label: t("operationalReports.purchaseQty"),
          value: String(data.totals.purchase_qty),
        });
      }
      if (data.totals.purchase_amount != null) {
        items.push({
          label: t("operationalReports.purchaseAmount"),
          value: formatReportMoney(data.totals.purchase_amount, ""),
        });
      }
      return items;
    }
    if (config.totalField && data[config.totalField] != null) {
      return [
        {
          label: t("common.total"),
          value: formatReportMoney(data[config.totalField], ""),
        },
      ];
    }
    return [];
  };

  const summaryKvRows =
    config.displayType === "summary" && config.summaryFields && data
      ? config.summaryFields.map((field) => ({
          label: t(field.label),
          value: data[field.id],
          money: true,
        }))
      : [];

  const isFinancialStatement =
    config.displayType === "balanceSheet" || config.displayType === "profitAndLoss";

  const metaLines = [];
  if (periodLabel) metaLines.push({ label: t("common.period", "Period"), value: periodLabel });
  if (runKey > 0 && data && config.displayType !== "summary" && !isFinancialStatement) {
    metaLines.push({
      label: t("operationalReports.rows", "Rows"),
      value: String(rows.length),
    });
  }

  const handleExportCsv = () => {
    if (config.displayType === "balanceSheet" && data) {
      const stmtRows = [
        ...(data.assets || []).map((r) => ({ section: "Assets", ...r })),
        ...(data.liabilities || []).map((r) => ({ section: "Liabilities", ...r })),
        ...(data.equity || []).map((r) => ({ section: "Equity", ...r })),
      ];
      exportRowsToCsv(
        `${reportId}-${filters.as_of || "report"}.csv`,
        [
          { id: "section", label: "Section" },
          { id: "code", label: t("accounting.accountCode") },
          { id: "name", label: t("accounting.accountName") },
          { id: "balance", label: t("common.amount") },
        ],
        stmtRows
      );
      return;
    }
    if (config.displayType === "profitAndLoss" && data) {
      const stmtRows = [
        ...(data.income || []).map((r) => ({ section: "Income", ...r })),
        ...(data.expenses || []).map((r) => ({ section: "Expenses", ...r })),
      ];
      exportRowsToCsv(
        `${reportId}-${filters.from || "report"}.csv`,
        [
          { id: "section", label: "Section" },
          { id: "code", label: t("accounting.accountCode") },
          { id: "name", label: t("accounting.accountName") },
          { id: "amount", label: t("common.amount") },
        ],
        stmtRows
      );
      return;
    }
    if (!rows.length || !tableColumns.length) return;
    exportRowsToCsv(
      `${reportId}-${filters.from || filters.as_of || "report"}.csv`,
      tableColumns,
      rows,
      (row, col) => {
        if (col.translateBucket && row[col.id]) {
          return t(`operationalReports.buckets.${row[col.id]}`, row[col.id]);
        }
        const val = row[col.id];
        if (val == null || val === "") return "";
        if (col.suffix) return `${val}${col.suffix}`;
        return val;
      }
    );
  };

  const hasResult = runKey > 0 && !isLoading && !isFetching && Boolean(data);
  const balanceItems = buildBalanceItems();
  const busy = isLoading || isFetching;

  const financialSections =
    config.displayType === "balanceSheet" && data
      ? [
          {
            title: t("operationalReports.assets"),
            rows: data.assets,
            total: data.total_assets,
          },
          {
            title: t("operationalReports.liabilities"),
            rows: data.liabilities,
            total: data.total_liabilities,
          },
          {
            title: t("operationalReports.equity"),
            rows: data.equity,
            total: data.total_equity,
          },
        ]
      : config.displayType === "profitAndLoss" && data
        ? [
            {
              title: t("operationalReports.income"),
              rows: data.income,
              total: data.total_income,
            },
            {
              title: t("operationalReports.expenses"),
              rows: data.expenses,
              total: data.total_expenses,
            },
          ]
        : [];

  const financialFooterRows =
    config.displayType === "balanceSheet" && data
      ? [
          {
            label: t("operationalReports.totalAssets"),
            value: data.total_assets,
          },
          {
            label: t("operationalReports.totalLiabilitiesAndEquity"),
            value: data.total_liabilities_and_equity,
          },
        ]
      : config.displayType === "profitAndLoss" && data
        ? [
            {
              label: t("operationalReports.netProfit"),
              value: data.net_profit,
            },
          ]
        : [];

  const handlePrint = () => {
    if (!data || !config) return;
    printOperationalReport({
      title: t(config.i18nKey),
      metaLines,
      balanceItems: buildBalanceItems(),
      displayType: config.displayType,
      currency: "",
      columns: tableColumns,
      rows,
      summaryRows: summaryKvRows,
      financialSections,
      financialFooterRows,
      balanced: config.displayType === "balanceSheet" ? data.is_balanced : undefined,
      unbalancedLabel: t("operationalReports.balanceSheetUnbalanced"),
      formatMoney: (v) => formatReportMoney(v, ""),
      translateBucket: (val) => t(`operationalReports.buckets.${val}`, val),
    });
  };

  return (
    <Box
      sx={{
        "@media print": {
          "& .no-print": { display: "none !important" },
          "& .report-print-area": { boxShadow: "none !important", border: "none !important" },
        },
      }}
    >
      <Box className="no-print">
        <PageHeader
          title={t(config.i18nKey)}
          subtitle={t(`${config.i18nKey}Desc`)}
          backButton="/app/accounting/reports"
          backButtonLabel={t("operationalReports.backToReports")}
          breadcrumbs={[
            { link: "/app/dashboard", label: t("navigation.dashboard") },
            { link: "/app/accounting/accounts", label: t("accounting.title") },
            { link: "/app/accounting/reports", label: t("accounting.reports") },
            { label: t(config.i18nKey) },
          ]}
        />
      </Box>

      <ReportToolbar
        onRun={handleRun}
        onReset={handleReset}
        onPrint={handlePrint}
        onExportCsv={config.displayType === "summary" ? undefined : handleExportCsv}
        canRun={canRun}
        loading={busy}
        hasResult={hasResult}
      >
        {config.filters.includes("dateRange") ? (
          <ReportPeriodField value={activePreset} onChange={applyPreset} />
        ) : null}
        {config.filters.includes("dateRange") ? (
          <>
            <ReportDateField
              name="from"
              label={t("operationalReports.dateFrom")}
              value={filters.from}
              onChange={handleChange}
            />
            <ReportDateField
              name="to"
              label={t("operationalReports.dateTo")}
              value={filters.to}
              onChange={handleChange}
            />
          </>
        ) : null}
        {config.filters.includes("asOf") ? (
          <ReportDateField
            name="as_of"
            label={t("operationalReports.asOf")}
            value={filters.as_of}
            onChange={handleChange}
          />
        ) : null}
        {config.filters.includes("agingKind") ? (
          <ReportSelectField
            name="kind"
            label={t("operationalReports.agingKind")}
            value={filters.kind}
            onChange={handleChange}
            options={[
              { value: "customer", label: t("contacts.customers") },
              { value: "vendor", label: t("contacts.suppliers") },
            ]}
          />
        ) : null}
        {config.filters.includes("employee") ? (
          <ReportAutocompleteField label={t("hr.employees")} required>
            <Autocomplete
              size="small"
              options={employees}
              getOptionLabel={(e) => e.name || ""}
              value={employees.find((e) => String(e.id) === String(filters.employee_id)) || null}
              onChange={(_, val) =>
                setFilters((prev) => ({ ...prev, employee_id: val?.id || "" }))
              }
              renderInput={(params) => (
                <TextField {...params} size="small" required />
              )}
            />
          </ReportAutocompleteField>
        ) : null}
        {config.filters.includes("bankAccount") ? (
          <ReportAutocompleteField label={t("operationalReports.bankAccount")} required>
            <Autocomplete
              size="small"
              options={bankAccounts}
              getOptionLabel={(a) => `${a.code} — ${a.name}`}
              value={bankAccounts.find((a) => String(a.id) === String(filters.account_id)) || null}
              onChange={(_, val) =>
                setFilters((prev) => ({ ...prev, account_id: val?.id || "" }))
              }
              renderInput={(params) => (
                <TextField {...params} size="small" required />
              )}
            />
          </ReportAutocompleteField>
        ) : null}
      </ReportToolbar>

      {(needsEmployee || needsAccount) && runKey === 0 ? (
        <ReportEmptyState
          title={t("operationalReports.selectRequiredTitle")}
          description={
            needsEmployee
              ? t("operationalReports.selectEmployeeHint")
              : t("operationalReports.selectAccountHint")
          }
        />
      ) : null}

      {isError ? (
        <InlineAlert
          severity="error"
          message={error?.response?.data?.detail || error?.message || t("common.errorOccurred")}
          sx={{ mb: 2 }}
        />
      ) : null}

      {(isLoading || isFetching) && runKey > 0 ? <ReportLoadingState /> : null}

      {hasResult && !isError ? (
        <ReportDocument title={t(config.i18nKey)} metaLines={metaLines}>
          {balanceItems.length > 0 ? <ReportBalanceStrip items={balanceItems} /> : null}

          {config.displayType === "summary" ? (
            <ReportKeyValueTable rows={summaryKvRows} currency="" />
          ) : isFinancialStatement ? (
            <ReportFinancialStatement
              sections={financialSections}
              currency=""
              footerRows={financialFooterRows}
              balanced={config.displayType === "balanceSheet" ? data.is_balanced : undefined}
            />
          ) : (
            <ReportLedgerTable
              columns={tableColumns}
              rows={rows}
              renderCell={renderCell}
              currency=""
              showSearch={rows.length > 0}
            />
          )}
        </ReportDocument>
      ) : null}
    </Box>
  );
};

export default OperationalReportPage;
