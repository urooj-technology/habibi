import React, { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { shopAddressLine, shopPhoneLine } from "@/config/shopConfig";

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
 * POS-80 thermal receipt (80mm roll, 72mm printable width).
 * Clean professional layout — labels follow the active UI language.
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
  const phone = shopPhoneLine();
  const address = shopAddressLine();
  const itemCount = lines.length;
  const totalQty = lines.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
  const grand = totals.find((r) => r.strong);
  const restTotals = totals.filter((r) => !r.strong);

  return (
    <div ref={ref} style={s.page}>
      {/* ── Shop header ─────────────────────────────── */}
      <header style={s.header}>
        <div style={s.shopName}>{shopName}</div>
        <div style={s.shopPhone}>{phone}</div>
        <div style={s.shopAddress}>{address}</div>
      </header>

      {/* ── Document title ──────────────────────────── */}
      <div style={s.titleRow}>
        <span style={s.titleLine} />
        <span style={s.titleText}>{docTitle}</span>
        <span style={s.titleLine} />
      </div>

      {/* ── Meta: number / date / party ─────────────── */}
      <div style={s.metaGrid}>
        <MetaRow label={t("receipt.number", "No.")} value={`#${docId}`} />
        <MetaRow label={t("receipt.date", "Date")} value={dateLabel} />
      </div>
      <div style={s.metaBlock}>
        <MetaRow label={partyLabel} value={partyName} strong />
        {partyContact ? (
          <MetaRow label={t("receipt.contact", "Contact")} value={partyContact} />
        ) : null}
      </div>

      {/* ── Items table ─────────────────────────────── */}
      <div style={s.tableHead}>
        <span style={s.cIdx}>#</span>
        <span style={s.cItem}>{t("receipt.item", "Item")}</span>
        <span style={s.cQty}>{t("receipt.qty", "Qty")}</span>
        <span style={s.cPrice}>{t("receipt.price", "Price")}</span>
        <span style={s.cAmt}>{t("receipt.amount", "Amount")}</span>
      </div>

      {itemCount === 0 ? (
        <div style={s.empty}>—</div>
      ) : (
        lines.map((row, idx) => (
          <div
            key={row.index}
            style={{
              ...s.lineRow,
              ...(idx === itemCount - 1 ? { borderBottom: "none" } : null),
            }}
          >
            <span style={s.cIdx}>{row.index}</span>
            <span style={s.cItemName}>{row.productName}</span>
            <span style={{ ...s.cQty, ...s.num }}>{formatQty(row.qty)}</span>
            <span style={{ ...s.cPrice, ...s.num }}>{formatMoney(row.unitPrice)}</span>
            <span style={{ ...s.cAmt, ...s.num, ...s.lineTotal }}>
              {formatMoney(row.lineTotal)}
            </span>
          </div>
        ))
      )}

      {/* ── Summary ─────────────────────────────────── */}
      <div style={s.summaryMeta}>
        <span>
          {t("receipt.items", "Items")}: <b style={s.num}>{itemCount}</b>
        </span>
        <span>
          {t("receipt.qty", "Qty")}: <b style={s.num}>{formatQty(totalQty)}</b>
        </span>
      </div>

      <div style={s.totalsBox}>
        {restTotals.map((row) => (
          <div key={row.label} style={s.totalRow}>
            <span>{row.label}</span>
            <span style={s.num}>{formatMoney(row.value)}</span>
          </div>
        ))}
        {grand ? (
          <div style={s.grandTotal}>
            <span>{grand.label}</span>
            <span style={s.num}>{formatMoney(grand.value)}</span>
          </div>
        ) : null}
      </div>

      {/* ── Footer ──────────────────────────────────── */}
      <footer style={s.footer}>
        <div style={s.thanks}>{footer || t("receipt.thankYou", "Thank you")}</div>
        <div style={s.footMeta}>
          #{docId} · {dateLabel}
        </div>
      </footer>

      <div style={s.cutLine}>
        <span style={s.scissors}>✂</span>
      </div>
    </div>
  );
});

function MetaRow({ label, value, strong }) {
  return (
    <div style={s.metaRow}>
      <span style={s.metaLabel}>{label}</span>
      <span style={{ ...s.metaValue, ...(strong ? s.metaValueStrong : null) }}>
        {value}
      </span>
    </div>
  );
}

