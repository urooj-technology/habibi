import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ShoppingCart,
  X,
  Plus,
  Trash2,
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
} from "lucide-react";

import useAdd from "../../../api/useAdd";
import useFetchObjects from "../../../api/useFetchObjects";
import { useAuth } from "../../../context/AuthContext";
import AddCustomerDialog from "./AddCustomerDialog";
import { useEnterNavigatesItemFields } from "../../../hooks/useEnterNavigatesItemFields";
import useFormDraft from "../../../hooks/useFormDraft";
import FormDraftBanner from "../../../components/FormDraftBanner";
import { calculatePricedLineTotal, defaultPricingBase, getSelectedUnits, applyDualMeasurementSync } from "../../../utils/measurementConversion";
import PricingBaseSelect from "@/components/pos/PricingBaseSelect";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

const initialItemState = {
  id: Date.now(),
  inventory: null,
  weight_amount: "",
  meter_amount: "",
  khada_amount: "",
  grain_amount: "",
  note: "",
  sale_price: "",
  item_notes: "",
  pricing_base: "",
};

const QTY_FIELDS = ["weight_amount", "meter_amount", "khada_amount", "grain_amount"];

function isSaleDraftMeaningful(payload) {
  const fv = payload?.formValues || {};
  const items = payload?.saleItems || [];
  if (fv.customer) return true;
  if (fv.notes?.trim()) return true;
  if (fv.freight_amount && Number.parseFloat(fv.freight_amount) > 0) return true;
  if (fv.received_amount && Number.parseFloat(fv.received_amount) > 0) return true;
  if (fv.payment_account) return true;
  if (fv.currency === "AFN" && fv.exchange_rate) return true;
  return items.some(
    (item) =>
      item.inventory ||
      (item.sale_price && Number.parseFloat(item.sale_price) > 0) ||
      item.note?.trim() ||
      QTY_FIELDS.some((f) => item[f] && Number.parseFloat(item[f]) > 0)
  );
}

