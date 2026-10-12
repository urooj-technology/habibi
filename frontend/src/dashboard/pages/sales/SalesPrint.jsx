import React, { forwardRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  calculateSaleLineTotal,
  getLineQuantity,
  resolveLineProduct,
} from "../../../utils/measurementConversion";

/**
 * Print-ready RTL sales bill.
 * Line total = sale_price × quantity.
 * Freight (کرایه) is informational and never added to the bill total.
 */
const SalesPrint = forwardRef(({ sale }, ref) => {
  const { t } = useTranslation();

  const bill = useMemo(() => {
    if (!sale) return null;

    const items = Array.isArray(sale.sale_items) ? sale.sale_items : [];
    const lines = items.map((item, index) => {
      const product = resolveLineProduct(item);
      const productName =
        item.inventory_details?.product_name ||
        product.name ||
        item.inventory_details?.product_details?.name ||
        "جنس";
      const qty = getLineQuantity(item);
      const unitPrice = Number.parseFloat(item.sale_price) || 0;
      const lineTotal = calculateSaleLineTotal(item);

      return {
        index: index + 1,
        productName,
        note: item.note || "",
        qty,
        unitPrice,
        lineTotal,
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
    const freightAmount = Math.max(0, Number.parseFloat(sale.freight_amount) || 0);
    const receivedAmount = Math.max(0, Number.parseFloat(sale.received_amount) || 0);
    const remainingAmount = invoiceTotal - receivedAmount;

    const dateSource = sale.sale_date || sale.created_at;
    const date = dateSource ? new Date(dateSource) : new Date();
    const currentDate = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;

    return {
      lines,
      linesSubtotal,
      invoiceTotal,
      freightAmount,
      receivedAmount,
      remainingAmount,
      currentDate,
      customerName: sale.customer_details?.name || "نقدی / حضوری",
      customerContact: sale.customer_details?.contact || "",
      id: sale.id || "#",
    };
  }, [sale]);

  const formatNumber = (num) =>
    Number(num || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatQty = (amount) => {
    const n = Number(amount);
    if (!Number.isFinite(n)) return "—";
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
  };

  if (!sale || !bill) {
    return (
      <div ref={ref} style={s.errorBox}>
        <div style={s.errorText}>
          {t("common.error")}: {t("sales.noDataToDisplay")}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} style={s.page}>
      {/* Masthead */}
      <header style={s.masthead}>
        <div style={s.brandBlock}>
          <div style={s.brandMark} />
          <div>
            <h1 style={s.companyName}>پوشاک حبیبی</h1>
            <p style={s.companyTag}>
              فروشگاه پوشاک — عرضه کننده انواع لباس مردانه، زنانه و بچه‌گانه
            </p>
          </div>
        </div>
        <div style={s.contactRow}>
          <span>تلفن: 0778450873 — 0782210000</span>
          <span>آدرس: سرک سوم شاه شهید، روبروی مسجد شاه</span>
        </div>
      </header>

      {/* Meta strip */}
      <section style={s.metaStrip}>
        <div style={s.metaCustomer}>
          <div style={s.metaLabel}>مشتری</div>
          <div style={s.metaValueStrong}>{bill.customerName}</div>
          {bill.customerContact ? (
            <div style={s.metaMuted}>{bill.customerContact}</div>
          ) : null}
        </div>
        <div style={s.metaDoc}>
          <div style={s.docBadge}>بل فروش</div>
          <div style={s.metaPair}>
            <span style={s.metaLabel}>شماره</span>
            <span style={s.metaValueStrong}>#{bill.id}</span>
          </div>
          <div style={s.metaPair}>
            <span style={s.metaLabel}>تاریخ</span>
            <span style={s.metaValue}>{bill.currentDate}</span>
          </div>
        </div>
      </section>

      {/* Lines */}
      <section style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, width: 44 }}>#</th>
              <th style={{ ...s.th, textAlign: "right" }}>جنس</th>
              <th style={{ ...s.th, textAlign: "right", width: 120 }}>نوت</th>
              <th style={{ ...s.th, width: 130 }}>مقدار</th>
              <th style={{ ...s.th, width: 88 }}>فی</th>
              <th style={{ ...s.th, width: 110 }}>مجموع</th>
            </tr>
          </thead>
          <tbody>
            {bill.lines.length === 0 ? (
              <tr>
                <td colSpan={6} style={s.tdEmpty}>
                  هیچ موردی برای نمایش وجود ندارد
                </td>
              </tr>
            ) : (
              bill.lines.map((row) => (
                <tr key={row.index}>
                  <td style={s.tdCenter}>{row.index}</td>
                  <td style={{ ...s.td, textAlign: "right" }}>
                    <div style={s.productName}>{row.productName}</div>
                  </td>
                  <td style={{ ...s.td, textAlign: "right", color: "#64748b" }}>
                    {row.note || "—"}
                  </td>
                  <td style={s.tdCenter}>
                    {!row.qty ? (
                      "—"
                    ) : (
                      <span style={s.qtySingle}>{formatQty(row.qty)}</span>
                    )}
                  </td>
                  <td style={s.tdCenter}>{formatNumber(row.unitPrice)}</td>
                  <td style={{ ...s.tdCenter, fontWeight: 700 }}>
                    {formatNumber(row.lineTotal)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Totals + logistics */}
      <section style={s.bottomGrid}>
        <div style={s.logistics}>
          <div style={s.sectionTitle}>اطلاعات انتقال</div>
          {[
            "نام درایور",
            "نمبر پلیت",
            "شماره درایور",
            "مقطع انتقال",
          ].map((label) => (
            <div key={label} style={s.fillRow}>
              <span style={s.fillLabel}>{label}</span>
              <span style={s.fillLine} />
            </div>
          ))}
        </div>

        <div style={s.totalsCard}>
          <div style={s.totalRow}>
            <span>مجموع اقلام</span>
            <strong>{formatNumber(bill.invoiceTotal)}</strong>
          </div>
          <div style={{ ...s.totalRow, ...s.totalMuted }}>
            <span>
              کرایه
              <span style={s.infoTag}> اطلاعاتی </span>
            </span>
            <span>{formatNumber(bill.freightAmount)}</span>
          </div>
          <div style={{ ...s.totalRow, ...s.totalEmph }}>
            <span>جمع قابل پرداخت</span>
            <strong>{formatNumber(bill.invoiceTotal)}</strong>
          </div>
          <div style={s.totalRow}>
            <span>پرداخت شده</span>
            <span>{formatNumber(bill.receivedAmount)}</span>
          </div>
          <div style={{ ...s.totalRow, ...s.remainingRow }}>
            <span>باقیمانده</span>
            <strong>{formatNumber(bill.remainingAmount)}</strong>
          </div>
        </div>
      </section>

      <footer style={s.footerNote}>
        کرایه در جمع قابل پرداخت محاسبه نمی‌شود — فقط برای ثبت اطلاعات است.
      </footer>
    </div>
  );
});

const s = {
  page: {
    width: "100%",
    minHeight: "100vh",
    margin: 0,
    padding: "0 0 28px",
    background: "#fff",
    color: "#0f172a",
    fontFamily:
      "'Segoe UI', Tahoma, 'Noto Naskh Arabic', 'Noto Sans Arabic', Arial, sans-serif",
    boxSizing: "border-box",
    direction: "rtl",
    WebkitPrintColorAdjust: "exact",
    printColorAdjust: "exact",
  },
  masthead: {
    padding: "22px 28px 18px",
    borderBottom: "3px solid #0f766e",
    background:
      "linear-gradient(180deg, #f8fafc 0%, #ffffff 70%)",
  },
  brandBlock: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 12,
  },
  brandMark: {
    width: 6,
    minHeight: 54,
    borderRadius: 4,
    background: "linear-gradient(180deg, #0f766e, #134e4a)",
    flexShrink: 0,
  },
  companyName: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    lineHeight: 1.35,
    color: "#0f172a",
  },
  companyTag: {
    margin: "6px 0 0",
    fontSize: 13,
    lineHeight: 1.55,
    color: "#475569",
    fontWeight: 500,
  },
  contactRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    fontSize: 12.5,
    color: "#334155",
    borderTop: "1px solid #e2e8f0",
    paddingTop: 10,
  },
  metaStrip: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    padding: "16px 28px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  metaCustomer: {
    flex: "1 1 auto",
    minWidth: 0,
  },
  metaDoc: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
    minWidth: 160,
  },
  docBadge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 999,
    background: "#0f766e",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: 600,
  },
  metaValue: {
    fontSize: 13.5,
    fontWeight: 600,
    color: "#1e293b",
  },
  metaValueStrong: {
    fontSize: 16,
    fontWeight: 800,
    color: "#0f172a",
  },
  metaMuted: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748b",
  },
  metaPair: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
  },
  tableWrap: {
    padding: "18px 28px 8px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },
  th: {
    padding: "10px 8px",
    background: "#0f172a",
    color: "#fff",
    fontSize: 12.5,
    fontWeight: 700,
    textAlign: "center",
    border: "1px solid #1e293b",
  },
  td: {
    padding: "10px 8px",
    border: "1px solid #e2e8f0",
    fontSize: 13,
    verticalAlign: "middle",
    background: "#fff",
  },
  tdCenter: {
    padding: "10px 8px",
    border: "1px solid #e2e8f0",
    fontSize: 13,
    textAlign: "center",
    verticalAlign: "middle",
    background: "#fff",
  },
  tdEmpty: {
    padding: 24,
    textAlign: "center",
    color: "#94a3b8",
    border: "1px solid #e2e8f0",
  },
  productName: {
    fontWeight: 700,
    color: "#0f172a",
  },
  productMeta: {
    marginTop: 2,
    fontSize: 11,
    color: "#64748b",
  },
  qtySingle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0f172a",
    whiteSpace: "nowrap",
  },
  bottomGrid: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    padding: "12px 28px 0",
    alignItems: "stretch",
  },
  logistics: {
    flex: "1 1 48%",
    padding: "14px 16px",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    background: "#fafafa",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: "#334155",
    marginBottom: 12,
    letterSpacing: "0.04em",
  },
  fillRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 14,
  },
  fillLabel: {
    fontSize: 12.5,
    color: "#475569",
    whiteSpace: "nowrap",
    fontWeight: 600,
  },
  fillLine: {
    flex: 1,
    borderBottom: "1px dotted #94a3b8",
    height: 14,
  },
  totalsCard: {
    width: 300,
    flexShrink: 0,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    overflow: "hidden",
    background: "#fff",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    fontSize: 13,
    borderBottom: "1px solid #e2e8f0",
    color: "#334155",
  },
  totalMuted: {
    background: "#f8fafc",
    color: "#64748b",
    fontSize: 12.5,
  },
  infoTag: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: 500,
  },
  totalEmph: {
    background: "#0f766e",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    borderBottom: "none",
  },
  remainingRow: {
    background: "#fff7ed",
    color: "#9a3412",
    fontWeight: 700,
    borderBottom: "none",
  },
  footerNote: {
    marginTop: 16,
    padding: "0 28px",
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center",
  },
  errorBox: {
    padding: 24,
    textAlign: "center",
  },
  errorText: {
    color: "#dc2626",
    fontWeight: 700,
  },
};

SalesPrint.displayName = "SalesPrint";

export default SalesPrint;
