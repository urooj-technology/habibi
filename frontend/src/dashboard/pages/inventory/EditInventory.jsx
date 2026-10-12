import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { FormTextField, FormSelectField, FormCurrencyField } from "../../../components/FormFields";
import { InlineAlert } from "../../../components/AlertMessage";
import { FullPageLoader } from "../../../components/LoadingScreen";
import { formatCurrency } from "../../../utils/formatters";
import SearchableSelect from "../../../components/SearchableSelect";
import { FormShell, FormBody, FormGrid, FormSection } from "../../../components/FormShell";

const CURRENCY_OPTIONS = [
  { value: "AFN", label: "AFN" },
  { value: "USD", label: "USD" },
];

const amountField = () =>
  Yup.number()
    .min(0)
    .nullable()
    .transform((v, orig) => (orig === "" || orig == null ? null : v));

const buildPayload = (values) => {
  const payload = {
    product: values.product,
    currency: values.currency,
    buy_price: parseFloat(values.buy_price || 0),
    thickness: values.thickness?.trim() || null,
    weight_amount: values.weight_amount !== "" ? parseFloat(values.weight_amount || 0) : null,
    meter_amount: values.meter_amount !== "" ? parseFloat(values.meter_amount || 0) : null,
    khada_amount: values.khada_amount !== "" ? parseFloat(values.khada_amount || 0) : null,
    grain_amount: values.grain_amount !== "" ? parseFloat(values.grain_amount || 0) : null,
    min_weight_amount: parseFloat(values.min_weight_amount || 0),
    min_meter_amount: parseFloat(values.min_meter_amount || 0),
    min_khada_amount: parseFloat(values.min_khada_amount || 0),
    min_grain_amount: parseFloat(values.min_grain_amount || 0),
  };
  return payload;
};

const fmtAmount = (val) => (val != null && val !== "" ? parseFloat(val).toFixed(2) : "—");

const InfoField = ({ label, value }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm text-foreground">{value}</p>
  </div>
);

