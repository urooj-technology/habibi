import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Save, X, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import useAdd from "../../../api/useAdd";
import useFetchObjects from "../../../api/useFetchObjects";
import { useAuth } from "../../../context/AuthContext";

import PageHeader from "../../../components/PageHeader";
import { FormTextField } from "../../../components/FormFields";
import { InlineAlert } from "../../../components/AlertMessage";
import SearchableSelect from "../../../components/SearchableSelect";
import { FormShell, FormBody, FormGrid, FormSection } from "../../../components/FormShell";

const AddProduct = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;

  const [selectedCategory, setSelectedCategory] = useState(null);

  const { data: categories = [], isLoading: categoriesLoading } =
    useFetchObjects(["categories"], "category/", token);

  const validationSchema = Yup.object({
    name: Yup.string().required(t("validation.required")),
    category: Yup.number().required(t("validation.required")),
    description: Yup.string(),
  });

  const { handleAdd, loading, error } = useAdd(
    "products",
    token,
    "/app/inventory/products",
    t("product.createSuccess"),
    t("product.createError")
  );

  const formik = useFormik({
    initialValues: {
      name: "",
      description: "",
      category: "",
    },
    validationSchema,
    onSubmit: (values) => {
      handleAdd(values);
    },
  });

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    formik.setFieldValue("category", value ? value.id : "");
  };

  return (
    <FormShell>
      <PageHeader
        title={t("product.addTitle")}
        subtitle={t("product.addSubtitle")}
        backButton="/app/inventory/products"
        backButtonLabel={t("common.backToList")}
        actions={[
          <Button key="cancel" variant="outline" onClick={() => navigate("/app/inventory/products")}>
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>,
          <Button key="save" onClick={formik.handleSubmit} disabled={loading || !formik.isValid}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("common.save")}
          </Button>,
        ]}
        icon={<Package className="h-5 w-5" />}
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
                <div className="md:col-span-2">
                  <FormTextField
                    name="description"
                    label={t("product.description")}
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    multiline
                  />
                </div>
              </div>
            </form>
          </FormSection>
        </FormGrid>
      </FormBody>
    </FormShell>
  );
};

export default AddProduct;
