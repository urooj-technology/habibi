import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RotateCcw, ArrowLeft, User, Calendar, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

import useFetchObject from "../../../../api/useFetchObject";
import { useAuth } from "../../../../context/AuthContext";
import {
  calculateSaleLineTotal,
  defaultPricingBase,
  getLineMeasurementEntries,
  resolveLineProduct,
} from "../../../../utils/measurementConversion";
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
} from "@/components/pos/PosShell";
import { FullPageLoader } from "../../../../components/LoadingScreen";
import { InlineAlert } from "../../../../components/AlertMessage";

const money = (amount) =>
  Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const SaleReturnView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const auth = useAuth();
  const token = auth?.user?.token;

  const {
    data: doc,
    isLoading,
    isError,
    error,
  } = useFetchObject(["sales-return", id], "sales-returns", id, token);

  const currencyLabel = doc?.currency === "USD" ? "USD" : "AFN";

  const lines = useMemo(() => {
    const items = Array.isArray(doc?.items) ? doc.items : [];
    return items.map((item) => {
      const product = resolveLineProduct(item);
      const pricingBase = defaultPricingBase(product, item.pricing_base);
      const entries = getLineMeasurementEntries(item, product);
      const priced =
        entries.find((m) => m.unit === pricingBase) || entries[0] || null;
      return {
        id: item.id,
        name: item.inventory_details?.product_name || product.name || "—",
        note: item.note || "",
        thickness: item.inventory_details?.thickness || "",
        qty: priced?.amount ?? 0,
        qtyUnit: priced?.unit || pricingBase || "",
        unitPrice: Number.parseFloat(item.sale_price) || 0,
        lineTotal: calculateSaleLineTotal(item),
      };
    });
  }, [doc]);

  const total = Number(doc?.total_amount || 0);
  const refunded = Number(doc?.refunded_amount || 0);
  const credited = Number(
    doc?.credited_amount != null ? doc.credited_amount : total - refunded
  );

  if (isLoading) return <FullPageLoader />;
  if (isError || !doc) {
    return (
      <PosShell>
        <InlineAlert
          severity="error"
          message={
            error?.message || t("saleReturn.notFound", "Sale return not found.")
          }
        />
        <Button variant="outline" onClick={() => navigate("/app/sales/returns")}>
          <ArrowLeft className="h-4 w-4" />
          {t("common.back", "Back")}
        </Button>
      </PosShell>
    );
  }

  return (
    <PosShell>
      <PosHeader
        icon={<RotateCcw className="h-4 w-4" />}
        title={`${t("saleReturn.returnNumber", "Return")} #${doc.id}`}
        subtitle={t("saleReturn.returnDetails")}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => navigate("/app/sales/returns")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("common.back", "Back")}
          </Button>
        }
      />

      <PosBody>
        <PosMain>
          <PosDocBar title={t("saleReturn.returnDetails")}>
            <PosField label={t("saleReturn.sale")}>
              <button
                type="button"
                className="flex h-8 w-full items-center rounded-md border border-border bg-muted/30 px-2.5 text-xs font-semibold text-primary hover:underline"
                onClick={() => navigate(`/app/sales/${doc.sale}`)}
              >
                #{doc.sale || doc.sale_details?.id}
              </button>
            </PosField>
            <PosField label={t("saleReturn.returnDate")}>
              <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 text-xs tabular-nums">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {(doc.return_date || "").toString().slice(0, 10)}
              </div>
            </PosField>
            <PosField label={t("saleReturn.customer")}>
              <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 text-xs">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">
                  {doc.customer_details?.name || "—"}
                </span>
              </div>
            </PosField>
            <PosField label={t("common.currency")}>
              <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 text-xs">
                <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                {currencyLabel}
              </div>
            </PosField>
            {doc.note ? (
              <PosField label={t("saleReturn.notes")} className="sm:col-span-2">
                <div className="min-h-8 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground">
                  {doc.note}
                </div>
              </PosField>
            ) : null}
          </PosDocBar>

          <PosItems title={t("saleReturn.returnedItems")} count={lines.length}>
            <div className="min-w-[40rem] lg:min-w-0">
              <div className="grid grid-cols-[minmax(10rem,1.6fr)_minmax(6rem,0.8fr)_minmax(5.5rem,0.7fr)_minmax(6rem,0.8fr)] gap-2 border-b border-border bg-muted/40 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                <span>{t("product.name", "Product")}</span>
                <span>{t("common.qty", "Qty")}</span>
                <span className="text-end">{t("common.price")}</span>
                <span className="text-end">{t("common.total")}</span>
              </div>
              {lines.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {t("saleReturn.noReturnItemsAdded")}
                </div>
              ) : (
                lines.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[minmax(10rem,1.6fr)_minmax(6rem,0.8fr)_minmax(5.5rem,0.7fr)_minmax(6rem,0.8fr)] gap-2 border-b border-border px-3 py-2.5 text-sm last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{row.name}</p>
                      {(row.thickness || row.note) && (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {[row.thickness, row.note].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="tabular-nums self-center">
                      {row.qty} {row.qtyUnit}
                    </div>
                    <div className="tabular-nums self-center text-end">
                      {money(row.unitPrice)}
                    </div>
                    <div className="tabular-nums self-center text-end font-semibold">
                      {money(row.lineTotal)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </PosItems>
        </PosMain>

        <PosSummary title={t("saleReturn.returnSummary")}>
          <PosTotalRow
            label={t("saleReturn.totalAmount")}
            value={`${money(total)} ${currencyLabel}`}
            emphasize
          />
          <PosTotalRow
            label={t("saleReturn.refundedAmount", "Cash / bank refund")}
            value={`${money(refunded)} ${currencyLabel}`}
          />
          <PosTotalRow
            label={t("saleReturn.creditedAmount", "Credited to customer AR")}
            value={`${money(credited)} ${currencyLabel}`}
          />
        </PosSummary>
      </PosBody>
    </PosShell>
  );
};

export default SaleReturnView;
