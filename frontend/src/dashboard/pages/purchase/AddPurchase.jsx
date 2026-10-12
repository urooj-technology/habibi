import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Autocomplete,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Typography,
  Grid,
} from "@/compat/ui";
import {
  Package,
  X,
  Plus,
  Trash2,
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Building2,
  Boxes,
} from "lucide-react";

import useAdd from "../../../api/useAdd";
import useFetchObjects from "../../../api/useFetchObjects";
import { useAuth } from "../../../context/AuthContext";
import { useEnterNavigatesItemFields } from "../../../hooks/useEnterNavigatesItemFields";
import useFormDraft from "../../../hooks/useFormDraft";
import FormDraftBanner from "../../../components/FormDraftBanner";
import {
  PosShell,
  PosHeader,
  PosBody,
  PosMain,
  PosDocBar,
  PosItems,
  PosSummary,
  PosField,
  PosTotalRow,
  PosCartLine,
  PosItemRow,
  PosItemCell,
  posControlClass,
} from "@/components/pos/PosShell";
import SearchableSelect from "@/components/SearchableSelect";
import PricingBaseSelect from "@/components/pos/PricingBaseSelect";
import {
  calculatePricedLineTotal,
  defaultPricingBase,
  getSelectedUnits,
} from "@/utils/measurementConversion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

// Constants
const INITIAL_ITEM = {
  id: Date.now(),
  product: null,
  weight_amount: "",
  meter_amount: "",
  khada_amount: "",
  grain_amount: "",
  thickness: "",
  buy_price: "",
  pricing_base: "",
  total: "0.00",
  isComplete: false,
};

const INITIAL_SUPPLIER_FORM = {
  name: "",
  contact: "",
  address: "",
  notes: "",
};

const INITIAL_PRODUCT_FORM = {
  name: "",
  category: "",
  is_weight: false,
  is_meter: false,
  is_khada: false,
  is_grain: false,
  notes: "",
};

// Utility functions
const formatAmount = (amount) => {
  if (!amount) return "0.00";
  const parsedAmount = Number.parseFloat(amount) || 0;
  return parsedAmount.toFixed(2);
};

const createMessage = (id, message, severity) => ({ id, message, severity });

const QTY_FIELDS = ["weight_amount", "meter_amount", "khada_amount", "grain_amount"];

function isPurchaseDraftMeaningful(payload) {
  const fd = payload?.formData || {};
  const items = payload?.purchaseItems || [];
  if (fd.supplier) return true;
  if (fd.received_amount && Number.parseFloat(fd.received_amount) > 0) return true;
  if (fd.payment_account) return true;
  if (fd.currency === "AFN" && fd.exchange_rate) return true;
  return items.some(
    (item) =>
      item.product ||
      (item.buy_price && Number.parseFloat(item.buy_price) > 0) ||
      item.thickness?.trim?.() ||
      item.thickness ||
      QTY_FIELDS.some((f) => item[f] && Number.parseFloat(item[f]) > 0)
  );
}

function toPurchaseDraftSnapshot(formData, purchaseItems) {
  return {
    formData: {
      supplier: formData.supplier,
      currency: formData.currency,
      exchange_rate: formData.exchange_rate,
      purchase_date: formData.purchase_date,
      received_amount: formData.received_amount,
      payment_account: formData.payment_account,
    },
    // Omit derived fields so currency/total recalcs do not look like edits
    purchaseItems: (purchaseItems || []).map(
      ({ usd_buy_price, total, isComplete, ...rest }) => rest
    ),
  };
}

