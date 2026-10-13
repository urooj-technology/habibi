import React, { forwardRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import ThermalReceipt from "@/components/print/ThermalReceipt";
import {
  calculatePricedLineTotal,
  getLineQuantity,
  resolveLineProduct,
} from "../../../utils/measurementConversion";

/** 80mm thermal purchase receipt — essentials only. */
const PurchasePrint = forwardRef(({ purchase }, ref) => {
  const { t } = useTranslation();

  const bill = useMemo(() => {
    if (!purchase) return null;

    const items = Array.isArray(purchase.purchase_items)
      ? purchase.purchase_items
      : [];
    const lines = items.map((item, index) => {
      const product = resolveLineProduct(item);
      const productName =
        item.inventory_details?.product_name ||
        product.name ||
        item.product_details?.name ||
        item.inventory_details?.product_details?.name ||
        "جنس";
      return {
        index: index + 1,
        productName,
        note: item.note || item.line_memo || "",
        qty: getLineQuantity(item),
        unitPrice: Number.parseFloat(item.buy_price) || 0,
        lineTotal: calculatePricedLineTotal(item, item.buy_price),
      };
    });

    const linesSubtotal = lines.reduce((sum, row) => sum + row.lineTotal, 0);
    const storedTotal = Number.parseFloat(purchase.total_amount);
    const invoiceTotal =
      lines.length > 0
        ? linesSubtotal
        : Number.isFinite(storedTotal)
          ? storedTotal
          : 0;
    const receivedAmount = Math.max(
      0,
      Number.parseFloat(purchase.received_amount) || 0
    );
    const remainingAmount = invoiceTotal - receivedAmount;

    const dateSource = purchase.purchase_date || purchase.created_at;
    const date = dateSource ? new Date(dateSource) : new Date();
    const currentDate = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;

    return {
      lines,
      invoiceTotal,
      receivedAmount,
      remainingAmount,
      currentDate,
      supplierName: purchase.supplier_details?.name || "نقدی / بدون ثبت",
      supplierContact: purchase.supplier_details?.contact || "",
      id: purchase.id || "#",
    };
  }, [purchase]);

  if (!purchase || !bill) {
    return (
      <div ref={ref} style={{ padding: 12, textAlign: "center", fontFamily: "Tahoma, sans-serif" }}>
        {t("common.error")}:{" "}
        {t("purchase.noDataToDisplay", "No data to display")}
      </div>
    );
  }

  const totals = [
    { label: "مجموع", value: bill.invoiceTotal, strong: true },
    { label: "پرداخت شده", value: bill.receivedAmount },
    { label: "باقیمانده", value: bill.remainingAmount },
  ];

  return (
    <ThermalReceipt
      ref={ref}
      docTitle="بل خرید"
      docId={bill.id}
      dateLabel={bill.currentDate}
      partyLabel="عرضه کننده"
      partyName={bill.supplierName}
      partyContact={bill.supplierContact}
      lines={bill.lines}
      totals={totals}
      footer="ثبت خرید"
    />
  );
});

PurchasePrint.displayName = "PurchasePrint";

export default PurchasePrint;
