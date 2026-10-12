import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, CircularProgress } from "@/compat/ui";
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Category as CategoryIcon,
} from "@/compat/icons";
import { FormShell, FormBody, FormGrid, FormSection } from "../../../components/FormShell";

// Custom hooks
import useAdd from "../../../api/useAdd";
import { useAuth } from "../../../context/AuthContext";

// Components
import PageHeader from "../../../components/PageHeader";
import { FormTextField } from "../../../components/FormFields";
import { InlineAlert } from "../../../components/AlertMessage";

const AddCategory = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;

  // Form state
  const [formValues, setFormValues] = useState({
    name: "",
  });

  // Form errors state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Add category hook
  const { handleAdd, loading, isSuccess, error } = useAdd(
    "category",
    token,
    "/app/inventory/categories",
    t("category.createSuccess"),
    t("category.createError")
  );

  // Handle field change
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormValues({
      ...formValues,
      [name]: value,
    });

    setTouched({
      ...touched,
      [name]: true,
    });

    // Validate field
    validateField(name, value);
  };

  // Validate a single field
  const validateField = (name, value) => {
    let fieldErrors = { ...errors };

    switch (name) {
      case "name":
        if (!value) {
          fieldErrors[name] = t("validation.required");
        } else {
          delete fieldErrors[name];
        }
        break;
      default:
        break;
    }

    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  };

  // Validate all fields
  const validateForm = () => {
    let formErrors = {};

    if (!formValues.name) {
      formErrors.name = t("validation.required");
    }

    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      console.error("Form validation failed");
      return;
    }

    try {
      await handleAdd(formValues);
    } catch (error) {
      console.error("Error creating category:", error);
    }
  };

  // Helper to check if field has error
  const hasError = (field) => touched[field] && Boolean(errors[field]);

  // Helper to get error text
  const getErrorText = (field) => (touched[field] ? errors[field] : "");

  // Check if form is valid
  const isFormValid = Object.keys(errors).length === 0;

  return (
    <FormShell>
      <PageHeader
        title={t("category.addTitle")}
        subtitle={t("category.addSubtitle")}
        backButton="/app/inventory/categories"
        backButtonLabel={t("common.backToList")}
        actions={[
          <Button
            key="cancel"
            variant="outlined"
            color="inherit"
            startIcon={<CancelIcon style={{ margin: "0px 5px" }} />}
            onClick={() => navigate("/app/inventory/categories")}
            sx={{ mr: 1 }}
          >
            {t("common.cancel")}
          </Button>,
          <Button
            key="save"
            variant="contained"
            color="primary"
            startIcon={
              loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <SaveIcon style={{ margin: "0px 5px" }} />
              )
            }
            onClick={handleSubmit}
            disabled={loading || !isFormValid}
          >
            {t("common.save")}
          </Button>,
        ]}
        icon={<CategoryIcon />}
      />

      <FormBody>
        {error && (
          <InlineAlert
            severity="error"
            message={error.message || t("common.errorOccurred")}
            title={t("common.error")}
          />
        )}

        <FormGrid>
          <FormSection
            span="full"
            icon={<CategoryIcon />}
            title={t("category.basicInfo")}
          >
            <FormTextField
              name="name"
              label={t("category.name")}
              value={formValues.name}
              onChange={handleChange}
              error={hasError("name")}
              helperText={getErrorText("name")}
              required
              fullWidth
            />
          </FormSection>
        </FormGrid>
      </FormBody>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-elegant backdrop-blur md:hidden">
        <Button
          variant="outlined"
          color="inherit"
          onClick={() => navigate("/app/inventory/categories")}
        >
          {t("common.cancel")}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={loading || !isFormValid}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {t("common.save")}
        </Button>
      </div>
    </FormShell>
  );
};

export default AddCategory;
