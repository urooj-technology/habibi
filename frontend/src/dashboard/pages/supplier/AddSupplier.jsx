import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Save, X, Building2, Loader2 } from "lucide-react";
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

const AddSupplier = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;

  const validationSchema = Yup.object({
    name: Yup.string().required(t("validation.required")),
    contact: Yup.string().nullable(),
    address: Yup.string().nullable(),
  });

  const { handleAdd, loading, isSuccess, error } = useAdd(
    "suppliers",
    token,
    "/app/contacts/suppliers",
    t("supplier.addSuccess"),
    t("supplier.addError")
  );

  const formik = useFormik({
    initialValues: {
      name: "",
      contact: "",
      address: "",
    },
    validationSchema,
    onSubmit: (values) => {
      handleAdd(values);
    },
  });

  React.useEffect(() => {
    if (isSuccess) navigate("/app/contacts/suppliers");
  }, [isSuccess, navigate]);

  return (
    <FormShell>
      <PageHeader
        title={t("supplier.add")}
        subtitle={t("supplier.addSubtitle")}
        backButton="/app/contacts/suppliers"
        backButtonLabel={t("common.backToList")}
        actions={[
          <Button
            key="cancel"
            variant="outline"
            onClick={() => navigate("/app/contacts/suppliers")}
          >
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>,
          <Button
            key="save"
            onClick={formik.handleSubmit}
            disabled={loading || !formik.isValid}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t("common.save")}
          </Button>,
        ]}
        icon={<Building2 className="h-5 w-5" />}
      />

      <FormBody>
        {error ? (
          <InlineAlert
            severity="error"
            message={error.message || t("common.errorOccurred")}
            title={t("common.error")}
          />
        ) : null}

        <form onSubmit={formik.handleSubmit}>
          <FormGrid>
            <FormSection
              span="full"
              icon={<Building2 className="h-5 w-5" />}
              title={t("supplier.basicInfo")}
            >
              <FormRow cols={2}>
                <FormTextField
                  name="name"
                  label={t("supplier.name")}
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                  required
                  fullWidth
                />
                <FormTextField
                  name="contact"
                  label={t("supplier.contact")}
                  value={formik.values.contact}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.contact && Boolean(formik.errors.contact)
                  }
                  helperText={formik.touched.contact && formik.errors.contact}
                  fullWidth
                />
              </FormRow>
              <FormTextField
                name="address"
                label={t("supplier.address")}
                value={formik.values.address}
                onChange={formik.handleChange}
                fullWidth
                multiline
                rows={3}
              />
            </FormSection>
          </FormGrid>
        </form>
      </FormBody>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-elegant backdrop-blur md:hidden">
        <Button
          variant="outline"
          onClick={() => navigate("/app/contacts/suppliers")}
        >
          <X className="h-4 w-4" />
          {t("common.cancel")}
        </Button>
        <Button
          onClick={formik.handleSubmit}
          disabled={loading || !formik.isValid}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {t("common.save")}
        </Button>
      </div>
    </FormShell>
  );
};

export default AddSupplier;