/* Column widths sum to the 72mm printable area of POS-80. */
const s = {
  page: {
    width: "72mm",
    maxWidth: "72mm",
    margin: "0 auto",
    padding: "4mm 2mm 3mm",
    background: "#fff",
    color: "#000",
    fontFamily: FONT,
    fontSize: "11px",
    fontWeight: 600,
    lineHeight: 1.35,
    direction: "inherit",
    boxSizing: "border-box",
  },

  /* Header */
  header: { textAlign: "center" },
  shopName: { fontSize: "20px", fontWeight: 900, lineHeight: 1.15, letterSpacing: "0.01em" },
  shopPhone: {
    marginTop: "1mm",
    fontSize: "11px",
    fontWeight: 800,
    unicodeBidi: "plaintext",
    letterSpacing: "0.04em",
  },
  shopAddress: { marginTop: "0.5mm", fontSize: "9.5px", fontWeight: 600, lineHeight: 1.3 },

  /* Title */
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "2mm",
    margin: "3mm 0 2mm",
  },
  titleLine: { flex: 1, borderTop: "2px solid #000" },
  titleText: {
    fontSize: "13px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
  },

  /* Meta */
  metaGrid: {
    display: "flex",
    gap: "4mm",
  },
  metaBlock: { marginTop: "0.8mm" },
  metaRow: {
    flex: 1,
    display: "flex",
    justifyContent: "space-between",
    gap: "2mm",
    alignItems: "baseline",
    minWidth: 0,
  },
  metaLabel: { fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" },
  metaValue: {
    fontSize: "11px",
    fontWeight: 800,
    textAlign: "end",
    wordBreak: "break-word",
    unicodeBidi: "plaintext",
  },
  metaValueStrong: { fontSize: "12px", fontWeight: 900 },

  /* Items table */
  tableHead: {
    display: "flex",
    alignItems: "center",
    gap: "1mm",
    background: "#000",
    color: "#fff",
    fontSize: "9.5px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    padding: "1.2mm 1mm",
    marginTop: "2.5mm",
    borderRadius: "0.8mm",
  },
  cIdx: { width: "5mm", flexShrink: 0, textAlign: "center" },
  cItem: { flex: "1 1 auto", minWidth: 0, textAlign: "start" },
  cItemName: {
    flex: "1 1 auto",
    minWidth: 0,
    textAlign: "start",
    fontSize: "11.5px",
    fontWeight: 800,
    lineHeight: 1.25,
    wordBreak: "break-word",
  },
  cQty: { width: "10mm", flexShrink: 0, textAlign: "center" },
  cPrice: { width: "17mm", flexShrink: 0, textAlign: "end" },
  cAmt: { width: "19mm", flexShrink: 0, textAlign: "end" },
  lineRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1mm",
    padding: "1.4mm 1mm",
    borderBottom: "1px dashed #888",
    fontVariantNumeric: "tabular-nums",
  },
  lineTotal: { fontSize: "11.5px", fontWeight: 900 },
  empty: { textAlign: "center", padding: "3mm 0", fontSize: "11px" },

  /* Summary */
  summaryMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "10px",
    fontWeight: 700,
    padding: "1.5mm 1mm 0",
  },
  totalsBox: {
    marginTop: "1.5mm",
    borderTop: "2px solid #000",
    paddingTop: "1.5mm",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "2mm",
    fontSize: "11.5px",
    fontWeight: 700,
    padding: "0.4mm 1mm",
  },
  grandTotal: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "2mm",
    background: "#000",
    color: "#fff",
    fontSize: "16px",
    fontWeight: 900,
    padding: "1.8mm 2mm",
    marginTop: "1.5mm",
    borderRadius: "0.8mm",
  },

  /* Helpers + footer */
  num: {
    fontVariantNumeric: "tabular-nums",
    fontWeight: 800,
    direction: "ltr",
    unicodeBidi: "isolate",
  },
  footer: { textAlign: "center", marginTop: "3mm" },
  thanks: { fontSize: "12px", fontWeight: 900 },
  footMeta: {
    marginTop: "0.8mm",
    fontSize: "9px",
    fontWeight: 600,
    unicodeBidi: "plaintext",
  },
  cutLine: {
    borderTop: "1.5px dashed #000",
    marginTop: "3mm",
    position: "relative",
    height: 0,
  },
  scissors: {
    position: "absolute",
    top: "-3.2mm",
    insetInlineStart: 0,
    background: "#fff",
    paddingInlineEnd: "1mm",
    fontSize: "10px",
    lineHeight: 1,
  },
};

export default ThermalReceipt;
