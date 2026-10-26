import React, { useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ShoppingCart,
  ArrowLeft,
  Pencil,
  Printer,
  User,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import useFetchObject from "../../../api/useFetchObject";
import { useAuth } from "../../../context/AuthContext";
import {
  calculateSaleLineTotal,
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
import SalesPrint from "./SalesPrint";
import { openThermalPrint } from "../../../utils/thermalPrint";

const formatQty = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

const SalesView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const auth = useAuth();
  const token = auth?.user?.token;
  const printRef = useRef(null);

  const {
    data: sale,
    isLoading,
    isError,
    error,
  } = useFetchObject(["sale", id], "sales", id, token);

  const lines = useMemo(() => {
    const items = Array.isArray(sale?.sale_items) ? sale.sale_items : [];
    return items.map((item) => {
      const product = resolveLineProduct(item);
      return {
        id: item.id,
        name:
          item.inventory_details?.product_name ||
          product.name ||
          "—",
        qty: getLineQuantity(item),
        unitPrice: Number.parseFloat(item.sale_price) || 0,
        lineTotal: calculateSaleLineTotal(item),
      };
    });
  }, [sale]);

  const itemsSubtotal = useMemo(
    () => lines.reduce((sum, row) => sum + row.lineTotal, 0),
    [lines]
  );

  const discountAmount = Math.max(
    0,
    Number.parseFloat(sale?.discount_amount || 0) || 0
  );
  const discountPercent = Math.max(
    0,
    Number.parseFloat(sale?.discount_percent || 0) || 0
  );
  const storedTotal = Math.max(0, Number.parseFloat(sale?.total_amount || 0) || 0);
  const totalAmount =
    itemsSubtotal > 0
      ? Math.max(0, itemsSubtotal - discountAmount)
      : storedTotal;
  const receivedAmount = Math.max(
    0,
    Number.parseFloat(sale?.received_amount || 0) || 0
  );
  const remainingAmount = totalAmount - receivedAmount;

  const paymentStatus = useMemo(() => {
    if (sale?.is_paid || receivedAmount >= totalAmount) {
      return {
        label: t("sales.paid"),
        className: "bg-emerald-500/15 text-emerald-800",
      };
    }
    if (receivedAmount > 0) {
      return {
        label: t("sales.partial"),
        className: "bg-amber-500/15 text-amber-800",
      };
    }
    return {
      label: t("sales.unpaid"),
      className: "bg-destructive/10 text-destructive",
    };
  }, [sale?.is_paid, receivedAmount, totalAmount, t]);

  const saleDate = sale?.sale_date
    ? new Date(sale.sale_date).toLocaleDateString()
    : "—";

  const handlePrint = () => {
    if (!printRef.current || !sale) return;
    openThermalPrint(
      printRef.current.innerHTML,
      `${t("common.print")} - #${sale.id}`
    );
  };

  if (isLoading) return <FullPageLoader />;

  if (isError || !sale) {
    return (
      <PosShell>
        <InlineAlert
          severity="error"
          title={t("common.error")}
          message={error?.message || t("common.errorOccurred")}
        />
        <Button variant="outline" onClick={() => navigate("/app/sales")}>
          <ArrowLeft className="h-4 w-4" />
          {t("common.backToList")}
        </Button>
      </PosShell>
    );
  }

  return (
    <PosShell>
      <PosHeader
        icon={<ShoppingCart className="h-4 w-4" />}
        title={`${t("sales.viewSale", "Sale")} #${sale.id}`}
        subtitle={`${sale.customer_details?.name || t("sales.walkInCustomer", "Walk-in / cash sale")} · ${saleDate}`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => navigate("/app/sales")}
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
              onClick={() => navigate(`/app/sales/${id}/edit`)}
            >
              <Pencil className="h-3.5 w-3.5" />
              {t("common.edit")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => navigate(`/app/sales/returns/add?sale=${id}`)}
            >
              {t("saleReturn.addSaleReturn", "Add Sale Return")}
            </Button>
          </>
        }
      />

      <PosBody>
        <PosMain>
          <PosDocBar title={t("sales.saleDetails", "Sale details")}>
            <PosField label={t("customer.customer")}>
              <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 text-xs font-medium">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">
                  {sale.customer_details?.name ||
                    t("sales.walkInCustomer", "Walk-in / cash sale")}
                </span>
              </div>
            </PosField>

            <PosField label={t("sales.date")}>
              <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 text-xs font-medium">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{saleDate}</span>
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

            {sale.customer_details?.contact ? (
              <PosField label={t("customer.contact")}>
                <div className="flex h-8 items-center rounded-md border border-border bg-muted/30 px-2.5 text-xs">
                  {sale.customer_details.contact}
                </div>
              </PosField>
            ) : null}

            {sale.customer_details?.address ? (
              <PosField label={t("customer.address")} className="sm:col-span-2">
                <div className="flex min-h-8 items-center rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs">
                  {sale.customer_details.address}
                </div>
              </PosField>
            ) : null}
          </PosDocBar>

          <PosItems
            title={t("sales.items")}
            count={lines.length}
          >
            <div className="min-w-[40rem] lg:min-w-0">
              <div className="grid grid-cols-[minmax(10rem,1.6fr)_minmax(6rem,0.8fr)_minmax(5.5rem,0.7fr)_minmax(6rem,0.8fr)] gap-2 border-b border-border bg-muted/40 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                <span>{t("product.name")}</span>
                <span>{t("common.qty", "Qty")}</span>
                <span className="text-end">{t("common.price")}</span>
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

          {sale.notes ? (
            <section className="rounded-xl border border-border bg-card p-3 shadow-soft">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("common.notes")}
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {sale.notes}
              </p>
            </section>
          ) : null}
        </PosMain>

        <PosSummary title={t("payment.summary", "Payment summary")}>
          <div className="border-t border-border pt-2 space-y-1">
            {itemsSubtotal > 0 ? (
              <PosTotalRow
                label={t("sales.subtotal", "Subtotal")}
                value={formatShopMoney(itemsSubtotal)}
              />
            ) : null}
            {discountAmount > 0 ? (
              <PosTotalRow
                label={
                  discountPercent > 0
                    ? `${t("sales.discount", "Discount")} (${discountPercent}%)`
                    : t("sales.discount", "Discount")
                }
                value={`−${formatShopMoney(discountAmount)}`}
                muted
              />
            ) : null}
            <PosTotalRow
              label={t("sales.totalAmount")}
              value={formatShopMoney(totalAmount)}
              emphasize
            />
          </div>
          <PosTotalRow
            label={t("sales.receivedAmount")}
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
              label={t("sales.remainingAmount")}
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
              variant="outline"
              className="h-9 w-full"
              onClick={() => navigate(`/app/sales/${id}/edit`)}
            >
              <Pencil className="h-4 w-4" />
              {t("common.edit")}
            </Button>
          </div>
        </PosSummary>
      </PosBody>

      <div className="hidden">
        <div ref={printRef}>
          <SalesPrint sale={sale} />
        </div>
      </div>
    </PosShell>
  );
};

export default SalesView;
