import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Save, X, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import useFetchObject from "../../../api/useFetchObject";
import useUpdate from "../../../api/useUpdate";
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

const EditSupplier = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const auth = useAuth();
  const token = auth?.user?.token;

  const {
    data: supplier,
    isLoading: fetchLoading,
    isError: fetchError,
  } = useFetchObject(["supplier", id], "suppliers", id, token);

  const {
    handleUpdate,
    loading: updateLoading,
    error: updateError,
  } = useUpdate(
    "suppliers",
    token,
    "/app/contacts/suppliers",
    t("supplier.updateSuccess"),
    t("supplier.updateError")
  );

  const validationSchema = Yup.object({
    name: Yup.string().required(t("validation.required")),
    contact: Yup.string().nullable(),
    address: Yup.string().nullable(),
  });

  const formik = useFormik({
    initialValues: {
      name: "",
      contact: "",
      address: "",
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        await handleUpdate(id, values);
      } catch (error) {
        console.error("Error updating supplier:", error);
      }
    },
  });

  useEffect(() => {
    if (supplier) {
      formik.setValues({
        name: supplier.name || "",
        contact: supplier.contact || "",
        address: supplier.address || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplier]);

  if (fetchLoading) return <FullPageLoader />;

  return (
    <FormShell>
      <PageHeader
        title={t("supplier.edit")}
        subtitle={supplier?.name || t("supplier.editSubtitle")}
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
            disabled={updateLoading || !formik.isValid}
          >
            {updateLoading ? (
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
        {(fetchError || updateError) && (
          <InlineAlert
            severity="error"
            message={
              (fetchError || updateError)?.message || t("common.errorOccurred")
            }
            title={t("common.error")}
          />
        )}

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

              {(supplier?.created_at || supplier?.updated_at) && (
                <div className="mt-2 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2">
                  {supplier.created_at ? (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("common.createdAt")}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {new Date(supplier.created_at).toLocaleString()}
                      </p>
                    </div>
                  ) : null}
                  {supplier.updated_at ? (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("common.updatedAt")}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {new Date(supplier.updated_at).toLocaleString()}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
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
          disabled={updateLoading || !formik.isValid}
        >
          {updateLoading ? (
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

export default EditSupplier;
