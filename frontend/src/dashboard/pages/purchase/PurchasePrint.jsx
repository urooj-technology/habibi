import React, { forwardRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import ThermalReceipt from "@/components/print/ThermalReceipt";
import {
  calculatePricedLineTotal,
  getLineQuantity,
  resolveLineProduct,
} from "../../../utils/measurementConversion";

/** POS-80 thermal purchase receipt — localized labels. */
const PurchasePrint = forwardRef(({ purchase }, ref) => {
  const { t, i18n } = useTranslation();

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
        t("common.product", "Item");
      return {
        index: index + 1,
        productName,
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
    const locale =
      i18n.language === "da" ? "fa-AF" : i18n.language === "ps" ? "ps-AF" : "en-GB";
    const currentDate = date.toLocaleDateString(locale);

    return {
      lines,
      invoiceTotal,
      receivedAmount,
      remainingAmount,
      currentDate,
      supplierName:
        purchase.supplier_details?.name ||
        t("purchase.walkInSupplier", "Cash / unlisted vendor"),
      supplierContact: purchase.supplier_details?.contact || "",
      id: purchase.id || "#",
    };
  }, [purchase, t, i18n.language]);

  if (!purchase || !bill) {
    return (
      <div
        ref={ref}
        style={{
          padding: 12,
          textAlign: "center",
          fontFamily: "Tahoma, sans-serif",
        }}
      >
        {t("common.error")}:{" "}
        {t("purchase.noDataToDisplay", "No data to display")}
      </div>
    );
  }

  const totals = [
    {
      label: t("receipt.total", "Total"),
      value: bill.invoiceTotal,
      strong: true,
    },
    {
      label: t("receipt.paid", "Paid"),
      value: bill.receivedAmount,
    },
    {
      label: t("receipt.remaining", "Remaining"),
      value: bill.remainingAmount,
    },
  ];

  return (
    <ThermalReceipt
      ref={ref}
      docTitle={t("receipt.purchaseBill", "Purchase bill")}
      docId={bill.id}
      dateLabel={bill.currentDate}
      partyLabel={t("receipt.supplier", "Supplier")}
      partyName={bill.supplierName}
      partyContact={bill.supplierContact}
      lines={bill.lines}
      totals={totals}
      footer={t("receipt.thankYouPurchase", "Purchase recorded")}
    />
  );
});

PurchasePrint.displayName = "PurchasePrint";

export default PurchasePrint;
