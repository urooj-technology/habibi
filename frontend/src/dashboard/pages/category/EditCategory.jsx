import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, CircularProgress } from "@/compat/ui";
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Category as CategoryIcon,
} from "@/compat/icons";

import useFetchObject from "../../../api/useFetchObject";
import useUpdate from "../../../api/useUpdate";
import { useAuth } from "../../../context/AuthContext";

import PageHeader from "../../../components/PageHeader";
import { FormTextField } from "../../../components/FormFields";
import { InlineAlert } from "../../../components/AlertMessage";
import { FormShell, FormBody, FormGrid, FormSection } from "../../../components/FormShell";

const EditCategory = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const auth = useAuth();
  const token = auth?.user?.token;

  const [formValues, setFormValues] = useState({ name: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const {
    data: category,
    isLoading: fetchLoading,
    isError: fetchError,
  } = useFetchObject(["category", id], "category", id, token);

  const {
    handleUpdate,
    loading: updateLoading,
    error: updateError,
  } = useUpdate(
    "category",
    token,
    "/app/inventory/categories",
    t("category.updateSuccess"),
    t("category.updateError")
  );

  useEffect(() => {
    if (category) {
      setFormValues({
        name: category.name || "",
      });
    }
  }, [category]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
    setTouched({ ...touched, [name]: true });
    validateField(name, value);
  };

  const validateField = (name, value) => {
    const fieldErrors = { ...errors };
    if (name === "name") {
      if (!value) fieldErrors[name] = t("validation.required");
      else delete fieldErrors[name];
    }
    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  };

  const validateForm = () => {
    const formErrors = {};
    if (!formValues.name) formErrors.name = t("validation.required");
    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      await handleUpdate(id, formValues);
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  const hasError = (field) => touched[field] && Boolean(errors[field]);
  const getErrorText = (field) => (touched[field] ? errors[field] : "");
  const isFormValid = Object.keys(errors).length === 0;

  if (fetchLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  return (
    <FormShell>
      <PageHeader
        title={t("category.editTitle")}
        subtitle={t("category.editSubtitle")}
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
              updateLoading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <SaveIcon style={{ margin: "0px 5px" }} />
              )
            }
            onClick={handleSubmit}
            disabled={updateLoading || !isFormValid}
          >
            {t("common.save")}
          </Button>,
        ]}
        icon={<CategoryIcon />}
      />

      <FormBody>
        {(fetchError || updateError) && (
          <InlineAlert
            severity="error"
            message={
              (fetchError || updateError)?.message || t("common.errorOccurred")
            }
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
          disabled={updateLoading || !isFormValid}
          startIcon={
            updateLoading ? <CircularProgress size={18} color="inherit" /> : null
          }
        >
          {t("common.save")}
        </Button>
      </div>
    </FormShell>
  );
};

export default EditCategory;
