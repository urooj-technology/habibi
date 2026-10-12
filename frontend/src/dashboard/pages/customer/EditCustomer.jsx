import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Save, X, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import useUpdate from "../../../api/useUpdate";
import useFetchObject from "../../../api/useFetchObject";
import { useAuth } from "../../../context/AuthContext";

import PageHeader from "../../../components/PageHeader";
import { FormTextField } from "../../../components/FormFields";
import { InlineAlert } from "../../../components/AlertMessage";
import { FullPageLoader } from "../../../components/LoadingScreen";
import {
  FormShell,
  FormBody,
  FormGrid,
  FormSection,
  FormRow,
} from "../../../components/FormShell";

const EditCustomer = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const auth = useAuth();
  const token = auth?.user?.token;

  const [formValues, setFormValues] = useState({
    name: "",
    contact: "",
    address: "",
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const {
    data: customer,
    isLoading: isLoadingCustomer,
    error: customerError,
  } = useFetchObject(["customer", id], "customers", id, token);

  const { handleUpdate, loading, error: updateError } = useUpdate(
    "customers",
    token,
    "/app/contacts/customers",
    t("customer.updateSuccess"),
    t("customer.updateError")
  );

  useEffect(() => {
    if (customer) {
      setFormValues({
        name: customer.name || "",
        contact: customer.contact || "",
        address: customer.address || "",
      });
      setErrors({});
      setTouched({});
    }
  }, [customer]);

  const validateField = (name, value) => {
    const next = { ...errors };
    if (name === "name") {
      if (!value) next.name = t("validation.required");
      else if (value.length < 2) next.name = t("validation.minLength", { count: 2 });
      else if (value.length > 100) next.name = t("validation.maxLength", { count: 100 });
      else delete next.name;
    }
    if (name === "contact") {
      if (value && !/^[0-9+\-\s]{7,20}$/.test(value)) {
        next.contact = t("validation.invalidPhone");
      } else delete next.contact;
    }
    setErrors(next);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, value);
  };

  const validateForm = () => {
    const formErrors = {};
    if (!formValues.name) formErrors.name = t("validation.required");
    else if (formValues.name.length < 2)
      formErrors.name = t("validation.minLength", { count: 2 });
    else if (formValues.name.length > 100)
      formErrors.name = t("validation.maxLength", { count: 100 });
    if (formValues.contact && !/^[0-9+\-\s]{7,20}$/.test(formValues.contact)) {
      formErrors.contact = t("validation.invalidPhone");
    }
    setErrors(formErrors);
    setTouched({ name: true, contact: true, address: true });
    return Object.keys(formErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      await handleUpdate(id, formValues);
    } catch (err) {
      console.error("Error updating customer:", err);
    }
  };

  const hasError = (field) => touched[field] && Boolean(errors[field]);
  const getErrorText = (field) => (touched[field] ? errors[field] : "");

  if (isLoadingCustomer) return <FullPageLoader />;

  if (customerError) {
    return (
      <FormShell>
        <InlineAlert
          severity="error"
          title={t("common.error")}
          message={t("customer.fetchError")}
        />
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={() => navigate("/app/contacts/customers")}
          >
            <X className="h-4 w-4" />
            {t("common.backToList")}
          </Button>
        </div>
      </FormShell>
    );
  }

  return (
    <FormShell>
      <PageHeader
        title={t("customer.editCustomer")}
        subtitle={customer?.name || `${t("customer.id")}: ${id}`}
        backButton="/app/contacts/customers"
        backButtonLabel={t("common.backToList")}
        actions={[
          <Button
            key="cancel"
            variant="outline"
            onClick={() => navigate("/app/contacts/customers")}
          >
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>,
          <Button
            key="save"
            onClick={handleSubmit}
            disabled={loading || Object.keys(errors).length > 0}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading ? t("common.saving") : t("common.save")}
          </Button>,
        ]}
        icon={<User className="h-5 w-5" />}
      />

      <FormBody>
        {updateError ? (
          <InlineAlert
            severity="error"
            message={updateError.message || t("common.errorOccurred")}
            title={t("common.error")}
          />
        ) : null}

        <FormGrid>
          <FormSection
            span="full"
            icon={<User className="h-5 w-5" />}
            title={t("customer.basicInfo")}
          >
            <FormRow cols={2}>
              <FormTextField
                name="name"
                label={t("customer.name")}
                value={formValues.name}
                onChange={handleChange}
                error={hasError("name")}
                helperText={getErrorText("name")}
                required
                fullWidth
                placeholder={t("customer.namePlaceholder")}
              />
              <FormTextField
                name="contact"
                label={t("customer.contact")}
                value={formValues.contact}
                onChange={handleChange}
                error={hasError("contact")}
                helperText={getErrorText("contact")}
                fullWidth
                placeholder={t("customer.contactPlaceholder")}
              />
            </FormRow>
            <FormTextField
              name="address"
              label={t("customer.address")}
              value={formValues.address}
              onChange={handleChange}
              error={hasError("address")}
              helperText={getErrorText("address")}
              fullWidth
              multiline
              rows={3}
              placeholder={t("customer.addressPlaceholder")}
            />

            {(customer?.created_at || customer?.updated_at) && (
              <div className="mt-2 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2">
                {customer.created_at ? (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("common.createdAt")}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">
                      {new Date(customer.created_at).toLocaleString()}
                    </p>
                  </div>
                ) : null}
                {customer.updated_at ? (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("common.updatedAt")}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">
                      {new Date(customer.updated_at).toLocaleString()}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </FormSection>
        </FormGrid>
      </FormBody>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-elegant backdrop-blur md:hidden">
        <Button
          variant="outline"
          onClick={() => navigate("/app/contacts/customers")}
        >
          <X className="h-4 w-4" />
          {t("common.cancel")}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || Object.keys(errors).length > 0}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {loading ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </FormShell>
  );
};

export default EditCustomer;
