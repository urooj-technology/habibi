import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Save, X, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import useFetchObject from "../../../api/useFetchObject";
import useFetchObjects from "../../../api/useFetchObjects";
import useUpdate from "../../../api/useUpdate";
import { useAuth } from "../../../context/AuthContext";

import PageHeader from "../../../components/PageHeader";
import { FormTextField } from "../../../components/FormFields";
import { InlineAlert } from "../../../components/AlertMessage";
import { FullPageLoader } from "../../../components/LoadingScreen";
import SearchableSelect from "../../../components/SearchableSelect";
import { FormShell, FormBody, FormGrid, FormSection } from "../../../components/FormShell";

const EditProduct = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const auth = useAuth();
  const token = auth?.user?.token;

  const [selectedCategory, setSelectedCategory] = useState(null);

  const validationSchema = Yup.object({
    name: Yup.string().required(t("validation.required")),
    category: Yup.number().required(t("validation.required")),
  });

  const { data: categories = [], isLoading: categoriesLoading } =
    useFetchObjects(["categories"], "category/", token);

  const {
    data: product,
    isLoading: fetchLoading,
    isError: fetchError,
  } = useFetchObject(["product", id], "products", id, token);

  const {
    handleUpdate,
    loading: updateLoading,
    error: updateError,
  } = useUpdate(
    "products",
    token,
    "/app/inventory/products",
    t("product.updateSuccess"),
    t("product.updateError")
  );

  const formik = useFormik({
    initialValues: {
      name: "",
      category: "",
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        await handleUpdate(id, values);
      } catch (err) {
        console.error("Error updating product:", err);
      }
    },
  });

  useEffect(() => {
    if (product) {
      formik.setValues({
        name: product.name || "",
        category: product.category || "",
      });
      if (product.category_details) {
        setSelectedCategory(product.category_details);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    formik.setFieldValue("category", value ? value.id : "");
  };

  if (fetchLoading) return <FullPageLoader />;
  if (fetchError) {
    return (
      <InlineAlert
        severity="error"
        message={t("product.loadError", "Failed to load product")}
        title={t("common.error")}
      />
    );
  }

  return (
    <FormShell>
      <PageHeader
        title={t("product.editTitle")}
        subtitle={t("product.editSubtitle")}
        backButton="/app/inventory/products"
        backButtonLabel={t("common.backToList")}
        actions={[
          <Button key="cancel" variant="outline" onClick={() => navigate("/app/inventory/products")}>
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>,
          <Button
            key="save"
            onClick={formik.handleSubmit}
            disabled={updateLoading || !formik.isValid}
          >
            {updateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("common.save")}
          </Button>,
        ]}
        icon={<Package className="h-5 w-5" />}
      />

      <FormBody>
        {updateError && (
          <InlineAlert
            severity="error"
            message={updateError.message || t("common.errorOccurred")}
            title={t("common.error")}
          />
        )}

        <FormGrid>
          <FormSection
            span="full"
            icon={<Package className="h-5 w-5" />}
            title={t("product.basicInfo")}
          >
            <form onSubmit={formik.handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <FormTextField
                  name="name"
                  label={t("product.name")}
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                />
                <SearchableSelect
                  label={t("product.category")}
                  options={categories}
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  getOptionLabel={(o) => o?.name || ""}
                  loading={categoriesLoading}
                  error={formik.touched.category && Boolean(formik.errors.category)}
                  helperText={formik.touched.category && formik.errors.category}
                />
              </div>
            </form>
          </FormSection>
        </FormGrid>
      </FormBody>
    </FormShell>
  );
};

export default EditProduct;
