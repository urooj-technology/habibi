import React, { forwardRef } from "react";
import { COMPANY } from "@/utils/printDocument";

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
 * Compact 80mm thermal receipt shell — black/white, no fillers.
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
  return (
    <div ref={ref} style={s.page}>
      <header style={s.header}>
        <div style={s.shopName}>{COMPANY.name}</div>
        <div style={s.shopMeta}>{COMPANY.phone.replace(/^تلفن:\s*/, "")}</div>
      </header>

      <div style={s.rule} />

      <div style={s.docTitle}>{docTitle}</div>

      <div style={s.metaBlock}>
        <MetaRow label="شماره" value={`#${docId}`} />
        <MetaRow label="تاریخ" value={dateLabel} />
        <MetaRow label={partyLabel} value={partyName} />
        {partyContact ? <MetaRow label="تماس" value={partyContact} /> : null}
      </div>

      <div style={s.rule} />

      <div style={s.colHead}>
        <span style={s.colItem}>جنس</span>
        <span style={s.colQty}>مقدار</span>
        <span style={s.colPrice}>فی</span>
        <span style={s.colTotal}>مبلغ</span>
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
            {row.note ? <div style={s.lineNote}>{row.note}</div> : null}
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

      <footer style={s.footer}>{footer || "تشکر از خرید شما"}</footer>
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
    direction: "rtl",
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
    textAlign: "left",
    wordBreak: "break-word",
  },
  colHead: {
    display: "flex",
    gap: 2,
    fontSize: "9px",
    fontWeight: 800,
    textAlign: "center",
  },
  colItem: { flex: "1 1 auto", textAlign: "right", minWidth: 0 },
  colQty: { width: "14mm", flexShrink: 0, textAlign: "center" },
  colPrice: { width: "16mm", flexShrink: 0, textAlign: "center" },
  colTotal: { width: "18mm", flexShrink: 0, textAlign: "left" },
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
  lineNote: {
    fontSize: "9px",
    opacity: 0.75,
    marginTop: 1,
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
    textAlign: "left",
  },
  footer: {
    textAlign: "center",
    fontSize: "10px",
    fontWeight: 700,
    marginTop: 2,
  },
};

export default ThermalReceipt;
