import React, { useMemo, useState } from "react";
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

const amountField = () =>
  Yup.number()
    .min(0, "Min 0")
    .nullable()
    .transform((v, orig) => (orig === "" || orig == null ? null : v));

const buildPayload = (values) => ({
  product: values.product,
  quantity: values.quantity !== "" ? parseFloat(values.quantity || 0) : 0,
  buy_price: parseFloat(values.buy_price || 0),
  min_quantity: parseFloat(values.min_quantity || 0),
});

const AddInventory = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;

  const { data: productsData, isLoading: productsLoading } = useFetchObjects(
    ["products"],
    "products/?page_size=500",
    token
  );
  const products = useMemo(
    () => (Array.isArray(productsData) ? productsData : productsData?.results || []),
    [productsData]
  );

  const [selectedProduct, setSelectedProduct] = useState(null);

  const validationSchema = Yup.object({
    product: Yup.mixed().required(t("validation.required")),
    buy_price: Yup.number().min(0).required(t("validation.required")),
    quantity: amountField(),
    min_quantity: amountField(),
  });

  const { handleAdd, loading, error } = useAdd(
    "inventory",
    token,
    "/app/inventory/stock",
    t("inventory.createSuccess"),
    t("inventory.createError")
  );

  const formik = useFormik({
    initialValues: {
      product: "",
      quantity: "",
      buy_price: 0,
      min_quantity: 0,
    },
    validationSchema,
    onSubmit: (values) => {
      handleAdd(buildPayload(values));
    },
  });

  const handleProductChange = (value) => {
    setSelectedProduct(value);
    formik.setFieldValue("product", value?.id || "");
  };

  return (
    <FormShell>
      <PageHeader
        title={t("inventory.addNew")}
        subtitle={t("inventory.addSubTitle")}
        backButton="/app/inventory/stock"
        backButtonLabel={t("common.backToList")}
        actions={[
          <Button key="cancel" variant="outline" onClick={() => navigate("/app/inventory/stock")}>
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>,
          <Button key="save" onClick={formik.handleSubmit} disabled={loading || productsLoading}>
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
            title={t("inventory.addNew")}
            description={t("inventory.addSubTitle")}
          >
            <form onSubmit={formik.handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <SearchableSelect
                  options={products}
                  getOptionLabel={(option) => option.name || ""}
                  value={selectedProduct}
                  onChange={handleProductChange}
                  loading={productsLoading}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  label="inventory.product"
                  required
                  error={formik.touched.product && Boolean(formik.errors.product)}
                  helperText={formik.touched.product && formik.errors.product}
                />
                <FormTextField
                  name="quantity"
                  label={t("common.quantity", "Quantity")}
                  type="number"
                  value={formik.values.quantity}
                  onChange={formik.handleChange}
                  inputProps={{ min: 0, step: "0.01" }}
                  fullWidth
                />
                <FormTextField
                  name="buy_price"
                  label={t("inventory.buyPrice", "Buy price")}
                  type="number"
                  value={formik.values.buy_price}
                  onChange={formik.handleChange}
                  inputProps={{ min: 0, step: "0.01" }}
                  required
                  fullWidth
                />
                <FormTextField
                  name="min_quantity"
                  label={t("inventory.minQuantity", "Min quantity")}
                  type="number"
                  value={formik.values.min_quantity}
                  onChange={formik.handleChange}
                  inputProps={{ min: 0, step: "0.01" }}
                  fullWidth
                />
              </div>
            </form>
          </FormSection>
        </FormGrid>
      </FormBody>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-elegant backdrop-blur md:hidden">
        <Button variant="outline" onClick={() => navigate("/app/inventory/stock")}>
          <X className="h-4 w-4" />
          {t("common.cancel")}
        </Button>
        <Button onClick={formik.handleSubmit} disabled={loading || productsLoading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("common.save")}
        </Button>
      </div>
    </FormShell>
  );
};

export default AddInventory;
