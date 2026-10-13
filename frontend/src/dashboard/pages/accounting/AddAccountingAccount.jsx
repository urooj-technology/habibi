import React, { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Save, X, Landmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../../context/AuthContext";
import useAdd from "../../../api/useAdd";
import useFetchObjects from "../../../api/useFetchObjects";

import PageHeader from "../../../components/PageHeader";
import { FormTextField, FormSelectField } from "../../../components/FormFields";
import { InlineAlert } from "../../../components/AlertMessage";
import { FormShell, FormBody, FormGrid, FormSection, FormRow } from "../../../components/FormShell";
import { ACCOUNT_TYPES, ROLE_OPTIONS } from "./accountFormOptions";

const AddAccountingAccount = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;

  const {
    data: accountsResp,
    isError: accountsError,
    error: accountsErrorObj,
  } = useFetchObjects(
    ["accounting-accounts-parent"],
    "accounting/accounts/?page_size=500",
    token
  );

  const parentOptions = useMemo(() => {
    if (!accountsResp) return [];
    return Array.isArray(accountsResp) ? accountsResp : accountsResp.results || [];
  }, [accountsResp]);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    currency: "AFN",
    account_type: "ASSET",
    role: "",
    parent: null,
    is_active: true,
    notes: "",
  });
  const [showErrors, setShowErrors] = useState(false);

  const { handleAdd, loading } = useAdd(
    "accounting/accounts",
    token,
    "/app/accounting/accounts",
    t("accounting.accountAddSuccess", "Account added successfully"),
    t("accounting.accountAddError", "Error adding account")
  );

  const addAccountPayload = useMemo(() => {
    return {
      code: formData.code.trim(),
      name: formData.name.trim(),
      currency: "AFN",
      account_type: formData.account_type,
      role: formData.role || "",
      parent: formData.parent,
      is_active: formData.is_active,
      notes: formData.notes || "",
    };
  }, [formData]);

  const validate = useCallback(() => {
    const errors = [];
    if (!addAccountPayload.code) {
      errors.push(t("accounting.validation.codeRequired"));
    }
    if (!addAccountPayload.name) {
      errors.push(t("accounting.validation.nameRequired"));
    }
    if (!addAccountPayload.account_type) {
      errors.push(t("accounting.validation.accountTypeRequired"));
    }
    return errors;
  }, [addAccountPayload, t]);

  const onSubmit = useCallback(async () => {
    setShowErrors(true);
    const errors = validate();
    if (errors.length > 0) return;
    handleAdd(addAccountPayload);
  }, [validate, handleAdd, addAccountPayload]);

  const errors = showErrors ? validate() : [];
  const parentSelectOptions = [
    { value: "", label: "common.none" },
    ...parentOptions.map((acc) => ({
      value: String(acc.id),
      label: `${acc.code} - ${acc.name}`,
      customLabel: `${acc.code} - ${acc.name}`,
    })),
  ];

  return (
    <FormShell>
      <PageHeader
        title={t("accounting.addAccount", "Add Account")}
        subtitle={t(
          "accounting.formSubtitle",
          "Create a chart of accounts entry"
        )}
        backButton="/app/accounting/accounts"
        backButtonLabel={t("common.backToList", "Back to list")}
        icon={<Landmark className="h-5 w-5" />}
        actions={[
          <Button
            key="cancel"
            variant="outline"
            onClick={() => navigate("/app/accounting/accounts")}
          >
            <X className="h-4 w-4" />
            {t("common.cancel", "Cancel")}
          </Button>,
          <Button key="save" onClick={onSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {loading ? t("api.creating", "Creating...") : t("common.save", "Save")}
          </Button>,
        ]}
      />

      <FormBody>
        {accountsError ? (
          <InlineAlert
            severity="warning"
            title={t("common.warning", "Warning")}
            message={accountsErrorObj?.message || t("common.errorOccurred")}
          />
        ) : null}
        {errors.length > 0 ? (
          <InlineAlert
            severity="error"
            title={t("common.validationError", "Validation error")}
            message={errors.join(", ")}
          />
        ) : null}

        <FormGrid>
          <FormSection
            span="full"
            icon={<Landmark className="h-5 w-5" />}
            title={t("accounting.accountDetails", "Account details")}
            description={t(
              "accounting.formSubtitle",
              "Create a chart of accounts entry"
            )}
          >
            <FormRow cols={2}>
              <FormTextField
                name="code"
                label="accounting.code"
                value={formData.code}
                onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
                required
                fullWidth
              />
              <FormTextField
                name="name"
                label="accounting.name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                required
                fullWidth
              />
            </FormRow>
            <FormRow cols={2}>
              <FormSelectField
                name="account_type"
                label="accounting.accountType"
                value={formData.account_type}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, account_type: e.target.value }))
                }
                options={ACCOUNT_TYPES}
                required
              />
              <FormSelectField
                name="role"
                label="accounting.role"
                value={formData.role}
                onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
                options={ROLE_OPTIONS}
              />
            </FormRow>
            <FormRow cols={2}>
              <FormSelectField
                name="parent"
                label="accounting.parent"
                value={formData.parent == null ? "" : String(formData.parent)}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData((p) => ({ ...p, parent: v === "" ? null : Number(v) }));
                }}
                options={parentSelectOptions}
              />
              <FormSelectField
                name="is_active"
                label="common.status"
                value={formData.is_active ? "active" : "inactive"}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    is_active: e.target.value === "active",
                  }))
                }
                options={[
                  { value: "active", label: "common.active" },
                  { value: "inactive", label: "common.inactive" },
                ]}
              />
            </FormRow>
            <FormTextField
              name="notes"
              label="accounting.notes"
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
              multiline
              rows={3}
              fullWidth
            />
          </FormSection>
        </FormGrid>
      </FormBody>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-elegant backdrop-blur md:hidden">
        <Button variant="outline" onClick={() => navigate("/app/accounting/accounts")}>
          <X className="h-4 w-4" />
          {t("common.cancel", "Cancel")}
        </Button>
        <Button onClick={onSubmit} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {loading ? t("api.creating", "Creating...") : t("common.save", "Save")}
        </Button>
      </div>
    </FormShell>
  );
};

export default AddAccountingAccount;
