import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import useFetchObject from "../../../api/useFetchObject";
import useFetchObjects from "../../../api/useFetchObjects";
import useUpdate from "../../../api/useUpdate";
import { useAuth } from "../../../context/AuthContext";
import { FullPageLoader } from "../../../components/LoadingScreen";
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
const INITIAL_ITEM = {
  id: Date.now(),
  product: null,
  quantity: "",
  buy_price: "",
  note: "",
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
  notes: "",
};

// Utility functions
const formatAmount = (amount) => {
  if (!amount) return "0.00";
  const parsedAmount = Number.parseFloat(amount) || 0;
  return parsedAmount.toFixed(2);
};

const createMessage = (id, message, severity) => ({ id, message, severity });

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

const EditPurchase = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const auth = useAuth();
  const token = auth?.user?.token;
  const hydratedRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const draftBaselineRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    supplier: null,
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

  const {
    data: purchase,
    isLoading: fetchLoading,
  } = useFetchObject(["purchase", id], "purchases", id, token);

  const { handleUpdate, loading, success } = useUpdate(
    "purchases",
    token,
    "/app/purchases",
    t("purchase.updateSuccess") || "Purchase updated successfully",
    t("purchase.updateError") || "Error updating purchase"
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

  // Effects
  useEffect(() => {
    setFormData((prev) => ({ ...prev, total_amount: totalAmount }));
  }, [totalAmount]);

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

  // Hydrate edit form once
  useEffect(() => {
    if (!purchase || hydratedRef.current || fetchLoading) return;

    const formattedDate = purchase.purchase_date
      ? new Date(purchase.purchase_date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const accounts = Array.isArray(accountsData)
      ? accountsData
      : accountsData?.results || [];

    const supplierObj =
      suppliers.find((s) => s.id === purchase.supplier) ||
      (purchase.supplier_details
        ? { id: purchase.supplier, ...purchase.supplier_details }
        : null);

    const nextFormData = {
      supplier: supplierObj,
      purchase_date: formattedDate,
      total_amount: purchase.total_amount || "0.00",
      received_amount: purchase.received_amount || "0.00",
      payment_account:
        accounts.find((a) => a.id === purchase.payment_account) || null,
    };

    let nextPurchaseItems = [{ ...INITIAL_ITEM }];
    if (purchase.purchase_items?.length) {
      nextPurchaseItems = purchase.purchase_items.map((item) => {
        const fromList = products.find((p) => p.id === item.product);
        const productObj =
          fromList ||
          (item.product_details
            ? { id: item.product, ...item.product_details }
            : null);

        const qty = item.quantity;
        const line = {
          id: item.id || Date.now() + Math.random(),
          product: productObj,
          quantity: qty != null && qty !== "" ? String(qty) : "",
          buy_price:
            item.buy_price != null && item.buy_price !== ""
              ? String(item.buy_price)
              : "",
          note: item.note || "",
          total: "0.00",
          isComplete: false,
          original_item: item,
        };
        line.total = calculateItemTotal(line);
        line.isComplete = !!(
          line.product &&
          line.buy_price &&
          Number.parseFloat(line.buy_price) > 0 &&
          line.quantity &&
          Number.parseFloat(line.quantity) > 0
        );
        return line;
      });
    }

    setFormData(nextFormData);
    setPurchaseItems(nextPurchaseItems);
    try {
      draftBaselineRef.current = JSON.stringify(
        toPurchaseDraftSnapshot(nextFormData, nextPurchaseItems)
      );
    } catch {
      draftBaselineRef.current = null;
    }

    hydratedRef.current = true;
    setHydrated(true);
  }, [
    purchase,
    fetchLoading,
    products,
    suppliers,
    accountsData,
    calculateItemTotal,
  ]);

  const draftData = useMemo(
    () => toPurchaseDraftSnapshot(formData, purchaseItems),
    [formData, purchaseItems]
  );
  const draftDataRef = useRef(draftData);
  draftDataRef.current = draftData;

  const isEditPurchaseDraftMeaningful = useCallback((payload) => {
    if (!draftBaselineRef.current) return false;
    try {
      return JSON.stringify(payload) !== draftBaselineRef.current;
    } catch {
      return true;
    }
  }, []);

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
    key: id ? `purchase-edit-${id}` : null,
    data: draftData,
    isMeaningful: isEditPurchaseDraftMeaningful,
    enabled: hydrated && Boolean(id),
    onRestore: onRestoreDraft,
  });

  useEffect(() => {
    if (!success) return;
    clearDraft();
    try {
      draftBaselineRef.current = JSON.stringify(draftDataRef.current);
    } catch {
      /* ignore */
    }
    addMessage(
      t("purchase.updateSuccess") || "Purchase updated successfully",
      "success"
    );
  }, [success, addMessage, t, clearDraft]);


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
                quantity: "",
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
        received_amount: formatAmount(formData.received_amount),
        payment_account: formData.payment_account?.id || null,
        items: completedItems.map((item) => ({
          product: item.product.id,
          ...quantityPayload(item.quantity),
          buy_price: formatAmount(item.buy_price),
        })),
      };

      addMessage(t("purchase.savingPurchase", "Updating purchase..."), "info");
      handleUpdate(id, purchaseData);
    } catch (err) {
      console.error("Error submitting purchase:", err);
      addMessage(t("purchase.updateError", "Error updating purchase"), "error");
    }
  }, [formData, completedItems, addMessage, t, handleUpdate, id]);

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
        name: productForm.name,
        category: productForm.category,
      });
    } catch (error) {
      console.error("Error adding product:", error);
      addMessage(t("product.addError", "Error adding product"), "error");
    }
  }, [productForm, addMessage, t, handleAddProduct]);

  const receivedNumeric = Number.parseFloat(formData.received_amount || 0) || 0;
  const remainingNumeric =
    Number.parseFloat(totalAmount) - receivedNumeric;

  const renderCartLine = (item) => {
    const isComplete = completedItems.includes(item);
    const lineTotal = calculateItemTotal(item);

    return (
      <PosCartLine key={item.id} complete={isComplete}>
        <PosItemRow columns={5}>
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

          <PosItemCell>
            <PosField label={t("common.quantity", "Quantity")}>
              <Input
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


  if (fetchLoading || !purchase || !hydrated) {
    return <FullPageLoader message="common.loading" />;
  }

  return (
    <PosShell>
      <PosHeader
        icon={<Package className="h-4 w-4" />}
        title={`${t("purchase.edit", "Edit Purchase")} #${id}`}
        subtitle={t(
          "purchase.editSubtitle",
          "Update purchase details and items"
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
                : `${t("purchase.updatePurchase", "Update Purchase")} (${
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
                      setFormData((prev) => ({ ...prev, supplier: newValue }))
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
              : t("purchase.updatePurchase", "Update Purchase")}
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

export default EditPurchase;
