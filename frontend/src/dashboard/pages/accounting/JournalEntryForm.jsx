import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Save,
  X,
  BookOpen,
  Loader2,
  Plus,
  Trash2,
  ListOrdered,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import useFetchObject from "../../../api/useFetchObject";
import useFetchObjects from "../../../api/useFetchObjects";
import useAdd from "../../../api/useAdd";
import useUpdate from "../../../api/useUpdate";
import { useAuth } from "../../../context/AuthContext";
import PageHeader from "../../../components/PageHeader";
import { FormTextField, FormDatePicker } from "../../../components/FormFields";
import { InlineAlert } from "../../../components/AlertMessage";
import { FullPageLoader } from "../../../components/LoadingScreen";
import SearchableSelect from "../../../components/SearchableSelect";
import {
  FormShell,
  FormBody,
  FormGrid,
  FormSection,
  FormRow,
} from "../../../components/FormShell";

const ROUTE_BASE = "/app/accounting/journal-entries";
const API_PATH = "accounting/journal-entries";

const to2 = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return "0.00";
  return n.toFixed(2);
};

const money = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const normalizeId = (v) =>
  v === undefined || v === null || v === "" ? null : v;

const emptyLine = () => ({
  key: `${Date.now()}-${Math.random()}`,
  account: null,
  debit_home: "",
  credit_home: "",
  line_memo: "",
  customer: null,
  supplier: null,
});

const listResults = (resp) => {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  return resp.results || [];
};

const JournalEntryForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const auth = useAuth();
  const token = auth?.user?.token;
  const hydratedRef = useRef(false);

  const todayISO = new Date().toISOString().slice(0, 10);

  const [header, setHeader] = useState({
    entry_date: todayISO,
    reference: "",
    memo: "",
  });
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);
  const [formError, setFormError] = useState("");

  const {
    data: doc,
    isLoading: fetchLoading,
    isError: fetchError,
    error: fetchErrorObj,
  } = useFetchObject("journal-entry", `${API_PATH}/`, id, token);

  const {
    data: accountsResp,
    isLoading: accountsLoading,
    isError: accountsError,
    error: accountsErrorObj,
  } = useFetchObjects(
    ["accounting-accounts-journal"],
    "accounting/accounts/?page_size=500",
    token
  );

  const { data: customersResp, isLoading: customersLoading } = useFetchObjects(
    ["customers-for-journal"],
    "customers/?page_size=500",
    token
  );
  const { data: suppliersResp, isLoading: suppliersLoading } = useFetchObjects(
    ["suppliers-for-journal"],
    "suppliers/?page_size=500",
    token
  );

  const accounts = useMemo(
    () => listResults(accountsResp).filter((a) => a?.is_active !== false),
    [accountsResp]
  );
  const customers = useMemo(() => listResults(customersResp), [customersResp]);
  const suppliers = useMemo(() => listResults(suppliersResp), [suppliersResp]);

  const accountsById = useMemo(() => {
    const m = new Map();
    for (const a of accounts) m.set(Number(a.id), a);
    return m;
  }, [accounts]);
  const customersById = useMemo(() => {
    const m = new Map();
    for (const c of customers) m.set(Number(c.id), c);
    return m;
  }, [customers]);
  const suppliersById = useMemo(() => {
    const m = new Map();
    for (const s of suppliers) m.set(Number(s.id), s);
    return m;
  }, [suppliers]);

  const { handleAdd, loading: addLoading } = useAdd(
    API_PATH,
    token,
    ROUTE_BASE,
    t("journal.createSuccess", "Journal entry created"),
    t("journal.createError", "Error creating journal entry")
  );

  const { handleUpdate, loading: updateLoading } = useUpdate(
    API_PATH,
    token,
    isEdit ? `${ROUTE_BASE}/${id}` : ROUTE_BASE,
    t("journal.updateSuccess", "Journal updated"),
    t("journal.updateError", "Error updating journal")
  );

  const resolveAccount = useCallback(
    (raw) => {
      const aid = raw?.id ?? raw;
      if (aid == null || aid === "") return null;
      return accountsById.get(Number(aid)) || (typeof raw === "object" ? raw : { id: aid });
    },
    [accountsById]
  );

  const resolveParty = useCallback((raw, byId) => {
    const pid = raw?.id ?? raw;
    if (pid == null || pid === "") return null;
    return byId.get(Number(pid)) || (typeof raw === "object" ? raw : { id: pid });
  }, []);

  useEffect(() => {
    if (!doc || !isEdit || hydratedRef.current) return;
    setHeader({
      entry_date: doc.entry_date || todayISO,
      reference: doc.reference || "",
      memo: doc.memo || "",
    });
    const mapped =
      doc.lines?.length >= 2
        ? doc.lines.map((ln) => ({
            key: ln.id || `${Date.now()}-${Math.random()}`,
            account: resolveAccount(ln.account),
            debit_home:
              Number(ln.debit_home) > 0 ? to2(ln.debit_home) : "",
            credit_home:
              Number(ln.credit_home) > 0 ? to2(ln.credit_home) : "",
            line_memo: ln.line_memo || "",
            customer: resolveParty(ln.customer, customersById),
            supplier: resolveParty(ln.supplier, suppliersById),
          }))
        : [emptyLine(), emptyLine()];
    setLines(mapped);
    hydratedRef.current = true;
  }, [
    doc,
    isEdit,
    todayISO,
    resolveAccount,
    resolveParty,
    customersById,
    suppliersById,
  ]);

  // Enrich FK objects once lookup lists arrive
  useEffect(() => {
    if (!hydratedRef.current) return;
    setLines((prev) =>
      prev.map((line) => ({
        ...line,
        account: line.account
          ? accountsById.get(Number(line.account.id ?? line.account)) ||
            line.account
          : null,
        customer: line.customer
          ? customersById.get(Number(line.customer.id ?? line.customer)) ||
            line.customer
          : null,
        supplier: line.supplier
          ? suppliersById.get(Number(line.supplier.id ?? line.supplier)) ||
            line.supplier
          : null,
      }))
    );
  }, [accountsById, customersById, suppliersById]);

  const totalDebit = useMemo(
    () => lines.reduce((sum, l) => sum + Number(l.debit_home || 0), 0),
    [lines]
  );
  const totalCredit = useMemo(
    () => lines.reduce((sum, l) => sum + Number(l.credit_home || 0), 0),
    [lines]
  );
  const balanced = to2(totalDebit) === to2(totalCredit);
  const imbalance = Math.abs(totalDebit - totalCredit);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setHeader((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError("");
  };

  const updateLine = (key, patch) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l))
    );
    if (formError) setFormError("");
  };

  /** With exactly two lines, mirror line 1 amount onto the opposite side of line 2. */
  const balanceSecondFromFirst = (rows) => {
    if (rows.length !== 2) return rows;
    const [first, second] = rows;
    const dr = Number(first.debit_home || 0);
    const cr = Number(first.credit_home || 0);

    if (dr > 0) {
      return [
        first,
        {
          ...second,
          debit_home: "",
          credit_home: first.debit_home,
        },
      ];
    }
    if (cr > 0) {
      return [
        first,
        {
          ...second,
          credit_home: "",
          debit_home: first.credit_home,
        },
      ];
    }
    return [
      first,
      {
        ...second,
        debit_home: "",
        credit_home: "",
      },
    ];
  };

  const setDebit = (key, value) => {
    setLines((prev) => {
      const updated = prev.map((l) =>
        l.key === key
          ? {
              ...l,
              debit_home: value,
              credit_home: Number(value) > 0 ? "" : l.credit_home,
            }
          : l
      );
      if (prev.length === 2 && key === prev[0].key) {
        return balanceSecondFromFirst(updated);
      }
      return updated;
    });
    if (formError) setFormError("");
  };

  const setCredit = (key, value) => {
    setLines((prev) => {
      const updated = prev.map((l) =>
        l.key === key
          ? {
              ...l,
              credit_home: value,
              debit_home: Number(value) > 0 ? "" : l.debit_home,
            }
          : l
      );
      if (prev.length === 2 && key === prev[0].key) {
        return balanceSecondFromFirst(updated);
      }
      return updated;
    });
    if (formError) setFormError("");
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (key) =>
    setLines((prev) =>
      prev.length <= 2 ? prev : prev.filter((l) => l.key !== key)
    );

  const validate = () => {
    if (!header.entry_date) {
      return t("validation.required");
    }
    if (lines.length < 2) {
      return t("journal.minLines", "At least two journal lines are required.");
    }
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.account?.id) {
        return t("journal.lineAccountRequired", {
          defaultValue: `Line ${i + 1}: account is required.`,
          n: i + 1,
        });
      }
      const dr = Number(l.debit_home || 0);
      const cr = Number(l.credit_home || 0);
      if (dr > 0 && cr > 0) {
        return t("journal.lineBothSides", {
          defaultValue: `Line ${i + 1}: cannot have both debit and credit.`,
          n: i + 1,
        });
      }
      if (!(dr > 0 || cr > 0)) {
        return t("journal.lineAmountRequired", {
          defaultValue: `Line ${i + 1}: debit or credit must be greater than 0.`,
          n: i + 1,
        });
      }
    }
    if (!balanced) {
      return t(
        "journal.mustBalance",
        "Journal must balance: total debits must equal total credits."
      );
    }
    return "";
  };

  const buildPayload = () => ({
    entry_date: header.entry_date,
    reference: header.reference || "",
    memo: header.memo || "",
    lines: lines.map((l) => ({
      account_id: l.account.id,
      debit_home: to2(l.debit_home || 0),
      credit_home: to2(l.credit_home || 0),
      line_memo: l.line_memo || "",
      customer_id: normalizeId(l.customer?.id),
      supplier_id: normalizeId(l.supplier?.id),
    })),
  });

  const handleSubmit = () => {
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError("");
    const payload = buildPayload();
    if (isEdit) handleUpdate(id, payload);
    else handleAdd(payload);
  };

  const loading = addLoading || updateLoading;
  const readOnly = isEdit && doc?.source_type && doc.source_type !== "MANUAL";
  const accountLabel = (a) =>
    a ? `${a.code || ""} — ${a.name || `#${a.id}`}` : "";

  if (isEdit && fetchLoading) {
    return <FullPageLoader message="common.loading" />;
  }

  return (
    <FormShell>
      <PageHeader
        title={t(
          isEdit ? "journal.editEntry" : "journal.addEntry",
          isEdit ? "Edit Journal Entry" : "Add Journal Entry"
        )}
        subtitle={t(
          "journal.manualEntrySubtitle",
          "Manual, balanced journal entry"
        )}
        backButton={ROUTE_BASE}
        backButtonLabel={t("common.backToList", "Back to list")}
        breadcrumbs={[
          {
            link: ROUTE_BASE,
            label: t("accounting.journalEntries", "Journal Entries"),
          },
          {
            label: t(
              isEdit ? "journal.editEntry" : "journal.addEntry",
              isEdit ? "Edit" : "Add"
            ),
          },
        ]}
        actions={[
          <Button
            key="cancel"
            variant="outline"
            onClick={() =>
              navigate(isEdit ? `${ROUTE_BASE}/${id}` : ROUTE_BASE)
            }
            disabled={loading}
          >
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>,
          !readOnly ? (
            <Button key="save" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? t("common.saving") : t("common.save")}
            </Button>
          ) : null,
        ]}
        icon={<BookOpen className="h-5 w-5" />}
      />

      <FormBody>
        {readOnly ? (
          <InlineAlert
            severity="info"
            title={t("common.status")}
            message={t(
              "journal.readOnlySystem",
              "System-generated journal entries cannot be edited here."
            )}
          />
        ) : null}

        {(formError || accountsError || fetchError) && (
          <InlineAlert
            severity="error"
            title={t("common.error")}
            message={
              formError ||
              accountsErrorObj?.message ||
              fetchErrorObj?.message ||
              t("common.errorOccurred")
            }
          />
        )}

        <FormGrid>
          <FormSection
            span="full"
            icon={<BookOpen className="h-5 w-5" />}
            title={t("journal.headerInfo", "Entry details")}
            description={t(
              "journal.headerInfoSub",
              "Date, reference and memo for this journal"
            )}
          >
            <FormRow cols={3}>
              <FormDatePicker
                name="entry_date"
                label="journal.entryDate"
                value={header.entry_date}
                onChange={handleHeaderChange}
                disabled={readOnly}
              />
              <FormTextField
                name="reference"
                label="journal.reference"
                value={header.reference}
                onChange={handleHeaderChange}
                disabled={readOnly}
                fullWidth
                placeholder={t(
                  "journal.referencePlaceholder",
                  "Optional reference"
                )}
              />
              <FormTextField
                name="memo"
                label="journal.memo"
                value={header.memo}
                onChange={handleHeaderChange}
                disabled={readOnly}
                fullWidth
                placeholder={t("journal.memoPlaceholder", "Optional memo")}
              />
            </FormRow>
          </FormSection>

          <FormSection
            span="full"
            icon={<ListOrdered className="h-5 w-5" />}
            title={t("journal.lines", "Journal Lines")}
            description={t(
              "journal.linesSub",
              "Each line is either a debit or a credit — totals must balance"
            )}
            actions={
              !readOnly ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={addLine}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("journal.addLine", "Add Line")}
                </Button>
              ) : null
            }
          >
            <div className="min-w-0 space-y-3 overflow-x-auto">
              <div className="hidden min-w-[56rem] grid-cols-[minmax(12rem,1.5fr)_6.5rem_6.5rem_minmax(8rem,0.9fr)_minmax(8rem,0.9fr)_minmax(8rem,1fr)_2.5rem] gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                <span>{t("journal.account", "Account")}</span>
                <span className="text-debit">{t("journal.debit", "Debit")}</span>
                <span className="text-credit">{t("journal.credit", "Credit")}</span>
                <span>{t("journal.customer", "Customer")}</span>
                <span>{t("journal.supplier", "Supplier")}</span>
                <span>{t("journal.lineMemo", "Line memo")}</span>
                <span />
              </div>

              {lines.map((line, idx) => {
                const hasDebit = Number(line.debit_home || 0) > 0;
                const hasCredit = Number(line.credit_home || 0) > 0;

                return (
                  <div
                    key={line.key}
                    className={cn(
                      "grid min-w-[56rem] grid-cols-1 gap-2 rounded-lg border border-border/80 bg-muted/20 p-3 md:grid-cols-[minmax(12rem,1.5fr)_6.5rem_6.5rem_minmax(8rem,0.9fr)_minmax(8rem,0.9fr)_minmax(8rem,1fr)_2.5rem] md:items-end md:gap-2 md:border-0 md:bg-transparent md:p-0"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] font-medium text-muted-foreground md:hidden">
                        {t("journal.account", "Account")} {idx + 1}
                      </p>
                      <SearchableSelect
                        options={accounts}
                        value={line.account}
                        onChange={(val) =>
                          updateLine(line.key, { account: val })
                        }
                        getOptionLabel={accountLabel}
                        loading={accountsLoading}
                        disabled={readOnly}
                        placeholder="journal.account"
                        error={!line.account}
                        triggerClassName="h-10 text-sm"
                      />
                    </div>

                    <div>
                      <p className="mb-1 text-[10px] font-medium text-debit md:hidden">
                        {t("journal.debit", "Debit")}
                      </p>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.debit_home}
                        onChange={(e) => setDebit(line.key, e.target.value)}
                        disabled={readOnly || hasCredit}
                        className={cn(
                          "h-10 tabular-nums",
                          hasDebit && "border-debit/40 text-debit focus-visible:ring-debit/30"
                        )}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <p className="mb-1 text-[10px] font-medium text-credit md:hidden">
                        {t("journal.credit", "Credit")}
                      </p>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.credit_home}
                        onChange={(e) => setCredit(line.key, e.target.value)}
                        disabled={readOnly || hasDebit}
                        className={cn(
                          "h-10 tabular-nums",
                          hasCredit && "border-credit/40 text-credit focus-visible:ring-credit/30"
                        )}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] font-medium text-muted-foreground md:hidden">
                        {t("journal.customer", "Customer")}
                      </p>
                      <SearchableSelect
                        options={customers}
                        value={line.customer}
                        onChange={(val) =>
                          updateLine(line.key, {
                            customer: val,
                            supplier: val ? null : line.supplier,
                          })
                        }
                        getOptionLabel={(c) => c?.name || `#${c?.id || ""}`}
                        loading={customersLoading}
                        disabled={readOnly}
                        placeholder="journal.customer"
                        triggerClassName="h-10 text-sm"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] font-medium text-muted-foreground md:hidden">
                        {t("journal.supplier", "Supplier")}
                      </p>
                      <SearchableSelect
                        options={suppliers}
                        value={line.supplier}
                        onChange={(val) =>
                          updateLine(line.key, {
                            supplier: val,
                            customer: val ? null : line.customer,
                          })
                        }
                        getOptionLabel={(s) => s?.name || `#${s?.id || ""}`}
                        loading={suppliersLoading}
                        disabled={readOnly}
                        placeholder="journal.supplier"
                        triggerClassName="h-10 text-sm"
                      />
                    </div>

                    <div>
                      <p className="mb-1 text-[10px] font-medium text-muted-foreground md:hidden">
                        {t("journal.lineMemo", "Line memo")}
                      </p>
                      <Input
                        value={line.line_memo}
                        onChange={(e) =>
                          updateLine(line.key, { line_memo: e.target.value })
                        }
                        disabled={readOnly}
                        className="h-10"
                        placeholder="—"
                      />
                    </div>

                    <div className="flex items-end justify-end pb-0.5">
                      {!readOnly && lines.length > 2 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-destructive hover:bg-destructive/10"
                          onClick={() => removeLine(line.key)}
                          aria-label={t("common.remove")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="h-10 w-10" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-3">
              <div className="rounded-md border border-debit/20 bg-debit/8 px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-debit/80">
                  {t("journal.totalDebit", "Total debit")}
                </p>
                <p className="text-sm font-semibold tabular-nums text-debit">
                  {money(totalDebit)}
                </p>
              </div>
              <div className="rounded-md border border-credit/20 bg-credit/8 px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-credit/80">
                  {t("journal.totalCredit", "Total credit")}
                </p>
                <p className="text-sm font-semibold tabular-nums text-credit">
                  {money(totalCredit)}
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
                    ? money(totalDebit)
                    : `${money(imbalance)} ${t("journal.difference", "diff")}`}
                </p>
              </div>
            </div>
          </FormSection>
        </FormGrid>
      </FormBody>

      {!readOnly ? (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-elegant backdrop-blur md:hidden">
          <Button
            variant="outline"
            onClick={() =>
              navigate(isEdit ? `${ROUTE_BASE}/${id}` : ROUTE_BASE)
            }
            disabled={loading}
          >
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      ) : null}
    </FormShell>
  );
};

export default JournalEntryForm;
