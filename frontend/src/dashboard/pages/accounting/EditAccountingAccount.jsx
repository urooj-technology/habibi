import React, { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Save, X, Landmark, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../../context/AuthContext";
import useFetchObject from "../../../api/useFetchObject";
import useUpdate from "../../../api/useUpdate";
import useDelete from "../../../api/useDelete";

import useFetchObjects from "../../../api/useFetchObjects";
import PageHeader from "../../../components/PageHeader";
import { FormTextField, FormSelectField } from "../../../components/FormFields";
import { InlineAlert } from "../../../components/AlertMessage";
import { FullPageLoader } from "../../../components/LoadingScreen";
import { FormShell, FormBody, FormGrid, FormSection, FormRow } from "../../../components/FormShell";
import { ACCOUNT_TYPES, ROLE_OPTIONS } from "./accountFormOptions";

const EditAccountingAccount = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const auth = useAuth();
  const token = auth?.user?.token;

  const { data: account, isLoading, isError, error } = useFetchObject(
    "accounting-account",
    "accounting/accounts/",
    id,
    token
  );

  const {
    data: accountsResp,
    isLoading: parentLoading,
    isError: parentError,
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

  React.useEffect(() => {
    if (!account) return;
    setFormData({
      code: account.code || "",
      name: account.name || "",
      currency: account.currency || "AFN",
      account_type: account.account_type || "ASSET",
      role: account.role || "",
      parent: account.parent ?? null,
      is_active: account.is_active ?? true,
      notes: account.notes || "",
    });
  }, [account]);

  const { handleUpdate, loading } = useUpdate(
    "accounting/accounts",
    token,
    "/app/accounting/accounts",
    t("accounting.accountUpdateSuccess", "Account updated"),
    t("accounting.accountUpdateError", "Error updating account")
  );

  const { handleDelete, ConfirmDialog } = useDelete("accounting/accounts", token);

  const payload = useMemo(() => {
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
    if (!payload.code) {
      errors.push(t("accounting.validation.codeRequired"));
    }
    if (!payload.name) {
      errors.push(t("accounting.validation.nameRequired"));
    }
    if (!payload.account_type) {
      errors.push(t("accounting.validation.accountTypeRequired"));
    }
    return errors;
  }, [payload, t]);

  const submit = useCallback(() => {
    setShowErrors(true);
    const errors = validate();
    if (errors.length > 0) return;
    handleUpdate(id, payload);
  }, [validate, handleUpdate, id, payload]);

  const errors = showErrors ? validate() : [];
  const parentSelectOptions = [
    { value: "", label: "common.none" },
    ...parentOptions
      .filter((acc) => String(acc.id) !== String(id))
      .map((acc) => ({
        value: String(acc.id),
        label: `${acc.code} - ${acc.name}`,
        customLabel: `${acc.code} - ${acc.name}`,
      })),
  ];

  if (isLoading) return <FullPageLoader />;

  return (
    <FormShell>
      <PageHeader
        title={t("accounting.editAccount", "Edit Account")}
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
          <Button key="save" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {loading ? t("api.updating", "Updating...") : t("common.save", "Save")}
          </Button>,
        ]}
      />

      <FormBody>
        {isError ? (
          <InlineAlert
            severity="error"
            title={t("common.error", "Error")}
            message={error?.message || t("common.errorOccurred")}
          />
        ) : null}
        {parentError ? (
          <InlineAlert
            severity="warning"
            title={t("common.warning", "Warning")}
            message={t("common.errorLoadingData", "Error loading data")}
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
            actions={
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(id)}
              >
                <Trash2 className="h-4 w-4" />
                {t("common.delete", "Delete")}
              </Button>
            }
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
                  setFormData((p) => ({
                    ...p,
                    parent: v === "" ? null : Number(v),
                  }));
                }}
                options={parentSelectOptions}
                disabled={parentLoading}
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

      <ConfirmDialog />

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-elegant backdrop-blur md:hidden">
        <Button variant="outline" onClick={() => navigate("/app/accounting/accounts")}>
          <X className="h-4 w-4" />
          {t("common.cancel", "Cancel")}
        </Button>
        <Button onClick={submit} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {loading ? t("api.updating", "Updating...") : t("common.save", "Save")}
        </Button>
      </div>
    </FormShell>
  );
};

export default EditAccountingAccount;
