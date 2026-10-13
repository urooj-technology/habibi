import React, { useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Package,
  ArrowLeft,
  Pencil,
  Truck,
  Calendar,
  Wallet,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import useFetchObject from "../../../api/useFetchObject";
import { useAuth } from "../../../context/AuthContext";
import {
  calculatePricedLineTotal,
  getLineQuantity,
  resolveLineProduct,
} from "../../../utils/measurementConversion";
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
  PosItemCell,
} from "@/components/pos/PosShell";
import { FullPageLoader } from "../../../components/LoadingScreen";
import { InlineAlert } from "../../../components/AlertMessage";
import PurchasePrint from "./PurchasePrint";
import { openThermalPrint } from "../../../utils/thermalPrint";

const formatQty = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

const calculatePurchaseLineTotal = (item) =>
  calculatePricedLineTotal(item, item.buy_price);

const PurchaseView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const auth = useAuth();
  const token = auth?.user?.token;

  const {
    data: purchase,
    isLoading,
    isError,
    error,
  } = useFetchObject(["purchase", id], "purchases", id, token);

  const lines = useMemo(() => {
    const items = Array.isArray(purchase?.purchase_items)
      ? purchase.purchase_items
      : [];
    return items.map((item) => {
      const product = resolveLineProduct(item);
      return {
        id: item.id,
        name: product.name || item.product_details?.name || "—",
        note: item.note || item.line_memo || "",
        qty: getLineQuantity(item),
        unitPrice: Number.parseFloat(item.buy_price) || 0,
        lineTotal: calculatePurchaseLineTotal(item),
      };
    });
  }, [purchase]);

  const itemsSubtotal = useMemo(
    () => lines.reduce((sum, row) => sum + row.lineTotal, 0),
    [lines]
  );

  const totalAmount =
    itemsSubtotal > 0
      ? itemsSubtotal
      : Math.max(0, Number.parseFloat(purchase?.total_amount || 0) || 0);
  const receivedAmount = Math.max(
    0,
    Number.parseFloat(purchase?.received_amount || 0) || 0
  );
  const remainingAmount = totalAmount - receivedAmount;

  const paymentStatus = useMemo(() => {
    if (purchase?.is_paid || receivedAmount >= totalAmount) {
      return {
        label: t("purchase.paid", "Paid"),
        className: "bg-emerald-500/15 text-emerald-800",
      };
    }
    if (receivedAmount > 0) {
      return {
        label: t("purchase.partial", "Partial"),
        className: "bg-amber-500/15 text-amber-800",
      };
    }
    return {
      label: t("purchase.unpaid", "Unpaid"),
      className: "bg-destructive/10 text-destructive",
    };
  }, [purchase?.is_paid, receivedAmount, totalAmount, t]);

  const purchaseDate = purchase?.purchase_date
    ? new Date(purchase.purchase_date).toLocaleDateString()
    : "—";

  const printRef = useRef(null);

  const handlePrint = () => {
    if (!printRef.current || !purchase) return;
    openThermalPrint(
      printRef.current.innerHTML,
      `${t("common.print")} - #${purchase.id}`
    );
  };

  if (isLoading) return <FullPageLoader />;

  if (isError || !purchase) {
    return (
      <PosShell>
        <InlineAlert
          severity="error"
          title={t("common.error")}
          message={error?.message || t("common.errorOccurred")}
        />
        <Button variant="outline" onClick={() => navigate("/app/purchases")}>
          <ArrowLeft className="h-4 w-4" />
          {t("common.backToList")}
        </Button>
      </PosShell>
    );
  }

  return (
    <PosShell>
      <PosHeader
        icon={<Package className="h-4 w-4" />}
        title={`${t("purchase.viewPurchase", "Purchase")} #${purchase.id}`}
        subtitle={`${purchase.supplier_details?.name || t("purchase.walkInSupplier", "Cash / unlisted vendor")} · ${purchaseDate}`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => navigate("/app/purchases")}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("common.backToList")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handlePrint}
            >
              <Printer className="h-3.5 w-3.5" />
              {t("common.print")}
            </Button>
            <Button
              size="sm"
              className="h-8"
              onClick={() => navigate(`/app/purchases/${id}/edit`)}
            >
              <Pencil className="h-3.5 w-3.5" />
              {t("common.edit")}
            </Button>
          </>
        }
      />

      <PosBody>
        <PosMain>
          <PosDocBar title={t("purchase.purchaseDetails", "Purchase details")}>
            <PosField label={t("purchase.supplier")}>
              <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 text-xs font-medium">
                <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">
                  {purchase.supplier_details?.name ||
                    t("purchase.walkInSupplier", "Cash / unlisted vendor")}
                </span>
              </div>
            </PosField>

            <PosField label={t("purchase.date", "Purchase date")}>
              <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 text-xs font-medium">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{purchaseDate}</span>
              </div>
            </PosField>

            <PosField label={t("common.status")}>
              <div
                className={cn(
                  "flex h-8 items-center rounded-md px-2.5 text-xs font-semibold",
                  paymentStatus.className
                )}
              >
                {paymentStatus.label}
              </div>
            </PosField>

            {purchase.supplier_details?.contact ? (
              <PosField label={t("supplier.contact")}>
                <div className="flex h-8 items-center rounded-md border border-border bg-muted/30 px-2.5 text-xs">
                  {purchase.supplier_details.contact}
                </div>
              </PosField>
            ) : null}

            {purchase.supplier_details?.address ? (
              <PosField label={t("supplier.address")} className="sm:col-span-2">
                <div className="flex min-h-8 items-center rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs">
                  {purchase.supplier_details.address}
                </div>
              </PosField>
            ) : null}
          </PosDocBar>

          <PosItems title={t("purchase.items", "Purchase items")} count={lines.length}>
            <div className="min-w-[40rem] lg:min-w-0">
              <div className="grid grid-cols-[minmax(10rem,1.6fr)_minmax(6rem,0.8fr)_minmax(5.5rem,0.7fr)_minmax(6rem,0.8fr)] gap-2 border-b border-border bg-muted/40 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                <span>{t("product.name")}</span>
                <span>{t("common.qty", "Qty")}</span>
                <span className="text-end">{t("purchase.buyPrice", "Buy price")}</span>
                <span className="text-end">{t("common.total")}</span>
              </div>

              {lines.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {t("common.noData", "No items")}
                </div>
              ) : (
                lines.map((row) => (
                  <PosCartLine key={row.id} complete>
                    <div className="grid grid-cols-[minmax(10rem,1.6fr)_minmax(6rem,0.8fr)_minmax(5.5rem,0.7fr)_minmax(6rem,0.8fr)] gap-2 items-start">
                      <PosItemCell>
                        <p className="truncate text-sm font-semibold text-foreground">
                          {row.name}
                        </p>
                        {row.note ? (
                          <p className="truncate text-[11px] text-muted-foreground">
                            {t("common.notes")}: {row.note}
                          </p>
                        ) : null}
                      </PosItemCell>
                      <PosItemCell>
                        <p className="text-sm font-semibold tabular-nums">
                          {row.qty > 0 ? formatQty(row.qty) : "—"}
                        </p>
                      </PosItemCell>
                      <PosItemCell className="text-end">
                        <p className="text-sm tabular-nums">
                          {formatShopMoney(row.unitPrice)}
                        </p>
                      </PosItemCell>
                      <PosItemCell className="text-end">
                        <p className="text-sm font-bold tabular-nums text-foreground">
                          {formatShopMoney(row.lineTotal)}
                        </p>
                      </PosItemCell>
                    </div>
                  </PosCartLine>
                ))
              )}
            </div>
          </PosItems>

          {purchase.notes ? (
            <section className="rounded-xl border border-border bg-card p-3 shadow-soft">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("common.notes")}
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {purchase.notes}
              </p>
            </section>
          ) : null}
        </PosMain>

        <PosSummary title={t("payment.summary", "Payment summary")}>
          <PosTotalRow
            label={t("purchase.totalAmount", "Total amount")}
            value={formatShopMoney(totalAmount)}
            emphasize
          />
          <PosTotalRow
            label={t("purchase.receivedAmount", "Paid")}
            value={formatShopMoney(receivedAmount)}
          />
          <div
            className={cn(
              "rounded-md px-2.5 py-2",
              remainingAmount > 0
                ? "bg-destructive/10"
                : "bg-emerald-500/10"
            )}
          >
            <PosTotalRow
              label={t("purchase.remainingAmount", "Remaining")}
              value={formatShopMoney(remainingAmount)}
              emphasize
            />
          </div>

          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            <Button className="h-9 w-full" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              {t("common.print")}
            </Button>
            <Button
              className="h-9 w-full"
              onClick={() => navigate(`/app/purchases/${id}/edit`)}
            >
              <Pencil className="h-4 w-4" />
              {t("common.edit")}
            </Button>
            <Button
              variant="outline"
              className="h-9 w-full"
              onClick={() => navigate("/app/purchases")}
            >
              <ArrowLeft className="h-4 w-4" />
              {t("common.backToList")}
            </Button>
          </div>
        </PosSummary>
      </PosBody>

      <div ref={printRef} className="hidden">
        <PurchasePrint purchase={purchase} />
      </div>
    </PosShell>
  );
};

export default PurchaseView;