const InlineMessage = ({ message, severity, onClose }) => {
  const iconMap = {
    error: <XCircle className="h-4 w-4 shrink-0 text-destructive" />,
    warning: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />,
    info: <Info className="h-4 w-4 shrink-0 text-primary" />,
    success: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />,
  };
  const toneMap = {
    error: "border-destructive/30 bg-destructive/10 text-destructive",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-800",
    info: "border-primary/30 bg-primary/10 text-primary",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800",
  };

  return (
    <div
      className={`mb-2 flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-sm ${toneMap[severity] || toneMap.info}`}
    >
      {iconMap[severity] || iconMap.info}
      <span className="min-w-0 flex-1">{message}</span>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
};

const AddPurchase = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;

  // Form state
  const [formData, setFormData] = useState({
    supplier: null,
    currency: "USD",
    exchange_rate: "",
    purchase_date: new Date().toISOString().split("T")[0],
    total_amount: "0.00",
    received_amount: "0.00",
    payment_account: null,
  });

  const [purchaseItems, setPurchaseItems] = useState([{ ...INITIAL_ITEM }]);
  const [errors, setErrors] = useState({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [messages, setMessages] = useState([]);

  // Dialog states
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    ...INITIAL_SUPPLIER_FORM,
  });
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productForm, setProductForm] = useState({ ...INITIAL_PRODUCT_FORM });

  // Fetch data
  const { data: suppliers = [], refetch: refetchSuppliers } = useFetchObjects(
    ["suppliers"],
    "suppliers/",
    token
  );
  const { data: products = [], refetch: refetchProducts } = useFetchObjects(
    ["products"],
    "products/",
    token
  );
  const { data: categories = [] } = useFetchObjects(
    ["categories"],
    "category/",
    token
  );

  const { data: accountsData = [] } = useFetchObjects(
    ["accounting-accounts"],
    "accounting/accounts/?page_size=500",
    token
  );
  const cashBankAccounts = useMemo(() => {
    const arr = Array.isArray(accountsData) ? accountsData : accountsData?.results || [];
    return arr.filter(
      (a) =>
        (a?.role === "CASH" || a?.role === "BANK") &&
        (!formData.currency || a?.currency === formData.currency)
    );
  }, [accountsData, formData.currency]);

  // API hooks
  const {
    handleAdd: handleAddSupplier,
    loading: supplierLoading,
    isSuccess: supplierSuccess,
    responseData: newSupplierData,
  } = useAdd(
    "suppliers",
    token,
    "",
    t("supplier.addSuccess") || "Supplier added successfully",
    t("supplier.addError") || "Error adding supplier"
  );

  const {
    handleAdd: handleAddProduct,
    loading: productLoading,
    isSuccess: productSuccess,
    responseData: newProductData,
  } = useAdd(
    "products",
    token,
    "",
    t("product.addSuccess") || "Product added successfully",
    t("product.addError") || "Error adding product"
  );

  const { handleAdd, loading, isSuccess, error } = useAdd(
    "purchases",
    token,
    "/app/purchases",
    t("purchase.addSuccess") || "Purchase added successfully",
    t("purchase.addError") || "Error adding purchase"
  );

  // Message management
  const addMessage = useCallback((message, severity = "info") => {
    const id = Date.now();
    setMessages((prev) => [...prev, createMessage(id, message, severity)]);
    setTimeout(
      () => setMessages((prev) => prev.filter((msg) => msg.id !== id)),
      5000
    );
  }, []);

  const removeMessage = useCallback((id) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  // Memoized calculations
  const getActiveMeasurementFields = useCallback(
    (product) => {
      if (!product) return [];
      const fields = [];
      if (product.is_weight)
        fields.push({
          name: "weight_amount",
          label: t("purchase.kgAmount", "Weight Amount"),
          unit: "kg",
        });
      if (product.is_meter)
        fields.push({
          name: "meter_amount",
          label: t("purchase.meterAmount", "Meter Amount"),
          unit: "m",
        });
      if (product.is_khada)
        fields.push({
          name: "khada_amount",
          label: t("purchase.khadaAmount", "Khada Amount"),
          unit: "pcs",
        });
      if (product.is_grain)
        fields.push({
          name: "grain_amount",
          label: t("purchase.grainAmount", "Dana amount"),
          unit: "pcs",
        });
      return fields;
    },
    [t]
  );

  // Updated calculation logic based on product fields
  const calculateItemTotal = useCallback((item) => {
    if (!item.product || !item.buy_price) return "0.00";
    const base = defaultPricingBase(item.product, item.pricing_base);
    return calculatePricedLineTotal(item, item.buy_price, base).toFixed(2);
  }, []);

  const calculateUSDPrices = useCallback(
    (afnPrice) => {
      const exchangeRate = Number.parseFloat(formData.exchange_rate) || 1;
      if (exchangeRate <= 0 || !afnPrice) return "";
      const priceValue = Number.parseFloat(afnPrice) || 0;
      return priceValue > 0 ? (priceValue / exchangeRate).toFixed(2) : "";
    },
    [formData.exchange_rate]
  );

  const calculateAFNEquivalent = useCallback(
    (usdAmount) => {
      const exchangeRate = Number.parseFloat(formData.exchange_rate) || 0;
      const value = Number.parseFloat(usdAmount) || 0;
      if (exchangeRate <= 0 || value <= 0) return "";
      return (value * exchangeRate).toFixed(2);
    },
    [formData.exchange_rate]
  );

  const totalAmount = useMemo(() => {
    const total = purchaseItems.reduce(
      (sum, item) => sum + Number.parseFloat(calculateItemTotal(item)),
      0
    );
    return total.toFixed(2);
  }, [purchaseItems, calculateItemTotal]);

  const completedItems = useMemo(
    () =>
      purchaseItems.filter(
        (item) =>
          item.product &&
          item.buy_price &&
          Number.parseFloat(item.buy_price) > 0 &&
          getActiveMeasurementFields(item.product).some(
            (f) => item[f.name] && Number.parseFloat(item[f.name]) > 0
          )
      ),
    [purchaseItems, getActiveMeasurementFields]
  );

  // Effects
  useEffect(() => {
    setFormData((prev) => ({ ...prev, total_amount: totalAmount }));
  }, [totalAmount]);

  const draftData = useMemo(
    () => toPurchaseDraftSnapshot(formData, purchaseItems),
    [formData, purchaseItems]
  );

  const onRestoreDraft = useCallback((payload) => {
    if (payload?.formData) {
      setFormData((prev) => ({
        ...prev,
        ...payload.formData,
        total_amount: prev.total_amount,
      }));
    }
    if (Array.isArray(payload?.purchaseItems) && payload.purchaseItems.length > 0) {
      setPurchaseItems(payload.purchaseItems);
    }
  }, []);

  const {
    draftPrompt,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useFormDraft({
    key: "purchase-add",
    data: draftData,
    isMeaningful: isPurchaseDraftMeaningful,
    onRestore: onRestoreDraft,
  });

  useEffect(() => {
    if (isSuccess) {
      clearDraft();
      addMessage(
        t("purchase.addSuccess") || "Purchase added successfully",
        "success"
      );
      setTimeout(() => navigate("/app/purchases"), 1000);
    }
  }, [isSuccess, navigate, addMessage, t, clearDraft]);

  useEffect(() => {
    if (supplierSuccess && newSupplierData) {
      setSupplierDialogOpen(false);
      setSupplierForm({ ...INITIAL_SUPPLIER_FORM });
      setFormData((prev) => ({ ...prev, supplier: newSupplierData }));
      refetchSuppliers();
      addMessage(
        t("supplier.addSuccess") || "Supplier added successfully",
        "success"
      );
    }
  }, [supplierSuccess, newSupplierData, refetchSuppliers, addMessage, t]);

  useEffect(() => {
    if (productSuccess && newProductData) {
      setProductDialogOpen(false);
      setProductForm({ ...INITIAL_PRODUCT_FORM });
      refetchProducts();
      addMessage(
        t("product.addSuccess") || "Product added successfully",
        "success"
      );
    }
  }, [productSuccess, newProductData, refetchProducts, addMessage, t]);

  // Currency exchange effect + safe price conversion when switching currencies
  const prevCurrencyRef = useRef(formData.currency);
  useEffect(() => {
    const prevCurrency = prevCurrencyRef.current;
    prevCurrencyRef.current = formData.currency;

    const rate = Number.parseFloat(formData.exchange_rate) || 0;

    // Convert existing line prices when user switches currency
    if (prevCurrency !== formData.currency && rate > 0) {
      if (prevCurrency === "AFN" && formData.currency === "USD") {
        setPurchaseItems((prev) =>
          prev.map((item) => {
            const price = Number.parseFloat(item.buy_price);
            if (!price || isNaN(price)) return { ...item, usd_buy_price: "" };
            const usd = (price / rate).toFixed(2);
            return { ...item, buy_price: usd, usd_buy_price: "" };
          })
        );
        return;
      }
      if (prevCurrency === "USD" && formData.currency === "AFN") {
        setPurchaseItems((prev) =>
          prev.map((item) => {
            const price = Number.parseFloat(item.buy_price);
            if (!price || isNaN(price)) return { ...item, usd_buy_price: "" };
            const afn = (price * rate).toFixed(2);
            return { ...item, buy_price: afn, usd_buy_price: calculateUSDPrices(afn) };
          })
        );
        return;
      }
    }

    if (formData.currency === "USD") {
      setPurchaseItems((prev) => prev.map((item) => ({ ...item, usd_buy_price: "" })));
      return;
    }

    setPurchaseItems((prev) =>
      prev.map((item) => ({
        ...item,
        usd_buy_price: item.buy_price ? calculateUSDPrices(item.buy_price) : "",
      }))
    );
  }, [formData.currency, formData.exchange_rate, calculateUSDPrices]);

  // Handlers
  const updateItem = useCallback(
    (id, field, value) => {
      setPurchaseItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;

          const updatedItem = { ...item, [field]: value };

          // Calculate USD price for AFN currency
          if (formData.currency === "AFN" && field === "buy_price") {
            updatedItem.usd_buy_price = calculateUSDPrices(value);
          }

          // Calculate total
          if (
            item.product &&
            [
              "weight_amount",
              "meter_amount",
              "khada_amount",
              "grain_amount",
              "buy_price",
              "pricing_base",
            ].includes(field)
          ) {
            updatedItem.total = calculateItemTotal(updatedItem);
          }

          // Check completion
          const hasProduct = !!updatedItem.product;
          const hasMeasurement =
            !!updatedItem.weight_amount ||
            !!updatedItem.meter_amount ||
            !!updatedItem.grain_amount ||
            !!updatedItem.khada_amount;
          const hasPrice =
            !!updatedItem.buy_price &&
            Number.parseFloat(updatedItem.buy_price) > 0;

          updatedItem.isComplete = hasProduct && hasMeasurement && hasPrice;

          return updatedItem;
        })
      );
    },
    [formData.currency, calculateUSDPrices, calculateItemTotal]
  );

  const addNewItem = useCallback(() => {
    setPurchaseItems((prev) => [
      ...prev,
      { ...INITIAL_ITEM, id: Date.now() + Math.random() },
    ]);
    addMessage(
      t("purchase.newItemAdded", "New item added to the purchase"),
      "info"
    );
  }, [addMessage, t]);

  const { containerRef: purchaseItemFieldsRef, onContainerKeyDownCapture } =
    useEnterNavigatesItemFields({ onEnterOnLastField: addNewItem });

  const removeItem = useCallback(
    (id) => {
      setPurchaseItems((prev) => {
        const filtered = prev.filter((item) => item.id !== id);
        const result =
          filtered.length === 0
            ? [{ ...INITIAL_ITEM, id: Date.now() }]
            : filtered;

        if (filtered.length > 0) {
          addMessage(
            t("purchase.itemRemoved", "Item removed from the purchase"),
            "warning"
          );
        }

        return result;
      });
    },
    [addMessage, t]
  );

  const handleProductChange = useCallback(
    (id, newValue) => {
      setPurchaseItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                product: newValue,
                weight_amount: "",
                meter_amount: "",
                khada_amount: "",
                grain_amount: "",
                thickness: "",
                pricing_base: newValue ? defaultPricingBase(newValue) : "",
                total: "0.00",
              }
            : item
        )
      );

      if (newValue) {
        addMessage(
          t("purchase.productSelected", `Product "${newValue.name}" selected`),
          "success"
        );
      }
    },
    [addMessage, t]
  );

  const handleSubmit = useCallback(async () => {
    setFormSubmitted(true);

    const newErrors = {};
    const validationMessages = [];

    if (!formData.supplier) {
      newErrors.supplier = true;
      validationMessages.push(
        t("purchase.supplierRequired", "Supplier is required")
      );
    }

    if (completedItems.length === 0) {
      newErrors.items = true;
      validationMessages.push(
        t(
          "purchase.emptyItemsError",
          "Please add at least one item to the purchase"
        )
      );
    }

    if (!formData.exchange_rate) {
      newErrors.exchange_rate = true;
      validationMessages.push(
        t("purchase.exchangeRate", "Exchange Rate") +
          " " +
          t("validation.required", "is required")
      );
    }

    if (
      Number.parseFloat(formData.received_amount || 0) > 0 &&
      !formData.payment_account
    ) {
      newErrors.payment_account = true;
      validationMessages.push(
        t("purchase.paymentAccountRequired", "Cash/Bank account is required")
      );
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addMessage(validationMessages.join(", "), "error");
      return;
    }

    try {
      const purchaseData = {
        supplier: formData.supplier?.id,
        currency: formData.currency,
        purchase_date: formData.purchase_date,
        total_amount: formatAmount(formData.total_amount),
        received_amount: formatAmount(formData.received_amount),
        payment_account: formData.payment_account?.id || null,
        exchange_rate: formatAmount(formData.exchange_rate),
        items: completedItems.map((item) => ({
          product: item.product.id,
          weight_amount: formatAmount(item.weight_amount),
          meter_amount: formatAmount(item.meter_amount),
          khada_amount: formatAmount(item.khada_amount),
          grain_amount: formatAmount(item.grain_amount),
          thickness: formatAmount(item.thickness),
          buy_price: formatAmount(item.buy_price),
          pricing_base:
            defaultPricingBase(item.product, item.pricing_base) || null,
        })),
      };

      addMessage(t("purchase.savingPurchase", "Saving purchase..."), "info");
      await handleAdd(purchaseData);
    } catch (err) {
      console.error("Error submitting purchase:", err);
      addMessage(t("purchase.addError", "Error adding purchase"), "error");
    }
  }, [formSubmitted, formData, completedItems, addMessage, t, handleAdd]);

  const handleSupplierSubmit = useCallback(async () => {
    if (!supplierForm.name.trim() || !supplierForm.contact.trim()) {
      addMessage(t("validation.required", "This field is required"), "error");
      return;
    }

    try {
      const supplierData = {
        ...supplierForm,
        status: "ACTIVE",
        type: "BUSINESS",
      };

      addMessage(t("common.saving", "Saving"), "info");
      await handleAddSupplier(supplierData);
    } catch (error) {
      console.error("Error adding supplier:", error);
      addMessage(t("supplier.addError", "Error adding supplier"), "error");
    }
  }, [supplierForm, addMessage, t, handleAddSupplier]);

  const handleProductSubmit = useCallback(async () => {
    const measurementSelected =
      productForm.is_weight ||
      productForm.is_meter ||
      productForm.is_khada ||
      productForm.is_grain;

    if (
      !productForm.name.trim() ||
      !productForm.category ||
      !measurementSelected
    ) {
      addMessage(t("validation.required", "This field is required"), "error");
      return;
    }

    try {
      addMessage(t("common.saving", "Saving..."), "info");
      await handleAddProduct(productForm);
    } catch (error) {
      console.error("Error adding product:", error);
      addMessage(t("product.addError", "Error adding product"), "error");
    }
  }, [productForm, addMessage, t, handleAddProduct]);

  const receivedNumeric = Number.parseFloat(formData.received_amount || 0) || 0;
  const remainingNumeric =
    Number.parseFloat(totalAmount) - receivedNumeric;

  const renderCartLine = (item) => {
    const measurementFields = getActiveMeasurementFields(item.product);
    const isComplete = completedItems.includes(item);
    const lineTotal = calculateItemTotal(item);
    const hasProduct = !!item.product;
    const dualUnits = getSelectedUnits(item.product || {}).length >= 2;
    const columns =
      1 +
      (hasProduct ? measurementFields.length + 1 + (dualUnits ? 1 : 0) : 0) +
      2 +
      1;

    return (
      <PosCartLine key={item.id} complete={isComplete}>
        <PosItemRow columns={columns}>
          <PosItemCell>
            <PosField label={t("purchase.selectProduct", "Product")}>
              <SearchableSelect
                options={products ?? []}
                value={item.product}
                onChange={(newValue) => handleProductChange(item.id, newValue)}
                getOptionLabel={(option) => option.name || ""}
                placeholder="purchase.selectProduct"
              />
            </PosField>
          </PosItemCell>

          {hasProduct
            ? measurementFields.map((field) => (
                <PosItemCell key={field.name}>
                  <PosField label={`${field.label} (${field.unit})`}>
                    <Input
                      type="number"
                      value={item[field.name]}
                      onChange={(e) =>
                        updateItem(item.id, field.name, e.target.value)
                      }
                      placeholder="0"
                      step={
                        field.name === "khada_amount" ||
                        field.name === "grain_amount"
                          ? "1"
                          : "0.01"
                      }
                      min="0"
                      className={cn(posControlClass, "tabular-nums")}
                    />
                  </PosField>
                </PosItemCell>
              ))
            : null}

          {hasProduct ? (
            <PosItemCell>
              <PosField label={t("purchase.thickness", "Thick (mm)")}>
                <Input
                  type="number"
                  value={item.thickness}
                  onChange={(e) =>
                    updateItem(item.id, "thickness", e.target.value)
                  }
                  placeholder="0"
                  step="0.01"
                  min="0"
                  className={cn(posControlClass, "tabular-nums")}
                />
              </PosField>
            </PosItemCell>
          ) : null}

          {hasProduct && dualUnits ? (
            <PosItemCell>
              <PricingBaseSelect
                product={item.product}
                value={defaultPricingBase(item.product, item.pricing_base)}
                onChange={(v) => updateItem(item.id, "pricing_base", v)}
              />
            </PosItemCell>
          ) : null}

          <PosItemCell>
            <PosField
              label={`${t("purchase.buyPrice", "Buy Price")} (${formData.currency})`}
              hint={
                formData.currency === "AFN" && item.usd_buy_price
                  ? `USD: ${item.usd_buy_price}`
                  : null
              }
            >
              <Input
                type="number"
                value={item.buy_price}
                onChange={(e) =>
                  updateItem(item.id, "buy_price", e.target.value)
                }
                placeholder="0.00"
                step="0.01"
                min="0"
                className={cn(posControlClass, "tabular-nums")}
              />
            </PosField>
          </PosItemCell>

          <PosItemCell>
            <PosField label={t("common.total", "Total")}>
              <div
                className={cn(
                  "flex h-8 items-center truncate rounded-md border border-transparent bg-muted/40 px-2 text-xs font-bold tabular-nums",
                  isComplete ? "text-primary" : "text-muted-foreground"
                )}
              >
                {lineTotal}
              </div>
            </PosField>
          </PosItemCell>

          <PosItemCell className="flex items-end justify-center pb-0.5">
            {purchaseItems.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                onClick={() => removeItem(item.id)}
                aria-label={t("common.delete", "Delete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <div className="h-8 w-8" />
            )}
          </PosItemCell>
        </PosItemRow>
      </PosCartLine>
    );
  };


  return (
    <PosShell>
      <PosHeader
        icon={<Package className="h-4 w-4" />}
        title={t("purchase.addNew", "New Purchase")}
        subtitle={t(
          "purchase.registerNewPurchase",
          "Register New Purchase from Supplier"
        )}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => navigate("/app/purchases")}
            >
              <X className="h-3.5 w-3.5" />
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={handleSubmit}
              disabled={loading || completedItems.length === 0}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {loading
                ? t("common.saving") || "Saving..."
                : `${t("purchase.completePurchase", "Complete Purchase")} (${
                    completedItems.length
                  })`}
            </Button>
          </>
        }
      />

      {draftPrompt ? (
        <FormDraftBanner
          savedAt={draftPrompt.savedAt}
          onRestore={restoreDraft}
          onDiscard={discardDraft}
        />
      ) : null}

      {error ? (
        <Alert variant="error" className="py-2">
          <AlertDescription className="text-xs">
            {error.message || t("purchase.addError", "Error adding purchase")}
          </AlertDescription>
        </Alert>
      ) : null}

      {formSubmitted && Object.keys(errors).length > 0 ? (
        <Alert variant="warning" className="py-2">
          <AlertDescription className="text-xs">
            {t("validation.required", "Please complete all required fields")}
          </AlertDescription>
        </Alert>
      ) : null}

      {messages.length > 0 ? (
        <div className="min-w-0 space-y-1">
          {messages.map((msg) => (
            <InlineMessage
              key={msg.id}
              message={msg.message}
              severity={msg.severity}
              onClose={() => removeMessage(msg.id)}
            />
          ))}
        </div>
      ) : null}

      <PosBody>
        <PosMain>
          <PosDocBar
            title={t("purchase.purchaseDetails", "Purchase details")}
          >
            <PosField
              label={t("purchase.supplier", "Supplier")}
              required
              error={
                formSubmitted && errors.supplier
                  ? t("purchase.supplierRequired", "Supplier is required")
                  : null
              }
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <div className="min-w-0 flex-1">
                  <SearchableSelect
                    options={suppliers}
                    value={formData.supplier}
                    onChange={(newValue) =>
                      setFormData((prev) => ({ ...prev, supplier: newValue }))
                    }
                    getOptionLabel={(option) => option.name}
                    error={formSubmitted && errors.supplier}
                    placeholder="purchase.supplier"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setSupplierDialogOpen(true)}
                  aria-label={t("purchase.addSupplier", "Add Supplier")}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </PosField>

            <PosField label={t("purchase.purchaseDate", "Purchase Date")}>
              <Input
                type="date"
                name="purchase_date"
                value={formData.purchase_date || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    purchase_date: e.target.value,
                  }))
                }
                className={posControlClass}
              />
            </PosField>

            <PosField label={t("purchase.currency", "Currency")}>
              <Select
                value={formData.currency}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, currency: value }))
                }
              >
                <SelectTrigger className={posControlClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AFN">AFN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </PosField>

            <PosField
              label={t("purchase.exchangeRate", "Exchange Rate")}
              required
              error={
                formSubmitted && errors.exchange_rate
                  ? t("validation.required", "This field is required")
                  : null
              }
            >
              <Input
                type="number"
                value={formData.exchange_rate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    exchange_rate: e.target.value,
                  }))
                }
                step="0.01"
                min="0.01"
                placeholder={t(
                  "purchase.exchangeRateHint",
                  "AFN per 1 USD (inventory posts in USD)"
                )}
                className={cn(posControlClass, "tabular-nums")}
              />
            </PosField>

            <PosField label={t("purchase.receivedAmount", "Received Amount")}>
              <Input
                type="number"
                value={formData.received_amount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    received_amount: e.target.value,
                  }))
                }
                step="0.01"
                min="0"
                className={cn(posControlClass, "tabular-nums")}
              />
            </PosField>

            {Number.parseFloat(formData.received_amount || 0) > 0 ? (
              <PosField
                label={t("purchase.paymentAccount", "Cash/Bank Account")}
                required
                error={
                  formSubmitted && errors.payment_account
                    ? t(
                        "purchase.paymentAccountRequired",
                        "Cash/Bank account is required"
                      )
                    : null
                }
              >
                <SearchableSelect
                  options={cashBankAccounts}
                  value={formData.payment_account}
                  onChange={(newValue) =>
                    setFormData((prev) => ({
                      ...prev,
                      payment_account: newValue,
                    }))
                  }
                  getOptionLabel={(o) => (o ? `${o.code} — ${o.name}` : "")}
                  error={formSubmitted && errors.payment_account}
                  placeholder="purchase.paymentAccount"
                />
              </PosField>
            ) : null}
          </PosDocBar>

          <PosItems
            title={t("purchase.purchaseItems", "Items")}
            count={completedItems.length}
            actions={
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setProductDialogOpen(true)}
                >
                  <Boxes className="h-3.5 w-3.5" />
                  {t("purchase.addProduct", "Add Product")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={addNewItem}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("purchase.addItem", "Add Item")}
                </Button>
              </div>
            }
          >
            <div
              ref={purchaseItemFieldsRef}
              onKeyDownCapture={onContainerKeyDownCapture}
              className="min-w-0"
            >
              {purchaseItems.map(renderCartLine)}
            </div>
          </PosItems>
        </PosMain>

        <PosSummary title={t("purchase.purchaseSummary", "Summary")}>
          <PosTotalRow
            label={t("purchase.total", "Total")}
            value={`${formData.currency} ${totalAmount}`}
            emphasize
          />
          <PosTotalRow
            label={t("purchase.receivedAmount", "Received Amount")}
            value={`${formData.currency} ${receivedNumeric.toFixed(2)}`}
          />
          <PosTotalRow
            label={t("purchase.remainingAmount", "Remaining Amount")}
            value={`${formData.currency} ${remainingNumeric.toFixed(2)}`}
          />
          {formData.currency === "AFN" && formData.exchange_rate ? (
            <PosTotalRow
              label="USD Equivalent"
              value={`USD ${(
                Number.parseFloat(totalAmount) /
                Number.parseFloat(formData.exchange_rate)
              ).toFixed(2)}`}
              muted
            />
          ) : null}
          {formData.currency === "USD" && formData.exchange_rate ? (
            <PosTotalRow
              label="AFN Equivalent"
              value={`AFN ${calculateAFNEquivalent(totalAmount) || "-"}`}
              muted
            />
          ) : null}

          <Button
            type="button"
            className="mt-1 h-9 w-full text-sm"
            onClick={handleSubmit}
            disabled={loading || completedItems.length === 0}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {loading
              ? t("common.saving") || "Saving..."
              : t("purchase.completePurchase", "Complete Purchase")}
          </Button>
        </PosSummary>
      </PosBody>

      {/* Supplier Dialog */}
      <Dialog
        open={supplierDialogOpen}
        onClose={() => setSupplierDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("purchase.addSupplier") || "Add Supplier"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label={t("supplier.name") || "Supplier Name"}
                fullWidth
                required
                value={supplierForm.name}
                onChange={(e) =>
                  setSupplierForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={t("supplier.contact") || "Contact"}
                fullWidth
                required
                value={supplierForm.contact}
                onChange={(e) =>
                  setSupplierForm((prev) => ({
                    ...prev,
                    contact: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={t("supplier.address") || "Address"}
                fullWidth
                multiline
                rows={2}
                value={supplierForm.address}
                onChange={(e) =>
                  setSupplierForm((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={t("supplier.notes") || "Notes"}
                fullWidth
                multiline
                rows={2}
                value={supplierForm.notes}
                onChange={(e) =>
                  setSupplierForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSupplierDialogOpen(false)}
          >
            {t("common.cancel") || "Cancel"}
          </Button>
          <Button
            type="button"
            onClick={handleSupplierSubmit}
            disabled={supplierLoading}
          >
            {supplierLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
            {supplierLoading
              ? t("common.saving") || "Saving..."
              : t("purchase.addSupplier") || "Add Supplier"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Product Dialog */}
      <Dialog
        open={productDialogOpen}
        onClose={() => setProductDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("purchase.addProduct") || "Add Product"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label={t("product.name") || "Product Name"}
                fullWidth
                required
                value={productForm.name}
                onChange={(e) =>
                  setProductForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                options={categories}
                getOptionLabel={(option) => option.name || ""}
                value={
                  categories?.find((cat) => cat.id === productForm.category) ||
                  null
                }
                onChange={(_, newValue) => {
                  setProductForm((prev) => ({
                    ...prev,
                    category: newValue ? newValue.id : "",
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("product.category") || "Category"}
                    required
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                {t("product.measurementTypes") || "Measurement Types"} (
                {t("product.selectUpToTwo") || "Select up to two"})
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={productForm.is_weight}
                        onChange={(e) => {
                          const currentSelected = Object.entries(
                            productForm
                          ).filter(
                            ([key, val]) => key.startsWith("is_") && val
                          ).length;
                          if (e.target.checked && currentSelected >= 2) {
                            addMessage(
                              t("purchase.maxTwoMeasurements") ||
                                "Select up to two measurement types",
                              "warning"
                            );
                            return;
                          }
                          setProductForm((prev) => ({
                            ...prev,
                            is_weight: e.target.checked,
                          }));
                        }}
                        name="is_weight"
                      />
                    }
                    label={t("product.kg") || "Weight"}
                  />
                </Grid>
                <Grid item xs={4}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={productForm.is_meter}
                        onChange={(e) => {
                          const currentSelected = Object.entries(
                            productForm
                          ).filter(
                            ([key, val]) => key.startsWith("is_") && val
                          ).length;
                          if (e.target.checked && currentSelected >= 2) {
                            addMessage(
                              t("purchase.maxTwoMeasurements") ||
                                "Select up to two measurement types",
                              "warning"
                            );
                            return;
                          }
                          setProductForm((prev) => ({
                            ...prev,
                            is_meter: e.target.checked,
                          }));
                        }}
                        name="is_meter"
                      />
                    }
                    label={t("product.meter") || "Meter"}
                  />
                </Grid>
                <Grid item xs={4}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={productForm.is_khada}
                        onChange={(e) => {
                          const currentSelected = Object.entries(
                            productForm
                          ).filter(
                            ([key, val]) => key.startsWith("is_") && val
                          ).length;
                          if (e.target.checked && currentSelected >= 2) {
                            addMessage(
                              t("purchase.maxTwoMeasurements") ||
                                "Select up to two measurement types",
                              "warning"
                            );
                            return;
                          }
                          setProductForm((prev) => ({
                            ...prev,
                            is_khada: e.target.checked,
                          }));
                        }}
                        name="is_khada"
                      />
                    }
                    label={t("product.khada") || "Khada"}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={t("product.notes") || "Notes"}
                fullWidth
                multiline
                rows={2}
                value={productForm.notes}
                onChange={(e) =>
                  setProductForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            type="button"
            variant="outline"
            onClick={() => setProductDialogOpen(false)}
          >
            {t("common.cancel") || "Cancel"}
          </Button>
          <Button
            type="button"
            onClick={handleProductSubmit}
            disabled={productLoading}
          >
            {productLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Boxes className="h-4 w-4" />
            )}
            {productLoading
              ? t("common.saving") || "Saving..."
              : t("purchase.addProduct") || "Add Product"}
          </Button>
        </DialogActions>
      </Dialog>
    </PosShell>
  );
};

export default AddPurchase;
