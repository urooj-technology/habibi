import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  X,
} from "lucide-react";
import axios from "axios";

import useAdd from "../../../../api/useAdd";
import useFetchObjects from "../../../../api/useFetchObjects";
import { useAuth } from "../../../../context/AuthContext";
import { API_BASE_URL } from "../../../../config/env";
import {
  calculatePricedLineTotal,
  quantityPayload,
} from "../../../../utils/measurementConversion";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
        <button type="button" onClick={onClose} className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100">
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
};

const AddSaleReturn = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const token = auth?.user?.token;

  const [saleId, setSaleId] = useState(searchParams.get("sale") || "");
  const [returnable, setReturnable] = useState(null);
  const [loadingReturnable, setLoadingReturnable] = useState(false);
  const [lines, setLines] = useState([]);
  const [formValues, setFormValues] = useState({
    return_date: new Date().toISOString().split("T")[0],
    refunded_amount: "",
    refund_account: null,
    note: "",
  });
  const [messages, setMessages] = useState([]);
  const [errors, setErrors] = useState({});

  const { data: salesData, isLoading: salesLoading } = useFetchObjects(
    ["sales-for-return"],
    "sales/?page_size=200",
    token
  );
  const sales = useMemo(() => {
    const arr = Array.isArray(salesData) ? salesData : salesData?.results || [];
    return arr.filter((s) => s.customer || s.customer_details);
  }, [salesData]);

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

  const addMessage = useCallback((message, severity = "info") => {
    const id = Date.now() + Math.random();
    setMessages((prev) => [...prev, { id, message, severity }]);
    if (severity !== "error") {
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }, 4000);
    }
  }, []);

  const { handleAdd, loading: saving } = useAdd(
    "sales-returns",
    token,
    "/app/sales/returns",
    t("saleReturn.saleReturnCreatedSuccessfully"),
    t("saleReturn.failedToCreateSaleReturn")
  );

  const loadReturnable = useCallback(
    async (id) => {
      if (!id || !token) {
        setReturnable(null);
        setLines([]);
        return;
      }
      setLoadingReturnable(true);
      try {
        const headers = { Authorization: `Token ${token}` };
        const res = await axios.get(
          `${API_BASE_URL}/sales/${id}/returnable-items/`,
          { headers }
        );
        const payload = res.data;
        setReturnable(payload);
        setFormValues((prev) => ({
          ...prev,
          refunded_amount: "",
          refund_account: null,
        }));
        setLines(
          (payload.items || []).map((row) => ({
            sale_item_id: row.sale_item_id,
            inventory_id: row.inventory_id,
            product_name: row.product_name,
            product_details: row.product_details || {},
            sale_price: row.sale_price,
            sold_quantity: Number.parseFloat(row.sold_quantity || 0) || 0,
            remaining_quantity:
              Number.parseFloat(row.remaining_quantity || 0) || 0,
            quantity: "",
            note: "",
            include: false,
          }))
        );
      } catch (e) {
        setReturnable(null);
        setLines([]);
        addMessage(
          e?.response?.data?.detail ||
            e?.message ||
            t("saleReturn.loadSaleFailed", "Could not load returnable items."),
          "error"
        );
      } finally {
        setLoadingReturnable(false);
      }
    },
    [token, addMessage, t]
  );

  useEffect(() => {
    if (saleId) loadReturnable(saleId);
  }, [saleId, loadReturnable]);

  const updateLine = useCallback((saleItemId, patch) => {
    setLines((prev) =>
      prev.map((line) =>
        line.sale_item_id === saleItemId ? { ...line, ...patch } : line
      )
    );
  }, []);

  const activeLines = useMemo(
    () =>
      lines.filter(
        (line) => line.include && Number.parseFloat(line.quantity || 0) > 0
      ),
    [lines]
  );

  const itemsSubtotal = useMemo(
    () =>
      activeLines.reduce(
        (sum, line) =>
          sum + calculatePricedLineTotal(line, line.sale_price),
        0
      ),
    [activeLines]
  );

  const refundedNumeric = Number.parseFloat(formValues.refunded_amount || 0) || 0;
  const creditedAmount = Math.max(itemsSubtotal - refundedNumeric, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!saleId) {
      newErrors.sale = true;
      addMessage(t("saleReturn.saleRequired"), "error");
    }
    if (!activeLines.length) {
      newErrors.items = true;
      addMessage(t("saleReturn.addAtLeastOneItem"), "error");
    }
    if (refundedNumeric > itemsSubtotal + 0.001) {
      newErrors.refunded_amount = true;
      addMessage(
        t(
          "saleReturn.refundExceedsTotal",
          "Refunded amount cannot exceed return total."
        ),
        "error"
      );
    }
    if (refundedNumeric > 0 && !formValues.refund_account) {
      newErrors.refund_account = true;
      addMessage(
        t(
          "saleReturn.refundAccountRequired",
          "Select a cash/bank account for the refund."
        ),
        "error"
      );
    }
    for (const line of activeLines) {
      const qty = Number.parseFloat(line.quantity || 0);
      const max = Number(line.remaining_quantity || 0);
      if (qty > max + 0.0001) {
        newErrors[`qty_${line.sale_item_id}`] = true;
        addMessage(
          t("saleReturn.qtyExceedsRemaining", {
            product: line.product_name,
            defaultValue: `Return qty for ${line.product_name} exceeds remaining on the sale.`,
          }),
          "error"
        );
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    const payload = {
      sale: Number(saleId),
      return_date: formValues.return_date,
      total_amount: itemsSubtotal.toFixed(2),
      refunded_amount: refundedNumeric.toFixed(2),
      refund_account:
        refundedNumeric > 0 ? formValues.refund_account?.id || null : null,
      note: formValues.note || "",
      items: activeLines.map((line) => ({
        sale_item: line.sale_item_id,
        inventory: line.inventory_id,
        ...quantityPayload(line.quantity),
        sale_price: Number(line.sale_price || 0).toFixed(2),
        note: line.note || "",
      })),
    };

    addMessage(t("saleReturn.saving", "Saving sale return…"), "info");
    handleAdd(payload);
  };

  const selectedSale = sales.find((s) => String(s.id) === String(saleId));

  return (
    <PosShell>
      <PosHeader
        icon={<RotateCcw className="h-5 w-5" />}
        title={t("saleReturn.title", "Create Sale Return")}
        subtitle={t(
          "saleReturn.subtitle",
          "Credit note against an invoice — refund cash or credit customer AR"
        )}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => navigate("/app/sales/returns")}
            >
              <X className="h-3.5 w-3.5" />
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleSubmit}
              disabled={saving || loadingReturnable}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {t("saleReturn.saveReturn", "Save Return")}
            </Button>
          </>
        }
      />

      <div className="px-4 pt-3">
        {messages.map((m) => (
          <InlineMessage
            key={m.id}
            message={m.message}
            severity={m.severity}
            onClose={() =>
              setMessages((prev) => prev.filter((x) => x.id !== m.id))
            }
          />
        ))}
      </div>

      <PosBody>
        <PosMain>
          <PosDocBar>
            <PosField
              label={t("saleReturn.sale", "Sale invoice")}
              required
              error={errors.sale}
              className="sm:col-span-2"
            >
              <SearchableSelect
                options={sales}
                value={selectedSale || null}
                onChange={(val) => setSaleId(val?.id ? String(val.id) : "")}
                getOptionLabel={(s) =>
                  `#${s.id} — ${s.customer_details?.name || t("common.unknown", "Customer")} · ${formatShopMoney(s.total_amount || 0)}`
                }
                isOptionEqualToValue={(a, b) => a?.id === b?.id}
                loading={salesLoading}
                placeholder="saleReturn.selectSale"
                className={cn(posControlClass, errors.sale && "border-destructive")}
              />
            </PosField>
            <PosField label={t("saleReturn.returnDate")}>
              <Input
                type="date"
                value={formValues.return_date}
                onChange={(e) =>
                  setFormValues((p) => ({ ...p, return_date: e.target.value }))
                }
                className={posControlClass}
              />
            </PosField>
            <PosField
              label={t("saleReturn.customer")}
              className="sm:col-span-2"
            >
              <Input
                value={returnable?.customer_name || "—"}
                disabled
                className={posControlClass}
              />
            </PosField>
          </PosDocBar>

          <PosItems
            title={t("saleReturn.returnItems")}
            count={activeLines.length}
          >
            {loadingReturnable ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !saleId ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t("saleReturn.selectSaleFirst", "Select a sale invoice to load returnable lines.")}
              </p>
            ) : lines.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t(
                  "saleReturn.nothingReturnable",
                  "Nothing left to return on this sale."
                )}
              </p>
            ) : (
              lines.map((line) => (
                <PosCartLine key={line.sale_item_id} complete={line.include}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={!!line.include}
                        onChange={(e) =>
                          updateLine(line.sale_item_id, {
                            include: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-border"
                      />
                      <span>{line.product_name || "—"}</span>
                    </label>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {t("saleReturn.remaining", "Remaining")}:{" "}
                      {line.remaining_quantity} / {line.sold_quantity}{" "}
                      {t("common.quantity", "qty")}
                    </span>
                  </div>
                  {line.include ? (
                    <PosItemRow columns={2}>
                      <PosItemCell>
                        <PosField
                          label={`${t("common.quantity", "Quantity")} (max ${line.remaining_quantity})`}
                        >
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max={line.remaining_quantity || undefined}
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(line.sale_item_id, {
                                quantity: e.target.value,
                              })
                            }
                            className={cn(
                              posControlClass,
                              errors[`qty_${line.sale_item_id}`] &&
                                "border-destructive"
                            )}
                          />
                        </PosField>
                      </PosItemCell>
                      <PosItemCell>
                        <PosField label={t("saleReturn.salePrice")}>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.sale_price}
                            onChange={(e) =>
                              updateLine(line.sale_item_id, {
                                sale_price: e.target.value,
                              })
                            }
                            className={posControlClass}
                          />
                        </PosField>
                      </PosItemCell>
                    </PosItemRow>
                  ) : null}
                </PosCartLine>
              ))
            )}
          </PosItems>
        </PosMain>

        <PosSummary title={t("saleReturn.returnSummary")}>
          <PosTotalRow
            label={t("saleReturn.totalAmount")}
            value={formatShopMoney(itemsSubtotal)}
            emphasize
          />

          <PosField
            label={t("saleReturn.refundedAmount", "Cash / bank refund")}
            error={
              errors.refunded_amount
                ? t("saleReturn.refundExceedsTotal")
                : undefined
            }
            hint={t(
              "saleReturn.refundHint",
              "Leave 0 to credit the full amount to the customer account."
            )}
          >
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formValues.refunded_amount}
              onChange={(e) =>
                setFormValues((p) => ({
                  ...p,
                  refunded_amount: e.target.value,
                }))
              }
              placeholder="0.00"
              className={cn(
                posControlClass,
                errors.refunded_amount && "border-destructive"
              )}
            />
          </PosField>

          {refundedNumeric > 0 ? (
            <PosField
              label={t("saleReturn.refundAccount", "Refund from account")}
              required
              error={
                errors.refund_account
                  ? t("saleReturn.refundAccountRequired")
                  : undefined
              }
            >
              <Select
                value={
                  formValues.refund_account?.id
                    ? String(formValues.refund_account.id)
                    : ""
                }
                onValueChange={(v) => {
                  const acc = cashBankAccounts.find(
                    (a) => String(a.id) === String(v)
                  );
                  setFormValues((p) => ({ ...p, refund_account: acc || null }));
                }}
              >
                <SelectTrigger
                  className={cn(
                    posControlClass,
                    errors.refund_account && "border-destructive"
                  )}
                >
                  <SelectValue
                    placeholder={t(
                      "saleReturn.selectRefundAccount",
                      "Select cash/bank…"
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {cashBankAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.code} — {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PosField>
          ) : null}

          <PosTotalRow
            label={t("saleReturn.creditedAmount", "Credited to customer AR")}
            value={formatShopMoney(creditedAmount)}
          />

          <PosField label={t("saleReturn.notes")}>
            <Textarea
              rows={3}
              value={formValues.note}
              onChange={(e) =>
                setFormValues((p) => ({ ...p, note: e.target.value }))
              }
              placeholder={t("saleReturn.notesPlaceholder")}
            />
          </PosField>

          <Button
            type="button"
            className="mt-1 w-full gap-1.5"
            onClick={handleSubmit}
            disabled={saving || loadingReturnable}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {t("saleReturn.saveReturn")}
          </Button>
        </PosSummary>
      </PosBody>
    </PosShell>
  );
};

export default AddSaleReturn;
