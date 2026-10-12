import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Save,
  X,
  Scale,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { openingBalanceConfig } from "./extendedConfigs";

const money = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const OpeningBalanceForm = ({ config = openingBalanceConfig }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const auth = useAuth();
  const token = auth?.user?.token;
  const hydratedRef = useRef(false);

  const {
    i18nPrefix,
    apiPath,
    routeBase,
    breadcrumbs,
    workflowI18nPrefix = "extendedWorkflow",
  } = config;

  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    account: null,
    debit_amount: "",
    credit_amount: "",
    memo: "",
  });
  const [formError, setFormError] = useState("");

  const { data: doc, isLoading: fetchLoading } = useFetchObject(
    [apiPath, id],
    apiPath,
    id,
    token
  );

  const { data: accountsData, isLoading: accountsLoading } = useFetchObjects(
    ["gl-accounts-opening"],
    "accounting/accounts/?page_size=500",
    token
  );
  const accounts = useMemo(() => {
    const list = Array.isArray(accountsData)
      ? accountsData
      : accountsData?.results || [];
    return list.filter((a) => a?.is_active !== false);
  }, [accountsData]);

  const accountsById = useMemo(() => {
    const m = new Map();
    for (const a of accounts) m.set(Number(a.id), a);
    return m;
  }, [accounts]);

  const { handleAdd, loading: addLoading } = useAdd(
    apiPath,
    token,
    routeBase,
    t(`${i18nPrefix}.createSuccess`),
    t(`${i18nPrefix}.createError`)
  );

  const { handleUpdate, loading: updateLoading } = useUpdate(
    apiPath,
    token,
    routeBase,
    t(`${i18nPrefix}.updateSuccess`),
    t(`${i18nPrefix}.updateError`)
  );

  useEffect(() => {
    if (!doc || !isEdit || hydratedRef.current) return;
    const accountId = doc.account?.id ?? doc.account;
    setForm({
      entry_date: doc.entry_date || new Date().toISOString().split("T")[0],
      account: accountId
        ? accountsById.get(Number(accountId)) || { id: accountId }
        : null,
      debit_amount:
        doc.debit_amount != null && Number(doc.debit_amount) !== 0
          ? String(doc.debit_amount)
          : "",
      credit_amount:
        doc.credit_amount != null && Number(doc.credit_amount) !== 0
          ? String(doc.credit_amount)
          : "",
      memo: doc.memo || "",
    });
    hydratedRef.current = true;
  }, [doc, isEdit, accountsById]);

  useEffect(() => {
    if (!hydratedRef.current || !form.account) return;
    const resolved = accountsById.get(Number(form.account.id ?? form.account));
    if (resolved && resolved !== form.account) {
      setForm((prev) => ({ ...prev, account: resolved }));
    }
  }, [accountsById, form.account]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "debit_amount" && Number(value) > 0) {
        next.credit_amount = "";
      }
      if (name === "credit_amount" && Number(value) > 0) {
        next.debit_amount = "";
      }
      return next;
    });
    if (formError) setFormError("");
  };

  const debit = Number(form.debit_amount || 0);
  const credit = Number(form.credit_amount || 0);
  const hasAmount = debit > 0 || credit > 0;
  const bothSides = debit > 0 && credit > 0;

  const validate = () => {
    if (!form.entry_date) return t("validation.required");
    if (!form.account?.id) {
      return t(
        `${i18nPrefix}.accountRequired`,
        "Select a GL account for this opening balance."
      );
    }
    if (!hasAmount) {
      return t(
        `${i18nPrefix}.amountRequired`,
        "Enter a debit or credit amount greater than zero."
      );
    }
    if (bothSides) {
      return t(
        `${i18nPrefix}.oneSideOnly`,
        "Use either debit or credit — not both."
      );
    }
    return "";
  };

  const buildPayload = () => ({
    entry_date: form.entry_date,
    account: form.account.id,
    debit_amount: debit > 0 ? String(debit) : "0",
    credit_amount: credit > 0 ? String(credit) : "0",
    memo: form.memo || "",
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
  const readOnly = isEdit && doc?.status && doc.status !== "DRAFT";
  const accountLabel = (a) =>
    a ? `${a.code || ""} — ${a.name || `#${a.id}`}` : "";

  if (isEdit && fetchLoading) {
    return <FullPageLoader message="common.loading" />;
  }

  return (
    <FormShell>
      <PageHeader
        title={t(isEdit ? `${i18nPrefix}.editTitle` : `${i18nPrefix}.addTitle`)}
        subtitle={t(
          isEdit ? `${i18nPrefix}.editSubtitle` : `${i18nPrefix}.addSubtitle`
        )}
        backButton={routeBase}
        backButtonLabel={t("common.backToList")}
        breadcrumbs={breadcrumbs.map((b) => ({ ...b, label: t(b.label) }))}
        actions={[
          <Button
            key="cancel"
            variant="outline"
            onClick={() => navigate(routeBase)}
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
      />

      <FormBody>
        {readOnly ? (
          <InlineAlert
            severity="info"
            title={t("common.status")}
            message={t(`${workflowI18nPrefix}.readOnlyPosted`)}
          />
        ) : null}

        {formError ? (
          <InlineAlert
            severity="error"
            title={t("common.error")}
            message={formError}
          />
        ) : null}

        <FormGrid>
          <FormSection
            span="full"
            icon={<Scale className="h-5 w-5" />}
            title={t(`${i18nPrefix}.headerInfo`)}
            description={t(
              `${i18nPrefix}.headerInfoSub`,
              "Enter debit or credit only — the system offsets Opening Balance Equity automatically"
            )}
          >
            <FormRow cols={2}>
              <FormDatePicker
                name="entry_date"
                label={`${i18nPrefix}.entry_date`}
                value={form.entry_date}
                onChange={handleChange}
                disabled={readOnly}
                required
              />
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label>
                  {t(`${i18nPrefix}.account`)}
                  <span className="ms-0.5 text-destructive">*</span>
                </Label>
                <SearchableSelect
                  options={accounts}
                  value={form.account}
                  onChange={(val) => {
                    setForm((prev) => ({ ...prev, account: val }));
                    if (formError) setFormError("");
                  }}
                  getOptionLabel={accountLabel}
                  loading={accountsLoading}
                  disabled={readOnly}
                  placeholder={`${i18nPrefix}.account`}
                  error={!form.account}
                  triggerClassName="h-10 text-sm"
                />
              </div>
            </FormRow>

            <FormRow cols={2}>
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor="ob-debit" className="text-debit">
                  {t("accounting.totalDebit", "Debit")}
                </Label>
                <Input
                  id="ob-debit"
                  type="number"
                  min="0"
                  step="0.01"
                  name="debit_amount"
                  value={form.debit_amount}
                  onChange={handleChange}
                  disabled={readOnly || credit > 0}
                  className={cn(
                    "h-10 tabular-nums",
                    debit > 0 && "border-debit/40 text-debit focus-visible:ring-debit/30"
                  )}
                  placeholder="0.00"
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor="ob-credit" className="text-credit">
                  {t("accounting.totalCredit", "Credit")}
                </Label>
                <Input
                  id="ob-credit"
                  type="number"
                  min="0"
                  step="0.01"
                  name="credit_amount"
                  value={form.credit_amount}
                  onChange={handleChange}
                  disabled={readOnly || debit > 0}
                  className={cn(
                    "h-10 tabular-nums",
                    credit > 0 && "border-credit/40 text-credit focus-visible:ring-credit/30"
                  )}
                  placeholder="0.00"
                />
              </div>
            </FormRow>

            <FormTextField
              name="memo"
              label={`${i18nPrefix}.memo`}
              value={form.memo}
              onChange={handleChange}
              disabled={readOnly}
              fullWidth
              multiline
              rows={2}
              placeholder={t(
                `${i18nPrefix}.memoPlaceholder`,
                "Optional note for this opening entry"
              )}
            />

            <div className="grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-3">
              <div className="rounded-md border border-debit/20 bg-debit/8 px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-debit/80">
                  {t("accounting.totalDebit", "Debit")}
                </p>
                <p className="text-sm font-semibold tabular-nums text-debit">
                  {money(debit)}
                </p>
              </div>
              <div className="rounded-md border border-credit/20 bg-credit/8 px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-credit/80">
                  {t("accounting.totalCredit", "Credit")}
                </p>
                <p className="text-sm font-semibold tabular-nums text-credit">
                  {money(credit)}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-md px-3 py-2",
                  hasAmount && !bothSides
                    ? "bg-primary/10"
                    : "bg-muted/40"
                )}
              >
                <p
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wide",
                    hasAmount && !bothSides
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {t(`${i18nPrefix}.side`, "Side")}
                </p>
                <p
                  className={cn(
                    "text-base font-bold tabular-nums",
                    hasAmount && !bothSides
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {debit > 0
                    ? t("journal.debit", "Debit")
                    : credit > 0
                      ? t("journal.credit", "Credit")
                      : "—"}
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
            onClick={() => navigate(routeBase)}
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

export default OpeningBalanceForm;
