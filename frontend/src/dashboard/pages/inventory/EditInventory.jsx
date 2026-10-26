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
import { FormTextField } from "../../../components/FormFields";
import { InlineAlert } from "../../../components/AlertMessage";
import { FullPageLoader } from "../../../components/LoadingScreen";
import { formatShopMoney } from "@/config/shopConfig";
import SearchableSelect from "../../../components/SearchableSelect";
import { FormShell, FormBody, FormGrid, FormSection } from "../../../components/FormShell";

const amountField = () =>
  Yup.number()
    .min(0)
    .nullable()
    .transform((v, orig) => (orig === "" || orig == null ? null : v));

const buildPayload = (values) => ({
  product: values.product,
  quantity: values.quantity !== "" ? parseFloat(values.quantity || 0) : 0,
  buy_price: parseFloat(values.buy_price || 0),
  sell_price: parseFloat(values.sell_price || 0),
  min_quantity: parseFloat(values.min_quantity || 0),
});

const fmtAmount = (val) =>
  val != null && val !== "" ? parseFloat(val).toFixed(2) : "—";

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
    quantity: amountField(),
    buy_price: Yup.number().min(0).required(t("validation.required")),
    min_quantity: amountField(),
  });

  const { handleUpdate, loading: updateLoading } = useUpdate(
    "inventory",
    token,
    "/app/inventory/stock",
    t("inventory.updateSuccess"),
    t("inventory.updateError")
  );

  const formik = useFormik({
    initialValues: {
      product: "",
      quantity: "",
      buy_price: 0,
      sell_price: 0,
      min_quantity: 0,
    },
    validationSchema,
    onSubmit: (values) => {
      handleUpdate(id, buildPayload(values));
    },
    enableReinitialize: true,
  });

  useEffect(() => {
    if (!inventoryItem) return;
    formik.setValues({
      product: inventoryItem.product || "",
      quantity: inventoryItem.quantity ?? "",
      buy_price: inventoryItem.buy_price ?? 0,
      sell_price: inventoryItem.sell_price ?? 0,
      min_quantity: inventoryItem.min_quantity ?? 0,
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
        <FormGrid>
          <FormSection
            span="full"
            icon={<Package className="h-5 w-5" />}
            title={t("inventory.basicInfo", "Stock details")}
            description={inventoryItem?.product_details?.name}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              <InfoField
                label={t("inventory.product")}
                value={inventoryItem?.product_details?.name || "—"}
              />
              <InfoField
                label={t("common.quantity", "Quantity")}
                value={fmtAmount(inventoryItem?.quantity)}
              />
              <InfoField
                label={t("inventory.buyPrice", "Buy price")}
                value={formatShopMoney(inventoryItem?.buy_price)}
              />
              <InfoField
                label={t("pricing.sellPrice")}
                value={formatShopMoney(inventoryItem?.sell_price)}
              />
            </div>
          </FormSection>

          <FormSection span="full" title={t("common.edit")}>
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
                  name="sell_price"
                  label={t("pricing.sellPrice")}
                  type="number"
                  value={formik.values.sell_price}
                  onChange={formik.handleChange}
                  inputProps={{ min: 0, step: "0.01" }}
                  fullWidth
                  helperText={t("pricing.sellPriceHint")}
                />
                <FormTextField
                  name="min_quantity"
                  label={t("inventory.minQuantity", "Min quantity")}
                  type="number"
                  value={formik.values.min_quantity}
                  onChange={formik.handleChange}
                  inputProps={{ min: 0, step: "0.01" }}
                  fullWidth
                  helperText={t(
                    "inventory.lowStockMinsHint",
                    "Notify when stock is at or below this minimum (0 = when empty)."
                  )}
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
        <Button onClick={formik.handleSubmit} disabled={updateLoading}>
          {updateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("common.save")}
        </Button>
      </div>
    </FormShell>
  );
};

export default EditInventory;