const AddSales = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;

  // Form state
  const [formValues, setFormValues] = useState({
    customer: "",
    currency: "USD",
    exchange_rate: "",
    sale_date: new Date().toISOString().split("T")[0],
    freight_amount: "",
    received_amount: "",
    payment_account: null,
    notes: "",
  });

  const [saleItems, setSaleItems] = useState([{ ...initialItemState }]);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [messages, setMessages] = useState([]);

  // Fetch data
  const {
    data: customers = [],
    isLoading: customersLoading,
    refetch: refetchCustomers,
  } = useFetchObjects(["customers"], "customers/", token);
  const { data: inventory = [], isLoading: inventoryLoading } = useFetchObjects(
    ["inventory"],
    "inventory/",
    token
  );
  const { data: accountsData = [] } = useFetchObjects(
    ["accounting-accounts"],
    "accounting/accounts/?page_size=500",
    token
  );
  const cashBankAccounts = useMemo(() => {
    const arr = Array.isArray(accountsData)
      ? accountsData
      : accountsData?.results || [];
    return arr.filter(
      (a) =>
        (a?.role === "CASH" || a?.role === "BANK") &&
        (!formValues.currency || a?.currency === formValues.currency)
    );
  }, [accountsData, formValues.currency]);

  // API hooks
  const { handleAdd, loading, isSuccess, error } = useAdd(
    "sales",
    token,
    "/app/sales",
    t("sales.addSuccess"),
    t("sales.addError")
  );

  const {
    handleAdd: handleAddCustomerApi,
    loading: customerLoading,
    isSuccess: customerSuccess,
    responseData: newCustomerData,
  } = useAdd(
    "customers",
    token,
    "",
    t("customer.addSuccess"),
    t("customer.addError")
  );

  // Helper functions
  const addMessage = (message, severity = "info") => {
    const id = Date.now();
    setMessages((prev) => [...prev, { id, message, severity }]);
    setTimeout(() => removeMessage(id), 5000);
    return id;
  };

  const removeMessage = (id) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  const getAvailableProducts = useCallback(
    (currentItemId) => {
      return inventory.filter(
        (inv) =>
          !saleItems.some(
            (item) => item.id !== currentItemId && item.inventory?.id === inv.id
          )
      );
    },
    [inventory, saleItems]
  );

  const getActiveMeasurementFields = useCallback(
    (inventoryItem) => {
      if (!inventoryItem?.product_details) return [];
      const product = inventoryItem.product_details;
      const fields = [];

      if (product.is_weight)
        fields.push({
          name: "weight_amount",
          label: t("sales.measurementLabels.weight"),
          available: inventoryItem.weight_amount || 0,
          unit: "kg",
        });
      if (product.is_meter)
        fields.push({
          name: "meter_amount",
          label: t("sales.measurementLabels.meter"),
          available: inventoryItem.meter_amount || 0,
          unit: "m",
        });
      if (product.is_khada)
        fields.push({
          name: "khada_amount",
          label: t("sales.measurementLabels.khada"),
          available: inventoryItem.khada_amount || 0,
          unit: "pcs",
        });
      if (product.is_grain)
        fields.push({
          name: "grain_amount",
          label: t("sales.measurementLabels.grain"),
          available: inventoryItem.grain_amount || 0,
          unit: t("sales.units.grainUnit"),
        });

      return fields;
    },
    [t]
  );

  const calculateItemTotal = useCallback((item) => {
    if (!item.inventory || !item.sale_price) return 0;
    const product = item.inventory.product_details || {};
    const base = defaultPricingBase(product, item.pricing_base);
    return calculatePricedLineTotal(item, item.sale_price, base);
  }, []);

  // Memoized values
  const itemsSubtotal = useMemo(() => {
    return saleItems
      .reduce((sum, item) => sum + calculateItemTotal(item), 0)
      .toFixed(2);
  }, [saleItems, calculateItemTotal]);

  const freightNumeric = useMemo(
    () => Math.max(0, parseFloat(formValues.freight_amount) || 0),
    [formValues.freight_amount]
  );

  const completedItems = useMemo(() => {
    return saleItems.filter((item) => {
      if (
        !item.inventory ||
        !item.sale_price ||
        Number.parseFloat(item.sale_price) <= 0
      ) {
        return false;
      }
      return getActiveMeasurementFields(item.inventory).some(
        (f) => item[f.name] && Number.parseFloat(item[f.name]) > 0
      );
    });
  }, [saleItems, getActiveMeasurementFields]);

  const draftData = useMemo(
    () => ({ formValues, saleItems }),
    [formValues, saleItems]
  );

  const onRestoreDraft = useCallback((payload) => {
    if (payload?.formValues) setFormValues(payload.formValues);
    if (Array.isArray(payload?.saleItems) && payload.saleItems.length > 0) {
      setSaleItems(payload.saleItems);
    }
  }, []);

  const {
    draftPrompt,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useFormDraft({
    key: "sale-add",
    data: draftData,
    isMeaningful: isSaleDraftMeaningful,
    onRestore: onRestoreDraft,
  });

  // Effects
  useEffect(() => {
    if (isSuccess) {
      clearDraft();
      addMessage(t("sales.addSuccess"), "success");
      setTimeout(() => navigate("/app/sales"), 1000);
    }
  }, [isSuccess, navigate, t, clearDraft]);

  useEffect(() => {
    if (customerSuccess && newCustomerData) {
      setCustomerDialogOpen(false);
      setFormValues((prev) => ({ ...prev, customer: newCustomerData.id }));
      refetchCustomers();
      addMessage(t("customer.createdSuccessfully"), "success");
    }
  }, [customerSuccess, newCustomerData, refetchCustomers, t]);

  // Handlers
  const updateItemField = useCallback((id, field, value) => {
    setSaleItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const product = item.inventory?.product_details || {};
        const sync = applyDualMeasurementSync({
          productOrFlags: product,
          ratioSource: item.inventory || {},
          changedField: field,
          changedValue: value,
        });
        return { ...item, ...sync };
      })
    );
  }, []);

  const handleInventoryChange = useCallback(
    (id, newValue) => {
      if (newValue) {
        const isAlreadySelected = saleItems.some(
          (item) => item.id !== id && item.inventory?.id === newValue.id
        );

        if (isAlreadySelected) {
          addMessage(t("sales.messages.productAlreadyInOtherLine"), "warning");
          return;
        }

        let initialSalePrice = "";
        if (newValue?.sell_price) {
          const price = Number.parseFloat(newValue.sell_price);
          initialSalePrice =
            formValues.currency === "USD"
              ? price.toString()
              : formValues.exchange_rate
              ? (price * Number.parseFloat(formValues.exchange_rate)).toFixed(2)
              : "";
        }

        updateItemField(id, "inventory", newValue);
        updateItemField(id, "sale_price", initialSalePrice);
        updateItemField(id, "weight_amount", "");
        updateItemField(id, "meter_amount", "");
        updateItemField(id, "khada_amount", "");
        updateItemField(id, "grain_amount", "");
        updateItemField(id, "note", "");
        updateItemField(
          id,
          "pricing_base",
          defaultPricingBase(newValue.product_details || {})
        );

        addMessage(
          t("sales.messages.productSelected", {
            name: newValue.product_details?.name || "",
          }),
          "success"
        );
      } else {
        // Clear selection
        updateItemField(id, "inventory", null);
        updateItemField(id, "sale_price", "");
        updateItemField(id, "weight_amount", "");
        updateItemField(id, "meter_amount", "");
        updateItemField(id, "khada_amount", "");
        updateItemField(id, "grain_amount", "");
        updateItemField(id, "note", "");
        updateItemField(id, "pricing_base", "");
      }
    },
    [saleItems, formValues.currency, formValues.exchange_rate, updateItemField, t]
  );

  const addNewItem = useCallback(() => {
    setSaleItems((prev) => [
      ...prev,
      { ...initialItemState, id: Date.now() + Math.random() },
    ]);
    addMessage(t("sales.messages.newItemAddedToSale"), "info");
  }, [t]);

  const { containerRef: saleItemFieldsRef, onContainerKeyDownCapture } =
    useEnterNavigatesItemFields({ onEnterOnLastField: addNewItem });

  const removeItem = useCallback((id) => {
    setSaleItems((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      return filtered.length === 0
        ? [{ ...initialItemState, id: Date.now() }]
        : filtered;
    });
    addMessage(t("sales.messages.itemRemovedFromSale"), "warning");
  }, [t]);

  const handleSubmit = async () => {
    setFormSubmitted(true);
    const newErrors = {};
    const validationMessages = [];

    if (!formValues.customer) {
      newErrors.customer = true;
      validationMessages.push(t("sales.validation.selectCustomer"));
    }

    if (completedItems.length === 0) {
      newErrors.items = true;
      validationMessages.push(t("sales.validation.addCompleteItem"));
    }

    if (formValues.currency === "AFN" && !formValues.exchange_rate) {
      newErrors.exchange_rate = true;
      validationMessages.push(t("sales.validation.exchangeRateRequiredAfn"));
    }

    if (
      Number.parseFloat(formValues.received_amount || 0) > 0 &&
      !formValues.payment_account
    ) {
      newErrors.payment_account = true;
      validationMessages.push(
        t("sales.validation.paymentAccountRequired", "Cash/Bank account is required")
      );
    }

    // Check stock quantities
    const itemsWithExceededQuantity = saleItems
      .filter((item) => item.inventory)
      .flatMap((item) => {
        const product = item.inventory.product_details;
        const exceededFields = [];

        if (
          product.is_weight &&
          Number.parseFloat(item.weight_amount || 0) >
            Number.parseFloat(item.inventory.weight_amount || 0)
        ) {
          exceededFields.push(t("sales.measurementLabels.weight"));
        }
        if (
          product.is_meter &&
          Number.parseFloat(item.meter_amount || 0) >
            Number.parseFloat(item.inventory.meter_amount || 0)
        ) {
          exceededFields.push(t("sales.measurementLabels.meter"));
        }
        if (
          product.is_khada &&
          Number.parseFloat(item.khada_amount || 0) >
            Number.parseFloat(item.inventory.khada_amount || 0)
        ) {
          exceededFields.push(t("sales.measurementLabels.khada"));
        }
        if (
          product.is_grain &&
          Number.parseFloat(item.grain_amount || 0) >
            Number.parseFloat(item.inventory.grain_amount || 0)
        ) {
          exceededFields.push(t("sales.measurementLabels.grain"));
        }

        return exceededFields.length
          ? [
              `${item.inventory.product_details.name} (${exceededFields.join(
                ", "
              )})`,
            ]
          : [];
      });

    if (itemsWithExceededQuantity.length) {
      newErrors.quantities = true;
      validationMessages.push(
        t("sales.messages.quantitiesExceedStockFor", {
          list: itemsWithExceededQuantity.join(", "),
        })
      );
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addMessage(
        t("sales.messages.validationIssues", {
          details: validationMessages.join(", "),
        }),
        "error"
      );
      return;
    }

    const saleData = {
      customer: formValues.customer,
      currency: formValues.currency,
      sale_date: formValues.sale_date,
      total_amount: itemsSubtotal,
      freight_amount: freightNumeric.toFixed(2),
      received_amount: formValues.received_amount
        ? Number.parseFloat(formValues.received_amount).toFixed(2)
        : "0.00",
      payment_account: formValues.payment_account?.id || null,
      notes: formValues.notes,
      items: completedItems.map((item) => ({
        inventory: item.inventory.id,
        weight_amount: Number.parseFloat(item.weight_amount || 0).toFixed(2),
        meter_amount: Number.parseFloat(item.meter_amount || 0).toFixed(2),
        khada_amount: Number.parseFloat(item.khada_amount || 0).toFixed(2),
        grain_amount: Number.parseFloat(item.grain_amount || 0).toFixed(2),
        note: item.note || "",
        sale_price: Number.parseFloat(item.sale_price).toFixed(2),
        item_notes: item.item_notes || "",
        pricing_base:
          defaultPricingBase(
            item.inventory?.product_details || {},
            item.pricing_base
          ) || null,
      })),
    };

    if (formValues.currency === "AFN") {
      saleData.exchange_rate = Number.parseFloat(
        formValues.exchange_rate
      ).toFixed(2);
    }

    addMessage(t("sales.messages.savingSale"), "info");
    handleAdd(saleData);
  };

  const handleAddCustomer = async (customerData) => {
    if (!customerData.name.trim()) {
      addMessage(t("sales.messages.customerNameRequired"), "error");
      return;
    }
    addMessage(t("sales.messages.addingCustomer"), "info");
    await handleAddCustomerApi(customerData);
  };

  const grandTotalNumeric = Number(itemsSubtotal);
  const receivedNumeric = Number.parseFloat(formValues.received_amount || 0) || 0;
  const remainingNumeric = grandTotalNumeric - receivedNumeric;

  const renderCartLine = (item) => {
    const isComplete = completedItems.includes(item);
    const measurementFields = getActiveMeasurementFields(item.inventory);
    const lineTotal = calculateItemTotal(item);
    const product = item.inventory?.product_details;
    const dualUnits = getSelectedUnits(product || {}).length >= 2;
    const fieldConfig = {
      weight_amount: { step: "0.01" },
      meter_amount: { step: "0.01" },
      khada_amount: { step: "1" },
      grain_amount: { step: "1" },
    };
    // product + measurements + [price by] + price + total + delete
    const columns = 1 + measurementFields.length + (dualUnits ? 1 : 0) + 2 + 1;

    return (
      <PosCartLine key={item.id} complete={isComplete}>
        <PosItemRow columns={columns}>
          <PosItemCell>
            <PosField label={t("sales.tableHeaders.product")}>
              <SearchableSelect
                options={getAvailableProducts(item.id)}
                value={item.inventory}
                onChange={(newValue) => handleInventoryChange(item.id, newValue)}
                getOptionLabel={(option) =>
                  `${option.product_details?.name || ""}${
                    option.thickness
                      ? ` (${option.thickness} ${t("sales.units.mm")})`
                      : ""
                  }`
                }
                placeholder="sales.placeholders.selectProduct"
                loading={inventoryLoading}
              />
            </PosField>
          </PosItemCell>

          {measurementFields.map((field) => {
            const cfg = fieldConfig[field.name];
            const avail = item.inventory?.[field.name] || 0;
            const exceeds =
              item[field.name] &&
              Number.parseFloat(item[field.name]) > Number(avail);
            return (
              <PosItemCell key={field.name}>
                <PosField label={`${field.label} (${avail})`}>
                  <Input
                    type="number"
                    value={item[field.name]}
                    onChange={(e) =>
                      updateItemField(item.id, field.name, e.target.value)
                    }
                    placeholder="0"
                    step={cfg.step}
                    min="0"
                    title={`Available: ${avail}`}
                    className={cn(
                      posControlClass,
                      "tabular-nums",
                      exceeds && "border-destructive"
                    )}
                  />
                </PosField>
              </PosItemCell>
            );
          })}

          {dualUnits ? (
            <PosItemCell>
              <PricingBaseSelect
                product={product}
                value={defaultPricingBase(product, item.pricing_base)}
                onChange={(v) => updateItemField(item.id, "pricing_base", v)}
              />
            </PosItemCell>
          ) : null}

          <PosItemCell>
            <PosField
              label={t("sales.tableHeaders.priceWithCurrency", {
                currency: formValues.currency,
              })}
            >
              <Input
                type="number"
                value={item.sale_price}
                onChange={(e) =>
                  updateItemField(item.id, "sale_price", e.target.value)
                }
                placeholder="0.00"
                step="0.01"
                min="0"
                className={cn(posControlClass, "tabular-nums")}
              />
            </PosField>
          </PosItemCell>

          <PosItemCell>
            <PosField label={t("common.total")}>
              <div
                className={cn(
                  "flex h-8 items-center truncate rounded-md border border-transparent bg-muted/40 px-2 text-xs font-bold tabular-nums",
                  isComplete ? "text-primary" : "text-muted-foreground"
                )}
              >
                {lineTotal.toFixed(2)}
              </div>
            </PosField>
          </PosItemCell>

          <PosItemCell className="flex items-end justify-center pb-0.5">
            {saleItems.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <div className="h-8 w-8" />
            )}
          </PosItemCell>
        </PosItemRow>
        <div className="mt-1.5">
          <PosField label={t("sales.tableHeaders.note", "Note")}>
            <Input
              value={item.note || ""}
              onChange={(e) => updateItemField(item.id, "note", e.target.value)}
              placeholder={t(
                "sales.notePlaceholder",
                "e.g. thickness or other line note…"
              )}
              className={posControlClass}
              maxLength={255}
            />
          </PosField>
        </div>
      </PosCartLine>
    );
  };


  return (
    <PosShell>
      <PosHeader
        icon={<ShoppingCart className="h-4 w-4" />}
        title={t("sales.addNew")}
        subtitle={t("sales.createSaleSubtitle")}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => navigate("/app/sales")}
            >
              <X className="h-3.5 w-3.5" />
              {t("common.cancel")}
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
                ? t("common.saving")
                : t("sales.saveSaleWithCount", {
                    count: completedItems.length,
                  })}
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
            {error.message || t("sales.messages.errorSavingSale")}
          </AlertDescription>
        </Alert>
      ) : null}

      {formSubmitted && Object.keys(errors).length > 0 ? (
        <Alert variant="warning" className="py-2">
          <AlertDescription className="text-xs">
            {t("sales.messages.completeRequiredFields")}
          </AlertDescription>
        </Alert>
      ) : null}

      {formSubmitted && errors.quantities ? (
        <Alert variant="error" className="py-2">
          <AlertDescription className="text-xs">
            {t("sales.messages.quantityExceedsStock")}
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
            title={t("sales.sections.customerAndCurrency", "Sale details")}
            footer={
              <PosField label={t("sales.notes")}>
                <Textarea
                  value={formValues.notes}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder={t("sales.placeholders.saleNotes")}
                  rows={2}
                  className="min-h-[2.5rem] min-w-0 resize-y py-1.5 text-xs"
                />
              </PosField>
            }
          >
            <PosField
              label={t("sales.customer")}
              required
              error={
                formSubmitted && errors.customer
                  ? t("sales.customerRequiredShort")
                  : null
              }
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <div className="min-w-0 flex-1">
                  <SearchableSelect
                    options={customers}
                    value={
                      customers.find((c) => c.id === formValues.customer) || null
                    }
                    onChange={(newValue) =>
                      setFormValues((prev) => ({
                        ...prev,
                        customer: newValue?.id || "",
                      }))
                    }
                    getOptionLabel={(option) => option.name}
                    loading={customersLoading}
                    error={formSubmitted && errors.customer}
                    placeholder="sales.customer"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setCustomerDialogOpen(true)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </PosField>

            <PosField label={t("sales.saleDate")}>
              <Input
                type="date"
                name="sale_date"
                value={formValues.sale_date || ""}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    sale_date: e.target.value,
                  }))
                }
                className={posControlClass}
              />
            </PosField>

            <PosField label={t("sales.currency")}>
              <Select
                value={formValues.currency}
                onValueChange={(value) =>
                  setFormValues((prev) => ({ ...prev, currency: value }))
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

            {formValues.currency === "AFN" ? (
              <PosField
                label={t("sales.exchangeRate")}
                required
                error={
                  formSubmitted && errors.exchange_rate
                    ? t("sales.exchangeRateRequired")
                    : null
                }
              >
                <Input
                  type="number"
                  value={formValues.exchange_rate}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      exchange_rate: e.target.value,
                    }))
                  }
                  step="0.01"
                  min="0.01"
                  className={cn(posControlClass, "tabular-nums")}
                />
              </PosField>
            ) : null}

            <PosField label={t("sales.labels.receivedAmountOptional")}>
              <Input
                type="number"
                value={formValues.received_amount}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    received_amount: e.target.value,
                  }))
                }
                step="0.01"
                min="0"
                className={cn(posControlClass, "tabular-nums")}
              />
            </PosField>

            {Number.parseFloat(formValues.received_amount || 0) > 0 ? (
              <PosField
                label={t("sales.labels.paymentAccount", "Cash/Bank Account")}
                required
                error={
                  formSubmitted && errors.payment_account
                    ? t(
                        "sales.validation.paymentAccountRequired",
                        "Cash/Bank account is required"
                      )
                    : null
                }
              >
                <SearchableSelect
                  options={cashBankAccounts}
                  value={formValues.payment_account}
                  onChange={(newValue) =>
                    setFormValues((prev) => ({
                      ...prev,
                      payment_account: newValue,
                    }))
                  }
                  getOptionLabel={(option) =>
                    option ? `${option.code} - ${option.name}` : ""
                  }
                  error={formSubmitted && errors.payment_account}
                  placeholder="sales.labels.paymentAccount"
                />
              </PosField>
            ) : null}

            <PosField
              label={t("sales.freightKaraya")}
              hint={t(
                "sales.freightNotInTotal",
                "Informational only — not added to sale total"
              )}
            >
              <Input
                type="number"
                value={formValues.freight_amount}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    freight_amount: e.target.value,
                  }))
                }
                min="0"
                step="0.01"
                className={cn(posControlClass, "tabular-nums")}
              />
            </PosField>
          </PosDocBar>

          <PosItems
            title={t("sales.items", "Items")}
            count={completedItems.length}
            actions={
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={addNewItem}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("sales.addItem")}
              </Button>
            }
          >
            <div
              ref={saleItemFieldsRef}
              onKeyDownCapture={onContainerKeyDownCapture}
              className="min-w-0"
            >
              {saleItems.map(renderCartLine)}
            </div>
          </PosItems>
        </PosMain>

        <PosSummary title={t("sales.orderSummary", "Summary")}>
          <PosTotalRow
            label={t("sales.itemsSubtotal")}
            value={`${formValues.currency} ${itemsSubtotal}`}
          />
          <PosTotalRow
            label={t("sales.freightKaraya")}
            value={`${formValues.currency} ${freightNumeric.toFixed(2)}`}
            muted
          />
          <div className="border-t border-border pt-2">
            <PosTotalRow
              label={t("common.total")}
              value={`${formValues.currency} ${grandTotalNumeric.toFixed(2)}`}
              emphasize
            />
          </div>
          <PosTotalRow
            label={t("sales.received")}
            value={`${formValues.currency} ${receivedNumeric.toFixed(2)}`}
          />
          <PosTotalRow
            label={t("sales.remainingAmount")}
            value={`${formValues.currency} ${remainingNumeric.toFixed(2)}`}
          />
          {formValues.currency === "AFN" && formValues.exchange_rate ? (
            <PosTotalRow
              label={t("sales.usdEquivalent")}
              value={`USD ${(
                grandTotalNumeric / Number.parseFloat(formValues.exchange_rate)
              ).toFixed(2)}`}
              muted
            />
          ) : null}

          <Button
            type="button"
            className="mt-1 h-10 w-full text-sm font-semibold"
            onClick={handleSubmit}
            disabled={loading || completedItems.length === 0}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {loading ? t("common.saving") : t("sales.completeSale")}
          </Button>
        </PosSummary>
      </PosBody>

      <AddCustomerDialog
        open={customerDialogOpen}
        onClose={() => setCustomerDialogOpen(false)}
        onAddCustomer={handleAddCustomer}
        loading={customerLoading}
      />
    </PosShell>
  );
};

export default AddSales;
