import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";

import useFetchObjects from "../../../api/useFetchObjects";
import { useAuth } from "../../../context/AuthContext";

import PageHeader from "../../../components/PageHeader";
import ReusableTable from "../../../components/ReusableTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MoneyAmount from "../../../components/accounting/MoneyAmount";
import { MONEY_SIDE } from "../../../utils/moneySide";

const JournalEntryIndex = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pageSize] = useState(50);

  const auth = useAuth();
  const token = auth?.user?.token;

  const { data, isLoading, isError, error } = useFetchObjects(
    ["accounting-journal-entries", pageSize],
    `accounting/journal-entries/?page_size=${pageSize}`,
    token
  );

  const entries = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : data.results || [];
  }, [data]);

  const columns = useMemo(
    () => [
      { id: "id", label: t("common.id"), sortable: true, minWidth: 70, align: "center" },
      {
        id: "entry_date",
        label: t("journal.entryDate", "Date"),
        sortable: true,
        minWidth: 120,
        align: "center",
      },
      {
        id: "reference",
        label: t("journal.reference", "Reference"),
        sortable: true,
        minWidth: 160,
      },
      {
        id: "source_type",
        label: t("journal.source", "Source"),
        sortable: true,
        minWidth: 140,
      },
      {
        id: "line_count",
        label: t("journal.lines", "Lines"),
        sortable: true,
        minWidth: 90,
        align: "center",
      },
      {
        id: "total_debit_home",
        label: t("journal.debit", "Debit"),
        minWidth: 140,
        align: "right",
        sortable: true,
        format: (v) => (
          <MoneyAmount value={v} side={MONEY_SIDE.DEBIT} showZero empty="0.00" />
        ),
      },
      {
        id: "total_credit_home",
        label: t("journal.credit", "Credit"),
        minWidth: 140,
        align: "right",
        sortable: true,
        format: (v) => (
          <MoneyAmount value={v} side={MONEY_SIDE.CREDIT} showZero empty="0.00" />
        ),
      },
      {
        id: "is_balanced",
        label: t("journal.balanced", "Balanced"),
        minWidth: 120,
        align: "center",
        sortable: false,
        format: (v) => (
          <Badge variant="outline" className={v ? "text-success border-success/40" : "text-destructive border-destructive/40"}>
            {v ? t("common.yes") : t("common.no")}
          </Badge>
        ),
      },
      { id: "actions", label: t("common.actions"), minWidth: 120, align: "center", sortable: false },
    ],
    [t]
  );

  const toolbarButtons = [
    <Button
      key="add"
      onClick={() => navigate("/app/accounting/journal-entries/add")}
    >
      <Plus className="h-4 w-4" />
      {t("journal.addEntry", "Add Journal Entry")}
    </Button>,
  ];

  // We don't support delete/edit from API yet; provide view only.
  const onView = (id) => navigate(`/app/accounting/journal-entries/${id}`);

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden pb-6">
      <PageHeader
        title={t("accounting.journalEntries", "Journal Entries")}
        subtitle={t("accounting.journalSubtitle", "Manual balanced entries with inline lines")}
        breadcrumbs={[
          { link: "/app/dashboard", label: t("navigation.dashboard") },
          { link: "/app/accounting/journal-entries", label: t("accounting.journalEntries", "Journal Entries") },
        ]}
        actions={toolbarButtons}
      />

      {isError && (
        <div className="text-destructive mb-4">
          {error?.message || t("common.errorOccurred")}
        </div>
      )}

      <ReusableTable
        columns={columns}
        data={entries}
        title={t("journal.entryList", "Entries")}
        onView={onView}
        rowActions={true}
        loading={isLoading}
        pagination={false}
        toolbarButtons={toolbarButtons}
      />
    </div>
  );
};

export default JournalEntryIndex;
