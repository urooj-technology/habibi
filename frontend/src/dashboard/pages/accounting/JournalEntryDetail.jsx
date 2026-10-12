import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  ListOrdered,
  Pencil,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import useFetchObject from "../../../api/useFetchObject";
import { useAuth } from "../../../context/AuthContext";
import useDelete from "../../../api/useDelete";

import PageHeader from "../../../components/PageHeader";
import { InlineAlert } from "../../../components/AlertMessage";
import { FullPageLoader } from "../../../components/LoadingScreen";
import {
  FormShell,
  FormBody,
  FormGrid,
  FormSection,
} from "../../../components/FormShell";
import MoneyAmount from "../../../components/accounting/MoneyAmount";
import { MONEY_SIDE, moneySideHeaderClass } from "../../../utils/moneySide";

const ROUTE_BASE = "/app/accounting/journal-entries";

const money = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return "0.00";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const MetaItem = ({ label, value, className }) => (
  <div className={cn("min-w-0", className)}>
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="mt-1 break-words text-sm font-medium text-foreground">
      {value || "—"}
    </p>
  </div>
);

const JournalEntryDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const auth = useAuth();
  const token = auth?.user?.token;

  const { handleDelete, ConfirmDialog } = useDelete(
    "accounting/journal-entries",
    token
  );

  const { data, isLoading, isError, error } = useFetchObject(
    "journal-entry",
    "accounting/journal-entries/",
    id,
    token
  );

  const lines = useMemo(() => {
    if (!data?.lines) return [];
    return Array.isArray(data.lines) ? data.lines : [];
  }, [data]);

  const isManual = data?.source_type === "MANUAL";
  const balanced =
    data?.is_balanced === undefined ? true : Boolean(data.is_balanced);

  const sourceLabel = useMemo(() => {
    if (!data?.source_type) return "—";
    const key = `journal.source_${data.source_type}`;
    const fallbacks = {
      MANUAL: t("journal.sourceManual", "Manual entry"),
      SALE: t("journal.sourceSale", "Sale"),
      PURCHASE: t("journal.sourcePurchase", "Purchase"),
      PAYROLL: t("journal.sourcePayroll", "Payroll"),
      OPENING: t("journal.sourceOpening", "Opening balance"),
    };
    return t(key, fallbacks[data.source_type] || data.source_type);
  }, [data?.source_type, t]);

  if (isLoading) {
    return <FullPageLoader message="common.loading" />;
  }

  return (
    <FormShell>
      <PageHeader
        title={t("journal.journalEntry", "Journal Entry")}
        subtitle={
          data?.reference
            ? `#${data.id} · ${data.reference}`
            : `#${data?.id || id}`
        }
        backButton={ROUTE_BASE}
        backButtonLabel={t("common.backToList", "Back to list")}
        breadcrumbs={[
          {
            link: ROUTE_BASE,
            label: t("accounting.journalEntries", "Journal Entries"),
          },
          { label: `#${data?.id || id}` },
        ]}
        actions={[
          <Button
            key="back"
            variant="outline"
            onClick={() => navigate(ROUTE_BASE)}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.backToList", "Back")}
          </Button>,
          isManual ? (
            <Button
              key="edit"
              variant="outline"
              onClick={() => navigate(`${ROUTE_BASE}/${id}/edit`)}
            >
              <Pencil className="h-4 w-4" />
              {t("common.edit", "Edit")}
            </Button>
          ) : null,
          isManual ? (
            <Button
              key="delete"
              variant="destructive"
              onClick={() => handleDelete(id)}
            >
              <Trash2 className="h-4 w-4" />
              {t("common.delete", "Delete")}
            </Button>
          ) : null,
        ]}
      />

      <FormBody>
        {isError ? (
          <InlineAlert
            severity="error"
            title={t("common.error")}
            message={error?.message || t("common.errorOccurred")}
          />
        ) : null}

        {!isError && data ? (
          <FormGrid>
            <FormSection
              span="full"
              icon={<BookOpen className="h-5 w-5" />}
              title={t("journal.headerInfo", "Entry details")}
              description={t(
                "journal.viewHeaderSub",
                "Date, source and reference for this journal"
              )}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetaItem
                  label={t("journal.entryDate", "Entry date")}
                  value={data.entry_date}
                />
                <MetaItem
                  label={t("journal.source", "Source")}
                  value={
                    data.source_id
                      ? `${sourceLabel} (#${data.source_id})`
                      : sourceLabel
                  }
                />
                <MetaItem
                  label={t("journal.reference", "Reference")}
                  value={data.reference}
                />
                <MetaItem
                  label={t("journal.lineCount", "Lines")}
                  value={String(data.line_count ?? lines.length)}
                />
              </div>

              {data.memo ? (
                <div className="mt-1 rounded-md border border-border/70 bg-muted/30 px-3 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t("journal.memo", "Memo")}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                    {data.memo}
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-3">
                <div className="rounded-md border border-debit/20 bg-debit/8 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-debit/80">
                    {t("journal.totalDebit", "Total debit")}
                  </p>
                  <p className="text-sm">
                    <MoneyAmount
                      value={data.total_debit_home}
                      side={MONEY_SIDE.DEBIT}
                      currency="AFN"
                      showZero
                    />
                  </p>
                </div>
                <div className="rounded-md border border-credit/20 bg-credit/8 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-credit/80">
                    {t("journal.totalCredit", "Total credit")}
                  </p>
                  <p className="text-sm">
                    <MoneyAmount
                      value={data.total_credit_home}
                      side={MONEY_SIDE.CREDIT}
                      currency="AFN"
                      showZero
                    />
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
                    {money(data.total_debit_home)} AFN
                  </p>
                </div>
              </div>
            </FormSection>

            <FormSection
              span="full"
              icon={<ListOrdered className="h-5 w-5" />}
              title={t("journal.lines", "Journal Lines")}
              description={t(
                "journal.viewLinesSub",
                "Debit and credit postings for this entry"
              )}
              noPadding
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] table-fixed border-collapse text-sm">
                  <colgroup>
                    <col className="w-[22%]" />
                    <col className="w-[22%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[16%]" />
                    <col className="w-[16%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 text-left font-semibold md:px-5">
                        {t("journal.account", "Account")}
                      </th>
                      <th className="px-3 py-3 text-left font-semibold">
                        {t("journal.lineMemo", "Line memo")}
                      </th>
                      <th className={cn("px-3 py-3 text-right font-semibold", moneySideHeaderClass(MONEY_SIDE.DEBIT))}>
                        {t("journal.debit", "Debit")} (AFN)
                      </th>
                      <th className={cn("px-3 py-3 text-right font-semibold", moneySideHeaderClass(MONEY_SIDE.CREDIT))}>
                        {t("journal.credit", "Credit")} (AFN)
                      </th>
                      <th className="px-3 py-3 text-left font-semibold">
                        {t("journal.customer", "Customer")}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold md:px-5">
                        {t("journal.supplier", "Supplier")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-8 text-center text-muted-foreground"
                        >
                          {t("common.noData", "No data")}
                        </td>
                      </tr>
                    ) : (
                      lines.map((line) => {
                        const debit = Number(line.debit_home || 0);
                        const credit = Number(line.credit_home || 0);
                        return (
                          <tr
                            key={line.id}
                            className="border-b border-border/60 last:border-b-0 hover:bg-muted/20"
                          >
                            <td className="px-4 py-3 text-left md:px-5">
                              <div className="truncate font-medium text-foreground">
                                {line.account_details?.code || "—"}
                                {line.account_details?.name
                                  ? ` ${line.account_details.name}`
                                  : ""}
                              </div>
                            </td>
                            <td className="truncate px-3 py-3 text-left text-muted-foreground">
                              {line.line_memo || "—"}
                            </td>
                            <td className="px-3 py-3 text-right">
                              <MoneyAmount value={debit} side={MONEY_SIDE.DEBIT} />
                            </td>
                            <td className="px-3 py-3 text-right">
                              <MoneyAmount value={credit} side={MONEY_SIDE.CREDIT} />
                            </td>
                            <td className="truncate px-3 py-3 text-left text-muted-foreground">
                              {line.customer_details?.name || "—"}
                            </td>
                            <td className="truncate px-4 py-3 text-left text-muted-foreground md:px-5">
                              {line.supplier_details?.name || "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {lines.length > 0 ? (
                    <tfoot>
                      <tr className="border-t border-border bg-muted/20 text-sm font-semibold">
                        <td className="px-4 py-3 text-left md:px-5" colSpan={2}>
                          {t("common.total", "Total")}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <MoneyAmount
                            value={data.total_debit_home}
                            side={MONEY_SIDE.DEBIT}
                            showZero
                          />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <MoneyAmount
                            value={data.total_credit_home}
                            side={MONEY_SIDE.CREDIT}
                            showZero
                          />
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            </FormSection>
          </FormGrid>
        ) : null}
      </FormBody>

      <ConfirmDialog />
    </FormShell>
  );
};

export default JournalEntryDetail;
