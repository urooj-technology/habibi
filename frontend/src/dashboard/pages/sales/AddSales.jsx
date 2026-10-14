import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ShoppingCart,
  X,
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
import { calculatePricedLineTotal, quantityPayload } from "../../../utils/measurementConversion";
import { formatShopMoney } from "@/config/shopConfig";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

const newLineId = () => Date.now() + Math.random();
const getInventoryName = (inv) => inv?.product_details?.name || "";
const getInventoryBarcode = (inv) => inv?.product_details?.barcode || "";

function isSaleDraftMeaningful(payload) {
  const fv = payload?.formValues || {};
  const items = payload?.saleItems || [];
  if (fv.customer) return true;
  if (fv.notes?.trim()) return true;
  if (fv.received_amount && Number.parseFloat(fv.received_amount) > 0) return true;
  if (fv.payment_account) return true;
  return items.some(
    (item) =>
      item.inventory ||
      (item.sale_price && Number.parseFloat(item.sale_price) > 0) ||
      (item.quantity && Number.parseFloat(item.quantity) > 0)
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
    sale_date: new Date().toISOString().split("T")[0],
    received_amount: "",
    payment_account: null,
    notes: "",
  });

  const [saleItems, setSaleItems] = useState([]);
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
    const cashBank = arr.filter((a) => a?.role === "CASH" || a?.role === "BANK");
    const afn = cashBank.filter((a) => !a?.currency || a.currency === "AFN");
    return afn.length > 0 ? afn : cashBank;
  }, [accountsData]);

  // API hooks
  // No redirect here — clear draft first in the success effect, then navigate.
  const { handleAdd, loading, isSuccess, error } = useAdd(
    "sales",
    token,
    null,
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

  const calculateItemTotal = useCallback((item) => {
    if (!item.inventory || !item.sale_price) return 0;
    return calculatePricedLineTotal(item, item.sale_price);
  }, []);

  // Memoized values
  const itemsSubtotal = useMemo(() => {
    return saleItems
      .reduce((sum, item) => sum + calculateItemTotal(item), 0)
      .toFixed(2);
  }, [saleItems, calculateItemTotal]);


  const completedItems = useMemo(() => {
    return saleItems.filter((item) => {
      if (
        !item.inventory ||
        !item.sale_price ||
        Number.parseFloat(item.sale_price) <= 0
      ) {
        return false;
      }
      return item.quantity && Number.parseFloat(item.quantity) > 0;
    });
  }, [saleItems]);

  const draftData = useMemo(
    () => ({ formValues, saleItems }),
    [formValues, saleItems]
  );

  const onRestoreDraft = useCallback((payload) => {
    if (payload?.formValues) setFormValues(payload.formValues);
    if (Array.isArray(payload?.saleItems)) {
      setSaleItems(payload.saleItems.filter((item) => item.inventory));
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
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }, []);

  const entryBarRef = useRef(null);
  const saleItemFieldsRef = useRef(null);
  const { flashId, revealLine } = useItemLineReveal(saleItemFieldsRef);

  const pickInventory = useCallback(
    (inv, { source }) => {
      const name = inv.product_details?.name || "";
      const available = Number.parseFloat(inv.quantity || 0) || 0;
      const existing = saleItems.find((item) => item.inventory?.id === inv.id);

      if (existing) {
        const nextQty = (Number.parseFloat(existing.quantity) || 0) + 1;
        if (nextQty > available) {
          revealLine(existing.id, source === "search" ? "quantity" : null);
          return {
            ok: false,
            tone: "warning",
            message: t("itemEntry.stockLimit", { available, name }),
          };
        }
        updateItemField(existing.id, "quantity", String(nextQty));
        revealLine(existing.id, source === "search" ? "quantity" : null);
        return { ok: true, tone: "info", message: t("itemEntry.increased", { name }) };
      }

      const line = {
        id: newLineId(),
        inventory: inv,
        quantity: String(Math.min(1, available)),
        sale_price: inv?.sell_price ? Number.parseFloat(inv.sell_price).toString() : "",
      };
      setSaleItems((prev) => [...prev, line]);
      revealLine(line.id, source === "search" ? "sale_price" : null);
      return { ok: true, tone: "success", message: t("itemEntry.added", { name }) };
    },
    [saleItems, updateItemField, revealLine, t]
  );

  const focusEntryBar = useCallback(() => {
    entryBarRef.current?.focusBarcode();
    return true;
  }, []);

  const { containerRef: enterNavRef, onContainerKeyDownCapture } =
    useEnterNavigatesItemFields({ onEnterOnLastField: focusEntryBar });

  const setItemsContainerRef = useCallback(
    (node) => {
      saleItemFieldsRef.current = node;
      enterNavRef.current = node;
    },
    [enterNavRef]
  );

  const removeItem = useCallback((id) => {
    setSaleItems((prev) => prev.filter((item) => item.id !== id));
    addMessage(t("sales.messages.itemRemovedFromSale"), "warning");
  }, [t]);

  const handleSubmit = async () => {
    setFormSubmitted(true);
    const newErrors = {};
    const validationMessages = [];

    if (completedItems.length === 0) {
      newErrors.items = true;
      validationMessages.push(t("sales.validation.addCompleteItem"));
    }

    const receivedNum = Number.parseFloat(formValues.received_amount || 0) || 0;
    const totalNum = Number.parseFloat(itemsSubtotal || 0) || 0;
    if (!formValues.customer && totalNum > 0 && receivedNum < totalNum) {
      newErrors.customer = true;
      newErrors.received_amount = true;
      validationMessages.push(
        t(
          "sales.validation.walkInMustPayFull",
          "Walk-in sale must be paid in full, or select a customer for credit."
        )
      );
    }

    if (receivedNum > 0 && !formValues.payment_account) {
      newErrors.payment_account = true;
      validationMessages.push(
        t("sales.validation.paymentAccountRequired", "Cash/Bank account is required")
      );
    }

    const itemsWithExceededQuantity = saleItems
      .filter((item) => item.inventory)
      .flatMap((item) => {
        const qty = Number.parseFloat(item.quantity || 0);
        const available = Number.parseFloat(item.inventory.quantity || 0);
        if (qty > available) {
          return [
            `${item.inventory.product_details?.name || "Item"} (${t(
              "common.quantity",
              "Quantity"
            )})`,
          ];
        }
        return [];
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
      customer: formValues.customer || null,
      sale_date: formValues.sale_date,
      total_amount: itemsSubtotal,
      received_amount: (
        !formValues.customer
          ? Number(itemsSubtotal) || 0
          : Number.parseFloat(formValues.received_amount || 0) || 0
      ).toFixed(2),
      payment_account: formValues.payment_account?.id || null,
      notes: formValues.notes,
      items: completedItems.map((item) => ({
        inventory: item.inventory.id,
        ...quantityPayload(item.quantity),
        sale_price: Number.parseFloat(item.sale_price).toFixed(2),
      })),
    };

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

  const grandTotalNumeric = Number(itemsSubtotal) || 0;
  const totalAmountStr = grandTotalNumeric.toFixed(2);
  const isWalkIn = !formValues.customer;
  const prevTotalRef = useRef(totalAmountStr);

  // Walk-in: received always = total (locked). With customer: default to total.
  useEffect(() => {
    setFormValues((prev) => {
      const walkIn = !prev.customer;
      const prevTotal = prevTotalRef.current;
      prevTotalRef.current = totalAmountStr;
      if (walkIn) {
        if (prev.received_amount === totalAmountStr) return prev;
        return { ...prev, received_amount: totalAmountStr };
      }
      const recv = prev.received_amount;
      const tracksTotal =
        recv === "" ||
        recv == null ||
        Number.parseFloat(recv || 0) === Number.parseFloat(prevTotal || 0);
      if (tracksTotal && prev.received_amount !== totalAmountStr) {
        return { ...prev, received_amount: totalAmountStr };
      }
      return prev;
    });
  }, [totalAmountStr]);

  const receivedNumeric = isWalkIn
    ? grandTotalNumeric
    : Number.parseFloat(formValues.received_amount || 0) || 0;
  const remainingNumeric = grandTotalNumeric - receivedNumeric;

  const renderCartLine = (item) => {
    const isComplete = completedItems.includes(item);
    const lineTotal = calculateItemTotal(item);
    const avail = Number.parseFloat(item.inventory?.quantity || 0) || 0;
    const exceeds =
      item.quantity && Number.parseFloat(item.quantity) > avail;

    return (
      <PosCartLine
        key={item.id}
        data-line-id={item.id}
        complete={isComplete}
        className={cn(flashId === item.id && flashLineClass)}
      >
        <PosItemRow columns={5}>
          <PosItemCell>
            <PosField label={t("sales.tableHeaders.product")}>
              <PosProductCell
                name={item.inventory?.product_details?.name}
                barcode={item.inventory?.product_details?.barcode}
                extra={
                  <span className={cn("tabular-nums", exceeds && "text-destructive")}>
                    {t("itemEntry.stock")}: {avail}
                  </span>
                }
              />
            </PosField>
          </PosItemCell>

          <PosItemCell>
            <PosField
              label={t("common.quantity", "Quantity")}
            >
              <Input
                data-field="quantity"
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  updateItemField(item.id, "quantity", e.target.value)
                }
                placeholder="0"
                step="0.01"
                min="0"
                title={item.inventory ? `Available: ${avail}` : undefined}
                className={cn(
                  posControlClass,
                  "tabular-nums",
                  exceeds && "border-destructive"
                )}
              />
            </PosField>
          </PosItemCell>

          <PosItemCell>
            <PosField label={t("common.price", "Price")}>
              <Input
                data-field="sale_price"
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
              aria-label={t("common.delete")}
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
            title={t("sales.saleDetails", "Sale details")}
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
              label={t("sales.customerOptional", "Customer (optional)")}
              error={
                formSubmitted && errors.customer
                  ? t(
                      "sales.validation.walkInMustPayFull",
                      "Walk-in sale must be paid in full, or select a customer for credit."
                    )
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
                    onChange={(newValue) => {
                      const customerId = newValue?.id || "";
                      setFormValues((prev) => ({
                        ...prev,
                        customer: customerId,
                        ...(!customerId
                          ? { received_amount: totalAmountStr }
                          : prev.received_amount === "" ||
                              prev.received_amount == null
                            ? { received_amount: totalAmountStr }
                            : {}),
                      }));
                    }}
                    getOptionLabel={(option) => option.name}
                    loading={customersLoading}
                    error={formSubmitted && errors.customer}
                    clearable
                    placeholder="sales.walkInCustomer"
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

            <PosField
              label={
                isWalkIn
                  ? t("sales.labels.receivedAmount", "Received amount")
                  : t("sales.labels.receivedAmountOptional")
              }
              hint={
                isWalkIn
                  ? t(
                      "sales.walkInReceivedLocked",
                      "Walk-in sales are paid in full"
                    )
                  : null
              }
            >
              <Input
                type="number"
                value={isWalkIn ? totalAmountStr : formValues.received_amount}
                onChange={(e) => {
                  if (isWalkIn) return;
                  setFormValues((prev) => ({
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

          </PosDocBar>

          <PosItems
            title={t("sales.items", "Items")}
            count={saleItems.length}
          >
            <ItemEntryBar
              ref={entryBarRef}
              options={inventory}
              loading={inventoryLoading}
              getName={getInventoryName}
              getBarcode={getInventoryBarcode}
              renderMeta={(inv) =>
                `${t("itemEntry.stock")}: ${Number.parseFloat(inv.quantity || 0) || 0}`
              }
              getDisabledReason={(inv) =>
                (Number.parseFloat(inv.quantity || 0) || 0) <= 0
                  ? t("itemEntry.outOfStock", { name: inv.product_details?.name || "" })
                  : null
              }
              isInList={(inv) => saleItems.some((item) => item.inventory?.id === inv.id)}
              onPick={pickInventory}
            />
            <div
              ref={setItemsContainerRef}
              onKeyDownCapture={onContainerKeyDownCapture}
              className="min-w-0"
            >
              {saleItems.length === 0 ? <PosItemsEmpty /> : saleItems.map(renderCartLine)}
            </div>
          </PosItems>
        </PosMain>

        <PosSummary title={t("sales.orderSummary", "Summary")}>
          <div className="border-t border-border pt-2">
            <PosTotalRow
              label={t("common.total")}
              value={formatShopMoney(grandTotalNumeric)}
              emphasize
            />
          </div>
          <PosTotalRow
            label={t("sales.received")}
            value={formatShopMoney(receivedNumeric)}
          />
          <PosTotalRow
            label={t("sales.remainingAmount")}
            value={formatShopMoney(remainingNumeric)}
          />

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
