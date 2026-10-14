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
  Grid,
} from "@/compat/ui";
import {
  Package,
  X,
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
import ItemEntryBar, {
  PosItemsEmpty,
  PosProductCell,
  flashLineClass,
  useItemLineReveal,
} from "@/components/pos/ItemEntryBar";
import {
  calculatePricedLineTotal,
  quantityPayload,
} from "@/utils/measurementConversion";
import { formatShopMoney } from "@/config/shopConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

// Constants
const newLineId = () => Date.now() + Math.random();
const getProductName = (product) => product?.name || "";
const getProductBarcode = (product) => product?.barcode || "";

const INITIAL_SUPPLIER_FORM = {
  name: "",
  contact: "",
  address: "",
  notes: "",
};

const INITIAL_PRODUCT_FORM = {
  name: "",
  barcode: "",
  category: "",
  notes: "",
};

// Utility functions
const formatAmount = (amount) => {
  if (!amount) return "0.00";
  const parsedAmount = Number.parseFloat(amount) || 0;
  return parsedAmount.toFixed(2);
};

const createMessage = (id, message, severity) => ({ id, message, severity });

function isPurchaseDraftMeaningful(payload) {
  const fd = payload?.formData || {};
  const items = payload?.purchaseItems || [];
  if (fd.supplier) return true;
  if (fd.received_amount && Number.parseFloat(fd.received_amount) > 0) return true;
  if (fd.payment_account) return true;
  return items.some(
    (item) =>
      item.product ||
      (item.buy_price && Number.parseFloat(item.buy_price) > 0) ||
      (item.quantity && Number.parseFloat(item.quantity) > 0)
  );
}

function toPurchaseDraftSnapshot(formData, purchaseItems) {
  return {
    formData: {
      supplier: formData.supplier,
      purchase_date: formData.purchase_date,
      received_amount: formData.received_amount,
      payment_account: formData.payment_account,
    },
    // Omit derived fields so total recalcs do not look like edits
    purchaseItems: (purchaseItems || []).map(
      ({ total, isComplete, ...rest }) => rest
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
    purchase_date: new Date().toISOString().split("T")[0],
    total_amount: "0.00",
    received_amount: "0.00",
    payment_account: null,
  });

  const [purchaseItems, setPurchaseItems] = useState([]);
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
  const { data: inventory = [] } = useFetchObjects(
    ["inventory"],
    "inventory/",
    token
  );
  const stockByProduct = useMemo(() => {
    const map = new Map();
    (Array.isArray(inventory) ? inventory : inventory?.results || []).forEach((inv) => {
      map.set(Number(inv.product), Number.parseFloat(inv.quantity || 0) || 0);
    });
    return map;
  }, [inventory]);
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
    const cashBank = arr.filter((a) => a?.role === "CASH" || a?.role === "BANK");
    const afn = cashBank.filter((a) => !a?.currency || a.currency === "AFN");
    return afn.length > 0 ? afn : cashBank;
  }, [accountsData]);

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

  // No redirect here — clear draft first in the success effect, then navigate.
  const { handleAdd, loading, isSuccess, error } = useAdd(
    "purchases",
    token,
    null,
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
  const calculateItemTotal = useCallback((item) => {
    if (!item.product || !item.buy_price) return "0.00";
    return calculatePricedLineTotal(item, item.buy_price).toFixed(2);
  }, []);

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
          item.quantity &&
          Number.parseFloat(item.quantity) > 0
      ),
    [purchaseItems]
  );

  const isWalkIn = !formData.supplier;
  const prevTotalRef = useRef(totalAmount);

  // Effects
  useEffect(() => {
    setFormData((prev) => {
      const walkIn = !prev.supplier;
      const prevTotal = prevTotalRef.current;
      prevTotalRef.current = totalAmount;
      let received = prev.received_amount;
      if (walkIn) {
        received = totalAmount;
      } else {
        const tracksTotal =
          received === "" ||
          received == null ||
          Number.parseFloat(received || 0) === Number.parseFloat(prevTotal || 0);
        if (tracksTotal) received = totalAmount;
      }
      if (
        prev.total_amount === totalAmount &&
        prev.received_amount === received
      ) {
        return prev;
      }
      return {
        ...prev,
        total_amount: totalAmount,
        received_amount: received,
      };
    });
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
    if (Array.isArray(payload?.purchaseItems)) {
      setPurchaseItems(payload.purchaseItems.filter((item) => item.product));
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

  const pickProductRef = useRef(null);
  const autoAddedProductRef = useRef(null);
  useEffect(() => {
    if (productSuccess && newProductData) {
      setProductDialogOpen(false);
      setProductForm({ ...INITIAL_PRODUCT_FORM });
      refetchProducts();
      if (newProductData.id && autoAddedProductRef.current !== newProductData.id) {
        autoAddedProductRef.current = newProductData.id;
        pickProductRef.current?.(newProductData, { source: "search" });
      }
      addMessage(
        t("product.addSuccess") || "Product added successfully",
        "success"
      );
    }
  }, [productSuccess, newProductData, refetchProducts, addMessage, t]);

  // Handlers
  const updateItem = useCallback(
    (id, field, value) => {
      setPurchaseItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;

          const updatedItem = { ...item, [field]: value };

          if (
            item.product &&
            ["quantity", "buy_price"].includes(field)
          ) {
            updatedItem.total = calculateItemTotal(updatedItem);
          }

          const hasProduct = !!updatedItem.product;
          const hasQty =
            !!updatedItem.quantity &&
            Number.parseFloat(updatedItem.quantity) > 0;
          const hasPrice =
            !!updatedItem.buy_price &&
            Number.parseFloat(updatedItem.buy_price) > 0;

          updatedItem.isComplete = hasProduct && hasQty && hasPrice;

          return updatedItem;
        })
      );
    },
    [calculateItemTotal]
  );

  const entryBarRef = useRef(null);
  const purchaseItemsRef = useRef(null);
  const { flashId, revealLine } = useItemLineReveal(purchaseItemsRef);

  const pickProduct = useCallback(
    (product, { source }) => {
      const name = product?.name || "";
      const existing = purchaseItems.find((item) => item.product?.id === product.id);

      if (existing) {
        const nextQty = (Number.parseFloat(existing.quantity) || 0) + 1;
        updateItem(existing.id, "quantity", String(nextQty));
        revealLine(existing.id, source === "search" ? "quantity" : null);
        return { ok: true, tone: "info", message: t("itemEntry.increased", { name }) };
      }

      const line = {
        id: newLineId(),
        product,
        quantity: "1",
        buy_price: "",
        note: "",
        total: "0.00",
        isComplete: false,
      };
      setPurchaseItems((prev) => [...prev, line]);
      revealLine(line.id, source === "search" ? "buy_price" : null);
      return { ok: true, tone: "success", message: t("itemEntry.added", { name }) };
    },
    [purchaseItems, updateItem, revealLine, t]
  );

  pickProductRef.current = pickProduct;

  const focusEntryBar = useCallback(() => {
    entryBarRef.current?.focusBarcode();
    return true;
  }, []);

  const { containerRef: enterNavRef, onContainerKeyDownCapture } =
    useEnterNavigatesItemFields({ onEnterOnLastField: focusEntryBar });

  const setItemsContainerRef = useCallback(
    (node) => {
      purchaseItemsRef.current = node;
      enterNavRef.current = node;
    },
    [enterNavRef]
  );

  const removeItem = useCallback(
    (id) => {
      setPurchaseItems((prev) => prev.filter((item) => item.id !== id));
      addMessage(t("purchase.itemRemoved", "Item removed from the purchase"), "warning");
    },
    [addMessage, t]
  );

  const openProductDialogForBarcode = useCallback((code) => {
    setProductForm({ ...INITIAL_PRODUCT_FORM, barcode: code });
    setProductDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    setFormSubmitted(true);

    const newErrors = {};
    const validationMessages = [];

    if (completedItems.length === 0) {
      newErrors.items = true;
      validationMessages.push(
        t(
          "purchase.emptyItemsError",
          "Please add at least one item to the purchase"
        )
      );
    }

    const receivedNum = Number.parseFloat(formData.received_amount || 0) || 0;
    const totalNum = Number.parseFloat(formData.total_amount || 0) || 0;
    if (!formData.supplier && totalNum > 0 && receivedNum < totalNum) {
      newErrors.supplier = true;
      newErrors.received_amount = true;
      validationMessages.push(
        t(
          "purchase.validation.walkInMustPayFull",
          "Purchase without a supplier must be paid in full, or select a supplier for credit."
        )
      );
    }

    if (receivedNum > 0 && !formData.payment_account) {
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
        supplier: formData.supplier?.id || null,
        purchase_date: formData.purchase_date,
        total_amount: formatAmount(formData.total_amount),
        received_amount: formatAmount(
          !formData.supplier ? totalAmount : formData.received_amount
        ),
        payment_account: formData.payment_account?.id || null,
        items: completedItems.map((item) => ({
          product: item.product.id,
          ...quantityPayload(item.quantity),
          buy_price: formatAmount(item.buy_price),
          ...(item.note ? { note: item.note } : {}),
        })),
      };

      addMessage(t("purchase.savingPurchase", "Saving purchase..."), "info");
      await handleAdd(purchaseData);
    } catch (err) {
      console.error("Error submitting purchase:", err);
      addMessage(t("purchase.addError", "Error adding purchase"), "error");
    }
  }, [formData, completedItems, totalAmount, addMessage, t, handleAdd]);

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
    if (!productForm.name.trim() || !productForm.category) {
      addMessage(t("validation.required", "This field is required"), "error");
      return;
    }

    try {
      addMessage(t("common.saving", "Saving..."), "info");
      await handleAddProduct({
        name: productForm.name.trim(),
        category: productForm.category,
        barcode: productForm.barcode.trim() || null,
      });
    } catch (error) {
      console.error("Error adding product:", error);
      addMessage(t("product.addError", "Error adding product"), "error");
    }
  }, [productForm, addMessage, t, handleAddProduct]);

  const grandTotalNumeric = Number.parseFloat(totalAmount) || 0;
  const receivedNumeric = isWalkIn
    ? grandTotalNumeric
    : Number.parseFloat(formData.received_amount || 0) || 0;
  const remainingNumeric = grandTotalNumeric - receivedNumeric;

  const renderCartLine = (item) => {
    const isComplete = completedItems.includes(item);
    const lineTotal = calculateItemTotal(item);

    return (
      <PosCartLine
        key={item.id}
        data-line-id={item.id}
        complete={isComplete}
        className={cn(flashId === item.id && flashLineClass)}
      >
        <PosItemRow columns={5}>
          <PosItemCell>
            <PosField label={t("purchase.selectProduct", "Product")}>
              <PosProductCell
                name={item.product?.name}
                barcode={item.product?.barcode}
                extra={
                  stockByProduct.has(Number(item.product?.id)) ? (
                    <span className="tabular-nums">
                      {t("itemEntry.stock")}: {stockByProduct.get(Number(item.product?.id))}
                    </span>
                  ) : null
                }
              />
            </PosField>
          </PosItemCell>

          <PosItemCell>
            <PosField label={t("common.quantity", "Quantity")}>
              <Input
                data-field="quantity"
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  updateItem(item.id, "quantity", e.target.value)
                }
                placeholder="0"
                step="0.01"
                min="0"
                className={cn(posControlClass, "tabular-nums")}
              />
            </PosField>
          </PosItemCell>

          <PosItemCell>
            <PosField label={t("purchase.buyPrice", "Buy Price")}>
              <Input
                data-field="buy_price"
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
                {formatShopMoney(lineTotal)}
              </div>
            </PosField>
          </PosItemCell>

          <PosItemCell className="flex items-end justify-center pb-0.5">
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
              label={t("purchase.supplierOptional", "Supplier (optional)")}
              error={
                formSubmitted && errors.supplier
                  ? t(
                      "purchase.validation.walkInMustPayFull",
                      "Purchase without a supplier must be paid in full, or select a supplier for credit."
                    )
                  : null
              }
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <div className="min-w-0 flex-1">
                  <SearchableSelect
                    options={suppliers}
                    value={formData.supplier}
                    onChange={(newValue) =>
                      setFormData((prev) => ({
                        ...prev,
                        supplier: newValue,
                        ...(!newValue
                          ? { received_amount: totalAmount }
                          : prev.received_amount === "" ||
                              prev.received_amount == null
                            ? { received_amount: totalAmount }
                            : {}),
                      }))
                    }
                    getOptionLabel={(option) => option.name}
                    error={formSubmitted && errors.supplier}
                    clearable
                    placeholder="purchase.walkInSupplier"
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

            <PosField
              label={t("purchase.receivedAmount", "Received Amount")}
              hint={
                isWalkIn
                  ? t(
                      "purchase.walkInReceivedLocked",
                      "Purchases without a supplier are paid in full"
                    )
                  : null
              }
            >
              <Input
                type="number"
                value={isWalkIn ? totalAmount : formData.received_amount}
                onChange={(e) => {
                  if (isWalkIn) return;
                  setFormData((prev) => ({
                    ...prev,
                    received_amount: e.target.value,
                  }));
                }}
                step="0.01"
                min="0"
                max={grandTotalNumeric || undefined}
                disabled={isWalkIn}
                readOnly={isWalkIn}
                className={cn(
                  posControlClass,
                  "tabular-nums",
                  isWalkIn && "bg-muted/50 text-muted-foreground"
                )}
              />
            </PosField>

            {receivedNumeric > 0 ? (
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
            count={purchaseItems.length}
            actions={
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  setProductForm({ ...INITIAL_PRODUCT_FORM });
                  setProductDialogOpen(true);
                }}
              >
                <Boxes className="h-3.5 w-3.5" />
                {t("purchase.addProduct", "Add Product")}
              </Button>
            }
          >
            <ItemEntryBar
              ref={entryBarRef}
              options={products ?? []}
              getName={getProductName}
              getBarcode={getProductBarcode}
              renderMeta={(product) =>
                stockByProduct.has(Number(product.id))
                  ? `${t("itemEntry.stock")}: ${stockByProduct.get(Number(product.id))}`
                  : null
              }
              isInList={(product) =>
                purchaseItems.some((item) => item.product?.id === product.id)
              }
              onPick={pickProduct}
              onBarcodeNotFound={openProductDialogForBarcode}
            />
            <div
              ref={setItemsContainerRef}
              onKeyDownCapture={onContainerKeyDownCapture}
              className="min-w-0"
            >
              {purchaseItems.length === 0 ? (
                <PosItemsEmpty />
              ) : (
                purchaseItems.map(renderCartLine)
              )}
            </div>
          </PosItems>
        </PosMain>

        <PosSummary title={t("purchase.purchaseSummary", "Summary")}>
          <PosTotalRow
            label={t("purchase.total", "Total")}
            value={formatShopMoney(totalAmount)}
            emphasize
          />
          <PosTotalRow
            label={t("purchase.receivedAmount", "Received Amount")}
            value={formatShopMoney(receivedNumeric)}
          />
          <PosTotalRow
            label={t("purchase.remainingAmount", "Remaining Amount")}
            value={formatShopMoney(remainingNumeric)}
          />

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
              <TextField
                label={t("product.barcode") || "Barcode"}
                fullWidth
                value={productForm.barcode}
                placeholder={t("product.barcodePlaceholder")}
                helperText={t("product.barcodeHint")}
                onChange={(e) =>
                  setProductForm((prev) => ({ ...prev, barcode: e.target.value }))
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