const EditInventory = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;

  const {
    data: inventoryItem,
    isLoading: itemLoading,
    error: itemError,
  } = useFetchObject(["inventory", id], "inventory", id, token);

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
    min_weight_amount: amountField(),
    min_meter_amount: amountField(),
    min_khada_amount: amountField(),
    min_grain_amount: amountField(),
  });

  const {
    handleUpdate,
    loading: updateLoading,
    isSuccess,
    error: updateError,
  } = useUpdate("inventory", token, t("inventory.updateSuccess"), t("inventory.updateError"));

  const formik = useFormik({
    initialValues: {
      product: "",
      currency: "AFN",
      thickness: "",
      weight_amount: "",
      meter_amount: "",
      khada_amount: "",
      grain_amount: "",
      min_weight_amount: 0,
      min_meter_amount: 0,
      min_khada_amount: 0,
      min_grain_amount: 0,
      buy_price: 0,
    },
    validationSchema,
    onSubmit: (values) => {
      handleUpdate(id, buildPayload(values));
    },
    enableReinitialize: true,
  });

  useEffect(() => {
    if (isSuccess) navigate("/app/inventory/stock");
  }, [isSuccess, navigate]);

  useEffect(() => {
    if (!inventoryItem) return;
    formik.setValues({
      product: inventoryItem.product || "",
      currency: inventoryItem.currency || "AFN",
      thickness: inventoryItem.thickness || "",
      weight_amount: inventoryItem.weight_amount ?? "",
      meter_amount: inventoryItem.meter_amount ?? "",
      khada_amount: inventoryItem.khada_amount ?? "",
      grain_amount: inventoryItem.grain_amount ?? "",
      min_weight_amount: inventoryItem.min_weight_amount ?? 0,
      min_meter_amount: inventoryItem.min_meter_amount ?? 0,
      min_khada_amount: inventoryItem.min_khada_amount ?? 0,
      min_grain_amount: inventoryItem.min_grain_amount ?? 0,
      buy_price: inventoryItem.buy_price ?? 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryItem]);

  useEffect(() => {
    if (!inventoryItem || !products.length) return;
    const product =
      products.find((p) => p.id === inventoryItem.product) || inventoryItem.product_details;
    setSelectedProduct(product || null);
  }, [inventoryItem, products]);

  const handleProductChange = (value) => {
    setSelectedProduct(value);
    formik.setFieldValue("product", value?.id || "");
  };

  const productFlags = selectedProduct || inventoryItem?.product_details || {};
  const showWeight = productFlags.is_weight;
  const showMeter = productFlags.is_meter;
  const showKhada = productFlags.is_khada;
  const showGrain = productFlags.is_grain;

  if (itemLoading || productsLoading) return <FullPageLoader />;

  if (itemError) {
    return (
      <InlineAlert
        severity="error"
        message={itemError.message || t("common.errorOccurred")}
        title={t("common.error")}
      />
    );
  }

  const ccy = inventoryItem?.currency || "AFN";

  return (
    <FormShell>
      <PageHeader
        title={t("inventory.editStock")}
        subtitle={inventoryItem?.product_details?.name || t("inventory.editStockSubtitle")}
        backButton="/app/inventory/stock"
        backButtonLabel={t("common.backToList")}
        actions={[
          <Button key="cancel" variant="outline" onClick={() => navigate("/app/inventory/stock")}>
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>,
          <Button key="save" onClick={formik.handleSubmit} disabled={updateLoading}>
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
            title={t("inventory.basicInfo", "Stock details")}
            description={inventoryItem?.product_details?.name}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              <InfoField label={t("inventory.product")} value={inventoryItem?.product_details?.name || "—"} />
              <InfoField label={t("inventory.currency")} value={ccy} />
              <InfoField label={t("inventory.buyPrice", "Buy price")} value={formatCurrency(inventoryItem?.buy_price, ccy)} />
              {showWeight && <InfoField label={t("inventory.weightAmount")} value={fmtAmount(inventoryItem?.weight_amount)} />}
              {showMeter && <InfoField label={t("inventory.meterAmount")} value={fmtAmount(inventoryItem?.meter_amount)} />}
              {showKhada && <InfoField label={t("inventory.khadaAmount")} value={fmtAmount(inventoryItem?.khada_amount)} />}
              {showGrain && <InfoField label={t("inventory.grainAmount")} value={fmtAmount(inventoryItem?.grain_amount)} />}
            </div>
          </FormSection>

          <FormSection
            span="full"
            title={t("common.edit")}
          >
            <form onSubmit={formik.handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <SearchableSelect
                  options={products}
                  getOptionLabel={(option) => option.name || ""}
                  value={selectedProduct}
                  onChange={handleProductChange}
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
              </div>
            </form>
          </FormSection>

          <FormSection
            span="full"
            title={t("inventory.lowStockMins", "Low stock alerts")}
            description={t(
              "inventory.lowStockMinsHint",
              "Notify when stock is at or below these minimums (0 = when empty)."
            )}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
              {showWeight && (
                <FormTextField
                  name="min_weight_amount"
                  label={t("inventory.minWeight", "Min weight")}
                  type="number"
                  value={formik.values.min_weight_amount}
                  onChange={formik.handleChange}
                  inputProps={{ min: 0, step: "0.01" }}
                  fullWidth
                />
              )}
              {showMeter && (
                <FormTextField
                  name="min_meter_amount"
                  label={t("inventory.minMeter", "Min meter")}
                  type="number"
                  value={formik.values.min_meter_amount}
                  onChange={formik.handleChange}
                  inputProps={{ min: 0, step: "0.01" }}
                  fullWidth
                />
              )}
              {showKhada && (
                <FormTextField
                  name="min_khada_amount"
                  label={t("inventory.minKhada", "Min khada")}
                  type="number"
                  value={formik.values.min_khada_amount}
                  onChange={formik.handleChange}
                  inputProps={{ min: 0, step: "0.01" }}
                  fullWidth
                />
              )}
              {showGrain && (
                <FormTextField
                  name="min_grain_amount"
                  label={t("inventory.minGrain", "Min dana")}
                  type="number"
                  value={formik.values.min_grain_amount}
                  onChange={formik.handleChange}
                  inputProps={{ min: 0, step: "0.01" }}
                  fullWidth
                />
              )}
            </div>
          </FormSection>
        </FormGrid>
      </FormBody>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-elegant backdrop-blur md:hidden">
        <Button variant="outline" onClick={() => navigate("/app/inventory/stock")}>
          <X className="h-4 w-4" />
          {t("common.cancel")}
        </Button>
        <Button onClick={formik.handleSubmit} disabled={updateLoading}>
          {updateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("common.save")}
        </Button>
      </div>
    </FormShell>
  );
};

export default EditInventory;
