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
import { FormTextField, FormSelectField, FormCurrencyField } from "../../../components/FormFields";
import { InlineAlert } from "../../../components/AlertMessage";
import SearchableSelect from "../../../components/SearchableSelect";
import { FormShell, FormBody, FormGrid, FormSection } from "../../../components/FormShell";

const CURRENCY_OPTIONS = [
  { value: "AFN", label: "AFN" },
  { value: "USD", label: "USD" },
];

const amountField = () =>
  Yup.number()
    .min(0, "Min 0")
    .nullable()
    .transform((v, orig) => (orig === "" || orig == null ? null : v));

const buildPayload = (values) => {
  const payload = {
    product: values.product,
    currency: values.currency,
    buy_price: parseFloat(values.buy_price || 0),
  };
  if (values.thickness?.trim()) payload.thickness = values.thickness.trim();
  const amounts = ["weight_amount", "meter_amount", "khada_amount", "grain_amount"];
  amounts.forEach((field) => {
    const raw = values[field];
    if (raw !== "" && raw != null) payload[field] = parseFloat(raw);
  });
  return payload;
};

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
    currency: Yup.string().oneOf(["AFN", "USD"]).required(t("validation.required")),
    thickness: Yup.string().nullable(),
    buy_price: Yup.number().min(0).required(t("validation.required")),
    weight_amount: amountField(),
    meter_amount: amountField(),
    khada_amount: amountField(),
    grain_amount: amountField(),
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
      currency: "AFN",
      thickness: "",
      weight_amount: "",
      meter_amount: "",
      khada_amount: "",
      grain_amount: "",
      buy_price: 0,
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

  const showWeight = selectedProduct?.is_weight;
  const showMeter = selectedProduct?.is_meter;
  const showKhada = selectedProduct?.is_khada;
  const showGrain = selectedProduct?.is_grain;
  const hasAmountFields = showWeight || showMeter || showKhada || showGrain;

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
                <FormSelectField
                  name="currency"
                  label={t("inventory.currency")}
                  value={formik.values.currency}
                  onChange={formik.handleChange}
                  options={CURRENCY_OPTIONS}
                  required
                  fullWidth
                />
                <FormTextField
                  name="thickness"
                  label={t("inventory.thickness")}
                  value={formik.values.thickness}
                  onChange={formik.handleChange}
                  fullWidth
                />
                <FormCurrencyField
                  name="buy_price"
                  label={t("inventory.buyPrice", "Buy price")}
                  value={formik.values.buy_price}
                  onChange={formik.handleChange}
                  currencySymbol={formik.values.currency === "USD" ? "$" : "؋"}
                  required
                  fullWidth
                />
                {hasAmountFields ? (
                  <>
                    {showWeight && (
                      <FormTextField
                        name="weight_amount"
                        label={t("inventory.weightAmount")}
                        type="number"
                        value={formik.values.weight_amount}
                        onChange={formik.handleChange}
                        inputProps={{ min: 0, step: "0.01" }}
                        fullWidth
                      />
                    )}
                    {showMeter && (
                      <FormTextField
                        name="meter_amount"
                        label={t("inventory.meterAmount")}
                        type="number"
                        value={formik.values.meter_amount}
                        onChange={formik.handleChange}
                        inputProps={{ min: 0, step: "0.01" }}
                        fullWidth
                      />
                    )}
                    {showKhada && (
                      <FormTextField
                        name="khada_amount"
                        label={t("inventory.khadaAmount")}
                        type="number"
                        value={formik.values.khada_amount}
                        onChange={formik.handleChange}
                        inputProps={{ min: 0, step: "0.01" }}
                        fullWidth
                      />
                    )}
                    {showGrain && (
                      <FormTextField
                        name="grain_amount"
                        label={t("inventory.grainAmount")}
                        type="number"
                        value={formik.values.grain_amount}
                        onChange={formik.handleChange}
                        inputProps={{ min: 0, step: "0.01" }}
                        fullWidth
                      />
                    )}
                  </>
                ) : selectedProduct ? (
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">
                      {t(
                        "inventory.noAmountFields",
                        "This product has no quantity dimensions configured. Set buy price and save, or use Stock Openings to receive stock."
                      )}
                    </p>
                  </div>
                ) : null}
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
