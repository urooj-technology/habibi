import React, { forwardRef } from "react";
import { useTranslation } from "react-i18next";

const FONT =
  "Tahoma, 'Segoe UI', 'Noto Naskh Arabic', 'Noto Sans Arabic', Arial, sans-serif";

export function formatMoney(num) {
  return Number(num || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatQty(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/**
 * Compact 80mm thermal receipt — labels follow active UI language.
 */
const ThermalReceipt = forwardRef(function ThermalReceipt(
  {
    docTitle,
    docId,
    dateLabel,
    partyLabel,
    partyName,
    partyContact,
    lines = [],
    totals = [],
    footer,
  },
  ref
) {
  const { t } = useTranslation();
  const shopName = t("common.shortName", "Poshak Habibi");
  const phone = t("receipt.phone", "0778450873 — 0782210000");

  return (
    <div ref={ref} style={s.page}>
      <header style={s.header}>
        <div style={s.shopName}>{shopName}</div>
        <div style={s.shopMeta}>{phone}</div>
      </header>

      <div style={s.rule} />

      <div style={s.docTitle}>{docTitle}</div>

      <div style={s.metaBlock}>
        <MetaRow label={t("receipt.number", "No.")} value={`#${docId}`} />
        <MetaRow label={t("receipt.date", "Date")} value={dateLabel} />
        <MetaRow label={partyLabel} value={partyName} />
        {partyContact ? (
          <MetaRow label={t("receipt.contact", "Contact")} value={partyContact} />
        ) : null}
      </div>

      <div style={s.rule} />

      <div style={s.colHead}>
        <span style={s.colItem}>{t("receipt.item", "Item")}</span>
        <span style={s.colQty}>{t("receipt.qty", "Qty")}</span>
        <span style={s.colPrice}>{t("receipt.price", "Price")}</span>
        <span style={s.colTotal}>{t("receipt.amount", "Amount")}</span>
      </div>

      <div style={s.dash} />

      {lines.length === 0 ? (
        <div style={s.empty}>—</div>
      ) : (
        lines.map((row) => (
          <div key={row.index} style={s.lineBlock}>
            <div style={s.lineName}>
              {row.index}. {row.productName}
            </div>
            <div style={s.lineNums}>
              <span style={s.colItem} />
              <span style={s.colQty}>{formatQty(row.qty)}</span>
              <span style={s.colPrice}>{formatMoney(row.unitPrice)}</span>
              <span style={{ ...s.colTotal, fontWeight: 700 }}>
                {formatMoney(row.lineTotal)}
              </span>
            </div>
          </div>
        ))
      )}

      <div style={s.rule} />

      <div style={s.totals}>
        {totals.map((row) => (
          <div
            key={row.label}
            style={{
              ...s.totalRow,
              ...(row.strong ? s.totalStrong : null),
            }}
          >
            <span>{row.label}</span>
            <span style={s.totalValue}>{formatMoney(row.value)}</span>
          </div>
        ))}
      </div>

      <div style={s.dash} />

      <footer style={s.footer}>
        {footer || t("receipt.thankYou", "Thank you")}
      </footer>
    </div>
  );
});

function MetaRow({ label, value }) {
  return (
    <div style={s.metaRow}>
      <span style={s.metaLabel}>{label}</span>
      <span style={s.metaValue}>{value}</span>
    </div>
  );
}

const s = {
  page: {
    width: "72mm",
    maxWidth: "72mm",
    margin: "0 auto",
    padding: "3mm 2.5mm 4mm",
    background: "#fff",
    color: "#000",
    fontFamily: FONT,
    fontSize: "11px",
    lineHeight: 1.35,
    direction: "inherit",
    boxSizing: "border-box",
  },
  header: {
    textAlign: "center",
    marginBottom: 4,
  },
  shopName: {
    fontSize: "16px",
    fontWeight: 800,
    letterSpacing: "0.02em",
    lineHeight: 1.2,
  },
  shopMeta: {
    marginTop: 2,
    fontSize: "10px",
    fontWeight: 600,
  },
  rule: {
    borderTop: "1.5px solid #000",
    margin: "5px 0",
  },
  dash: {
    borderTop: "1px dashed #000",
    margin: "4px 0",
  },
  docTitle: {
    textAlign: "center",
    fontSize: "12px",
    fontWeight: 800,
    marginBottom: 4,
  },
  metaBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "baseline",
  },
  metaLabel: {
    fontSize: "10px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  metaValue: {
    fontSize: "11px",
    fontWeight: 700,
    textAlign: "end",
    wordBreak: "break-word",
  },
  colHead: {
    display: "flex",
    gap: 2,
    fontSize: "9px",
    fontWeight: 800,
    textAlign: "center",
  },
  colItem: { flex: "1 1 auto", textAlign: "start", minWidth: 0 },
  colQty: { width: "14mm", flexShrink: 0, textAlign: "center" },
  colPrice: { width: "16mm", flexShrink: 0, textAlign: "center" },
  colTotal: { width: "18mm", flexShrink: 0, textAlign: "end" },
  empty: {
    textAlign: "center",
    padding: "6px 0",
    fontSize: "10px",
  },
  lineBlock: {
    padding: "3px 0",
    borderBottom: "1px dotted #999",
  },
  lineName: {
    fontSize: "11px",
    fontWeight: 700,
    wordBreak: "break-word",
  },
  lineNums: {
    display: "flex",
    gap: 2,
    marginTop: 2,
    fontSize: "10px",
    fontVariantNumeric: "tabular-nums",
  },
  totals: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    fontSize: "11px",
    fontWeight: 600,
  },
  totalStrong: {
    fontSize: "12px",
    fontWeight: 800,
    borderTop: "1px solid #000",
    paddingTop: 3,
    marginTop: 1,
  },
  totalValue: {
    fontVariantNumeric: "tabular-nums",
    fontWeight: 800,
    textAlign: "end",
  },
  footer: {
    textAlign: "center",
    fontSize: "10px",
    fontWeight: 700,
    marginTop: 2,
  },
};

export default ThermalReceipt;
