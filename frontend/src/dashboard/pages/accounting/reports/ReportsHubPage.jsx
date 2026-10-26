import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, ChevronRight } from "lucide-react";

import PageHeader from "../../../../components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  operationalReports,
  REPORT_CATEGORIES,
} from "./operationalReportsConfig";

const CATEGORY_ORDER = [
  REPORT_CATEGORIES.FINANCE,
  REPORT_CATEGORIES.SALES,
  REPORT_CATEGORIES.PURCHASES,
  REPORT_CATEGORIES.INVENTORY,
  REPORT_CATEGORIES.PAYROLL,
];

const ReportsHubPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return operationalReports.filter((report) => {
      const matchesCategory = activeCategory === "all" || report.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      const title = t(report.i18nKey).toLowerCase();
      const desc = t(`${report.i18nKey}Desc`).toLowerCase();
      return title.includes(q) || desc.includes(q) || report.id.includes(q);
    });
  }, [search, activeCategory, t]);

  const grouped = useMemo(() => {
    if (activeCategory !== "all") {
      return [{ category: activeCategory, reports: filtered }];
    }
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      reports: filtered.filter((r) => r.category === cat),
    })).filter((g) => g.reports.length > 0);
  }, [filtered, activeCategory]);

  return (
    <div>
      <PageHeader
        title={t("operationalReports.hubTitle")}
        subtitle={t("operationalReports.hubSubtitle")}
        breadcrumbs={[
          { link: "/app/dashboard", label: t("navigation.dashboard") },
          { link: "/app/accounting/accounts", label: t("accounting.title") },
          { label: t("accounting.reports") },
        ]}
      />

      <Card className="no-print mb-4 px-4 py-4 rounded-md border border-border bg-card shadow-none">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_260px] md:items-end">
          <div className="min-w-0 space-y-1.5">
            <label className="block text-sm font-semibold text-foreground">
              {t("operationalReports.searchReports")}
            </label>
            <div className="relative">
              <Search className="absolute start-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t("operationalReports.searchReports")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 min-h-12 max-h-none w-full ps-11 text-base"
              />
            </div>
          </div>
          <div className="min-w-0 space-y-1.5">
            <label className="block text-sm font-semibold text-foreground">
              {t("operationalReports.category", "Category")}
            </label>
            <Select value={activeCategory} onValueChange={setActiveCategory}>
              <SelectTrigger className="h-12 w-full max-w-none text-base">
                <SelectValue placeholder={t("operationalReports.category", "Category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("operationalReports.allCategories")}</SelectItem>
                {CATEGORY_ORDER.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(`operationalReports.categories.${cat}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center rounded-md border border-border shadow-none">
          <p className="text-muted-foreground">{t("operationalReports.noReportsMatch")}</p>
        </Card>
      ) : (
        grouped.map(({ category, reports }) => (
          <div key={category} className="mb-5">
            {activeCategory === "all" ? (
              <span className="block mb-2 text-xs font-bold tracking-widest uppercase text-muted-foreground">
                {t(`operationalReports.categories.${category}`)}
              </span>
            ) : null}

            <Card className="rounded-md border border-border overflow-hidden shadow-none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-muted-foreground">
                    <th className="text-start font-bold text-xs uppercase tracking-wide py-2 px-3">
                      {t("operationalReports.reportName", "Report")}
                    </th>
                    <th className="text-start font-bold text-xs uppercase tracking-wide py-2 px-3 hidden md:table-cell">
                      {t("operationalReports.description", "Description")}
                    </th>
                    <th className="w-12 py-2 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr
                      key={report.id}
                      className="cursor-pointer hover:bg-muted/50 border-t border-border"
                      onClick={() => navigate(`/app/accounting/reports/${report.id}`)}
                    >
                      <td className="font-semibold py-2.5 px-3">
                        {t(report.i18nKey)}
                      </td>
                      <td className="text-muted-foreground py-2.5 px-3 hidden md:table-cell">
                        {t(`${report.i18nKey}Desc`)}
                      </td>
                      <td className="text-end py-2.5 px-3 text-muted-foreground">
                        <ChevronRight className="h-4 w-4 inline-block" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        ))
      )}
    </div>
  );
};

export default ReportsHubPage;
