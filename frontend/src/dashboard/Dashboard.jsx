import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  ShoppingCart,
  Wallet,
  ShoppingBag,
  Receipt,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
} from "recharts";

import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/env";
import PageHeader from "../components/PageHeader";
import { InlineAlert } from "../components/AlertMessage";
import { formatShopMoney } from "../config/shopConfig";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function money(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return formatShopMoney(n);
}

function KpiTile({ label, value, hint, icon: Icon }) {
  return (
    <Card className="h-full rounded-xl border border-border shadow-none">
      <CardContent className="flex items-start gap-3 p-4">
        {Icon ? (
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-0.5 text-lg font-extrabold leading-tight tabular-nums">
            {value}
          </p>
          {hint ? (
            <p className="mt-0.5 block text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartPanel({ title, subtitle, children, height = 280 }) {
  return (
    <Card className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border shadow-none">
      <CardContent className="flex min-w-0 flex-1 flex-col p-4">
        <div className="mb-3">
          <p className="text-sm font-extrabold">{title}</p>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="w-full min-w-0 flex-1 overflow-hidden" style={{ minHeight: height }}>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function RecentTable({ title, columns, rows, emptyLabel, linkTo, linkLabel }) {
  return (
    <Card className="overflow-hidden rounded-xl border border-border shadow-none">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-sm font-extrabold">{title}</p>
        {linkTo ? (
          <Button asChild variant="ghost" size="sm">
            <RouterLink to={linkTo}>{linkLabel}</RouterLink>
          </Button>
        ) : null}
      </div>
      <div className="max-h-80 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/60">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.id}
                  className={cn(
                    "px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground",
                    c.align === "right" ? "text-right" : "text-left"
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center">
                  <span className="text-sm text-muted-foreground">{emptyLabel}</span>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-border hover:bg-muted/40">
                  {columns.map((c) => (
                    <td
                      key={c.id}
                      className={cn(
                        "px-3 py-2 text-[13px]",
                        c.align === "right" ? "text-right" : "text-left",
                        c.money ? "tabular-nums" : ""
                      )}
                    >
                      {c.render ? c.render(row) : row[c.id]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const Dashboard = () => {
  const { t } = useTranslation();
  const auth = useAuth();
  const token = auth?.user?.token;
  const [days, setDays] = useState(14);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["dashboard-daily", days],
    queryFn: async () => {
      const headers = token ? { Authorization: `Token ${token}` } : {};
      const res = await axios.get(`${API_BASE_URL}/dashboard/daily/`, {
        headers,
        params: { days },
      });
      return res.data;
    },
    enabled: Boolean(token),
  });

  const chartSeries = useMemo(() => {
    if (!data?.daily_series) return [];
    return data.daily_series.map((row) => ({
      ...row,
      sales: Number(row.sales) || 0,
      collections: Number(row.collections) || 0,
      purchases: Number(row.purchases) || 0,
    }));
  }, [data]);

  const topCustomersChart = useMemo(() => {
    if (!data?.top_customers) return [];
    return data.top_customers.map((r) => ({
      name: r.name.length > 16 ? `${r.name.slice(0, 14)}…` : r.name,
      fullName: r.name,
      total: Number(r.total) || 0,
    }));
  }, [data]);

  const today = data?.today;

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
  };

  const chartColors = {
    primary: "hsl(var(--primary))",
    warning: "#f59e0b",
    success: "#22c55e",
    info: "#3b82f6",
    grid: "hsl(var(--border))",
  };

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden pb-8">
      <PageHeader
        title={t("dashboard.title")}
        subtitle={t(
          "dashboard.dailySubtitle",
          "Today’s sales, purchases, and collections — not the trial balance."
        )}
        actions={[
          <Select key="days" value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="min-w-[120px]">
              <SelectValue placeholder={t("dashboard.trendWindow", "Trend")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t("dashboard.last7Days", "Last 7 days")}</SelectItem>
              <SelectItem value="14">{t("dashboard.last14Days", "Last 14 days")}</SelectItem>
              <SelectItem value="30">{t("dashboard.last30Days", "Last 30 days")}</SelectItem>
            </SelectContent>
          </Select>,
          <Button key="reports" asChild variant="outline" size="sm">
            <RouterLink to="/app/accounting/reports">
              <BarChart3 className="h-4 w-4" />
              {t("accounting.reports")}
            </RouterLink>
          </Button>,
        ]}
      />

      {(isLoading || isFetching) && !data ? (
        <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse bg-primary" />
        </div>
      ) : null}

      {isError ? (
        <InlineAlert
          severity="error"
          message={error?.response?.data?.detail || error?.message || t("common.errorOccurred")}
          sx={{ marginBottom: "1rem" }}
        />
      ) : null}

      {data ? (
        <>
          <p className="mb-3 block text-xs font-semibold text-muted-foreground">
            {t("dashboard.asOfToday", "Today")}: {data.as_of}
          </p>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              icon={ShoppingCart}
              label={t("dashboard.todaySales", "Today’s sales")}
              value={money(today.sales_total)}
              hint={t("dashboard.invoiceCount", "{{count}} invoices", {
                count: today.sales_count,
              })}
            />
            <KpiTile
              icon={Wallet}
              label={t("dashboard.todayCollections", "Today’s collections")}
              value={money(today.collections)}
              hint={t("dashboard.unpaidToday", "{{count}} unpaid", {
                count: today.unpaid_invoices,
              })}
            />
            <KpiTile
              icon={ShoppingBag}
              label={t("dashboard.todayPurchases", "Today’s purchases")}
              value={money(today.purchases_total)}
              hint={t("dashboard.billCount", "{{count}} bills", {
                count: today.purchase_count,
              })}
            />
            <KpiTile
              icon={Receipt}
              label={t("dashboard.periodSales", "Period sales")}
              value={money(data.period.sales_total)}
              hint={t("dashboard.periodPurchasesHint", "Purchases {{amount}}", {
                amount: money(data.period.purchases_total),
              })}
            />
          </div>

          <div className="mb-4 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-8">
              <ChartPanel
                title={t("dashboard.dailyTrend", "Daily sales vs purchases")}
                subtitle={t("dashboard.dailyTrendHint", "{{from}} — {{to}}", {
                  from: data.from,
                  to: data.to,
                })}
                height={300}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={56} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => money(value)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="sales"
                      name={t("dashboard.sales", "Sales")}
                      fill={chartColors.primary}
                      radius={[2, 2, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="purchases"
                      name={t("navigation.purchases", "Purchases")}
                      fill={chartColors.warning}
                      radius={[2, 2, 0, 0]}
                      maxBarSize={28}
                    />
                    <Line
                      type="monotone"
                      dataKey="collections"
                      name={t("dashboard.collections", "Collections")}
                      stroke={chartColors.success}
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>
            <div className="lg:col-span-4">
              <ChartPanel
                title={t("dashboard.topCustomers", "Top customers")}
                subtitle={t("dashboard.inPeriod", "In selected period")}
                height={300}
              >
                {topCustomersChart.length === 0 ? (
                  <div className="grid h-full place-items-center">
                    <span className="text-sm text-muted-foreground">
                      {t("dashboard.noDataAvailable")}
                    </span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topCustomersChart}
                      layout="vertical"
                      margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => money(value)}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
                      />
                      <Bar
                        dataKey="total"
                        name={t("common.total")}
                        fill={chartColors.info}
                        radius={[0, 2, 2, 0]}
                        maxBarSize={18}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <RecentTable
              title={t("dashboard.todaysInvoices", "Today’s invoices")}
              linkTo="/app/sales"
              linkLabel={t("common.viewAll", "View all")}
              emptyLabel={t("dashboard.noSalesToday", "No sales recorded today.")}
              columns={[
                { id: "id", label: t("common.id") },
                { id: "customer", label: t("sales.customer") },
                {
                  id: "total",
                  label: t("common.total"),
                  align: "right",
                  money: true,
                  render: (row) => money(row.total),
                },
                {
                  id: "received",
                  label: t("dashboard.collected", "Collected"),
                  align: "right",
                  money: true,
                  render: (row) => money(row.received),
                },
              ]}
              rows={data.recent_sales || []}
            />
            <RecentTable
              title={t("dashboard.todaysBills", "Today’s purchase bills")}
              linkTo="/app/purchases"
              linkLabel={t("common.viewAll", "View all")}
              emptyLabel={t("dashboard.noPurchasesToday", "No purchases recorded today.")}
              columns={[
                { id: "id", label: t("common.id") },
                { id: "supplier", label: t("purchases.supplier") },
                {
                  id: "total",
                  label: t("common.total"),
                  align: "right",
                  money: true,
                  render: (row) => money(row.total),
                },
                {
                  id: "paid",
                  label: t("dashboard.paid", "Paid"),
                  align: "right",
                  money: true,
                  render: (row) => money(row.paid),
                },
              ]}
              rows={data.recent_purchases || []}
            />
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Dashboard;
