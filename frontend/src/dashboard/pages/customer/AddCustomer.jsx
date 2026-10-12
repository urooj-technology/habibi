import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Save, X, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import useAdd from "../../../api/useAdd";
import { useAuth } from "../../../context/AuthContext";

import PageHeader from "../../../components/PageHeader";
import { FormTextField } from "../../../components/FormFields";
import { InlineAlert } from "../../../components/AlertMessage";
import {
  FormShell,
  FormBody,
  FormGrid,
  FormSection,
  FormRow,
} from "../../../components/FormShell";

const AddCustomer = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;

  const [formValues, setFormValues] = useState({
    name: "",
    contact: "",
    address: "",
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const { handleAdd, loading, error } = useAdd(
    "customers",
    token,
    "/app/contacts/customers",
    t("customer.createdSuccessfully"),
    t("customer.createdError")
  );

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
      await handleAdd(formValues);
    } catch (err) {
      console.error("Error creating customer:", err);
    }
  };

  const hasError = (field) => touched[field] && Boolean(errors[field]);
  const getErrorText = (field) => (touched[field] ? errors[field] : "");

  return (
    <FormShell>
      <PageHeader
        title={t("customer.addCustomer")}
        subtitle={t("customer.addCustomerSubtitle")}
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
          <Button key="save" onClick={handleSubmit} disabled={loading}>
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
        {error ? (
          <InlineAlert
            severity="error"
            message={error.message || t("common.errorOccurred")}
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
        <Button onClick={handleSubmit} disabled={loading}>
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

export default AddCustomer;
