import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Save, X, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
  const [checkboxError, setCheckboxError] = useState("");

  const validationSchema = Yup.object({
    name: Yup.string().required(t("validation.required")),
    category: Yup.number().required(t("validation.required")),
    description: Yup.string(),
    is_weight: Yup.boolean(),
    is_meter: Yup.boolean(),
    is_khada: Yup.boolean(),
    is_grain: Yup.boolean(),
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
      description: "",
      category: "",
      is_weight: false,
      is_meter: false,
      is_khada: false,
      is_grain: false,
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (checkboxError) return;
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
        description: product.description || "",
        category: product.category || "",
        is_weight: product.is_weight || false,
        is_meter: product.is_meter || false,
        is_khada: product.is_khada || false,
        is_grain: product.is_grain || false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  useEffect(() => {
    if (product && categories && categories.length > 0) {
      const categoryObject = categories.find((cat) => cat.id === product.category);
      if (categoryObject) {
        setSelectedCategory(categoryObject);
      }
    }
  }, [product, categories]);

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    formik.setFieldValue("category", value ? value.id : "");
  };

  const handleCheckboxChange = (name, checked) => {
    const currentValues = formik.values;
    let newCount = 0;

    if (name === "is_weight") newCount += checked ? 1 : 0;
    else newCount += currentValues.is_weight ? 1 : 0;

    if (name === "is_meter") newCount += checked ? 1 : 0;
    else newCount += currentValues.is_meter ? 1 : 0;

    if (name === "is_khada") newCount += checked ? 1 : 0;
    else newCount += currentValues.is_khada ? 1 : 0;

    if (name === "is_grain") newCount += checked ? 1 : 0;
    else newCount += currentValues.is_grain ? 1 : 0;

    if (newCount > 2 && checked) {
      setCheckboxError(t("validation.maxTwoOptions", "You can select maximum 2 options"));
      return;
    }
    setCheckboxError("");
    formik.setFieldValue(name, checked);
  };

  const measurementOptions = [
    { name: "is_weight", label: t("product.isWeight", "Weight") },
    { name: "is_meter", label: t("product.isMeter", "Meter") },
    { name: "is_khada", label: t("product.isKhada", "Khada") },
    { name: "is_grain", label: t("product.isGrain", "Dana") },
  ];

  if (fetchLoading) {
    return <FullPageLoader />;
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
          <Button key="save" onClick={formik.handleSubmit} disabled={updateLoading || !formik.isValid}>
            {updateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("common.save")}
          </Button>,
        ]}
        icon={<Package className="h-5 w-5" />}
      />

      <FormBody>
        {(fetchError || updateError) && (
          <InlineAlert
            severity="error"
            message={(fetchError || updateError)?.message || t("common.errorOccurred")}
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
                  required
                  fullWidth
                />
                <SearchableSelect
                  options={categories || []}
                  getOptionLabel={(option) => option.name || ""}
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  loading={categoriesLoading}
                  label="product.category"
                  required
                  error={formik.touched.category && Boolean(formik.errors.category)}
                  helperText={formik.touched.category && formik.errors.category}
                />
                <div className="md:col-span-2">
                  <FormTextField
                    name="description"
                    label={t("product.description")}
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    error={formik.touched.description && Boolean(formik.errors.description)}
                    helperText={formik.touched.description && formik.errors.description}
                    multiline
                    rows={4}
                    fullWidth
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="mb-3 border-t border-border pt-4">
                    <h3 className="mb-1 text-sm font-semibold text-foreground">{t("product.measurementType")}</h3>
                    <p className="text-xs text-muted-foreground">{t("product.selectUpToTwo")}</p>
                  </div>
                  {checkboxError && (
                    <InlineAlert severity="warning" message={checkboxError} translateMessage={false} sx={{ marginBottom: "0.75rem" }} />
                  )}
                  <div className="flex flex-wrap gap-4 sm:gap-6">
                    {measurementOptions.map((opt) => (
                      <label
                        key={opt.name}
                        htmlFor={opt.name}
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                      >
                        <Checkbox
                          id={opt.name}
                          checked={formik.values[opt.name]}
                          onCheckedChange={(checked) => handleCheckboxChange(opt.name, Boolean(checked))}
                        />
                        <Label htmlFor={opt.name} className="font-normal cursor-pointer">
                          {opt.label}
                        </Label>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </form>
          </FormSection>
        </FormGrid>
      </FormBody>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-elegant backdrop-blur md:hidden">
        <Button variant="outline" onClick={() => navigate("/app/inventory/products")}>
          <X className="h-4 w-4" />
          {t("common.cancel")}
        </Button>
        <Button onClick={formik.handleSubmit} disabled={updateLoading || !formik.isValid}>
          {updateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("common.save")}
        </Button>
      </div>
    </FormShell>
  );
};

export default EditProduct;
