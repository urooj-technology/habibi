import React, { forwardRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import ThermalReceipt from "@/components/print/ThermalReceipt";
import {
  calculateSaleLineTotal,
  getLineQuantity,
  resolveLineProduct,
} from "../../../utils/measurementConversion";

/** 80mm thermal sale receipt — localized labels. */
const SalesPrint = forwardRef(({ sale }, ref) => {
  const { t, i18n } = useTranslation();

  const bill = useMemo(() => {
    if (!sale) return null;

    const items = Array.isArray(sale.sale_items) ? sale.sale_items : [];
    const lines = items.map((item, index) => {
      const product = resolveLineProduct(item);
      const productName =
        item.inventory_details?.product_name ||
        product.name ||
        item.inventory_details?.product_details?.name ||
        t("common.product", "Item");
      return {
        index: index + 1,
        productName,
        qty: getLineQuantity(item),
        unitPrice: Number.parseFloat(item.sale_price) || 0,
        lineTotal: calculateSaleLineTotal(item),
      };
    });

    const linesSubtotal = lines.reduce((sum, row) => sum + row.lineTotal, 0);
    const storedTotal = Number.parseFloat(sale.total_amount);
    const invoiceTotal =
      lines.length > 0
        ? linesSubtotal
        : Number.isFinite(storedTotal)
          ? storedTotal
          : 0;
    const receivedAmount = Math.max(
      0,
      Number.parseFloat(sale.received_amount) || 0
    );
    const remainingAmount = invoiceTotal - receivedAmount;

    const dateSource = sale.sale_date || sale.created_at;
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
      customerName:
        sale.customer_details?.name ||
        t("sales.walkInCustomer", "Walk-in / cash sale"),
      customerContact: sale.customer_details?.contact || "",
      id: sale.id || "#",
    };
  }, [sale, t, i18n.language]);

  if (!sale || !bill) {
    return (
      <div
        ref={ref}
        style={{
          padding: 12,
          textAlign: "center",
          fontFamily: "Tahoma, sans-serif",
        }}
      >
        {t("common.error")}: {t("sales.noDataToDisplay")}
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
      docTitle={t("receipt.saleBill", "Sale bill")}
      docId={bill.id}
      dateLabel={bill.currentDate}
      partyLabel={t("receipt.customer", "Customer")}
      partyName={bill.customerName}
      partyContact={bill.customerContact}
      lines={bill.lines}
      totals={totals}
      footer={t("receipt.thankYouSale", "Thank you for your purchase")}
    />
  );
});

SalesPrint.displayName = "SalesPrint";

export default SalesPrint;
