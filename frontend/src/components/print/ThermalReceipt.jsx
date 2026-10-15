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
 * 48mm thermal receipt — heavy black type so it stays readable on low-heat
 * thermal heads. Labels follow the active UI language.
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

  return (
    <div ref={ref} style={s.page}>
      <header style={s.header}>
        <div style={s.shopName}>{shopName}</div>
        <div style={s.shopPhone}>{phone}</div>
        <div style={s.shopAddress}>{address}</div>
      </header>

      <div style={s.titleBar}>{docTitle}</div>

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
        <span>{t("receipt.item", "Item")}</span>
        <span>{t("receipt.amount", "Amount")}</span>
      </div>

      <div style={s.rule} />

      {itemCount === 0 ? (
        <div style={s.empty}>—</div>
      ) : (
        lines.map((row, idx) => (
          <div
            key={row.index}
            style={{
              ...s.lineBlock,
              ...(idx === itemCount - 1 ? { borderBottom: "none" } : null),
            }}
          >
            <div style={s.lineName}>
              {row.index}. {row.productName}
            </div>
            <div style={s.lineNums}>
              <span style={s.lineCalc}>
                {formatQty(row.qty)} × {formatMoney(row.unitPrice)}
              </span>
              <span style={s.lineTotal}>{formatMoney(row.lineTotal)}</span>
            </div>
          </div>
        ))
      )}

      <div style={s.rule} />

      <div style={s.countRow}>
        <span>{t("receipt.items", "Items")}</span>
        <span style={s.num}>{itemCount}</span>
      </div>

      <div style={s.totals}>
        {totals.map((row) =>
          row.strong ? (
            <div key={row.label} style={s.grandTotal}>
              <span>{row.label}</span>
              <span style={s.num}>{formatMoney(row.value)}</span>
            </div>
          ) : (
            <div key={row.label} style={s.totalRow}>
              <span>{row.label}</span>
              <span style={s.num}>{formatMoney(row.value)}</span>
            </div>
          )
        )}
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
    width: "48mm",
    maxWidth: "48mm",
    margin: "0 auto",
    padding: "2mm 1.5mm 5mm",
    background: "#fff",
    color: "#000",
    fontFamily: FONT,
    fontSize: "11px",
    fontWeight: 700,
    lineHeight: 1.3,
    direction: "inherit",
    boxSizing: "border-box",
    overflowWrap: "anywhere",
  },
  header: {
    textAlign: "center",
    marginBottom: "1.5mm",
  },
  shopName: {
    fontSize: "17px",
    fontWeight: 900,
    lineHeight: 1.15,
  },
  shopPhone: {
    marginTop: "0.8mm",
    fontSize: "11px",
    fontWeight: 800,
    unicodeBidi: "plaintext",
  },
  shopAddress: {
    marginTop: "0.5mm",
    fontSize: "10px",
    fontWeight: 700,
    lineHeight: 1.25,
  },
  titleBar: {
    background: "#000",
    color: "#fff",
    textAlign: "center",
    fontSize: "13px",
    fontWeight: 900,
    padding: "1mm 0",
    margin: "1mm 0 1.5mm",
    borderRadius: "1mm",
  },
  rule: {
    borderTop: "2px solid #000",
    margin: "1.2mm 0",
  },
  dash: {
    borderTop: "1.5px dashed #000",
    margin: "1.5mm 0",
  },
  metaBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "0.6mm",
  },
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1.5mm",
    alignItems: "baseline",
  },
  metaLabel: {
    fontSize: "10.5px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  metaValue: {
    fontSize: "11.5px",
    fontWeight: 900,
    textAlign: "end",
    wordBreak: "break-word",
    unicodeBidi: "plaintext",
  },
  colHead: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    fontWeight: 900,
  },
  empty: {
    textAlign: "center",
    padding: "2mm 0",
    fontSize: "11px",
  },
  lineBlock: {
    padding: "1mm 0",
    borderBottom: "1px dashed #000",
  },
  lineName: {
    fontSize: "12px",
    fontWeight: 900,
    lineHeight: 1.25,
    wordBreak: "break-word",
  },
  lineNums: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "1mm",
    marginTop: "0.5mm",
    fontVariantNumeric: "tabular-nums",
  },
  lineCalc: {
    fontSize: "11px",
    fontWeight: 700,
    direction: "ltr",
    unicodeBidi: "isolate",
  },
  lineTotal: {
    fontSize: "12px",
    fontWeight: 900,
    direction: "ltr",
    unicodeBidi: "isolate",
  },
  countRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    fontWeight: 800,
    marginBottom: "1mm",
  },
  num: {
    fontVariantNumeric: "tabular-nums",
    fontWeight: 900,
    direction: "ltr",
    unicodeBidi: "isolate",
  },
  totals: {
    display: "flex",
    flexDirection: "column",
    gap: "0.8mm",
  },
  grandTotal: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1mm",
    background: "#000",
    color: "#fff",
    fontSize: "15px",
    fontWeight: 900,
    padding: "1.2mm 1.5mm",
    borderRadius: "1mm",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1mm",
    fontSize: "12px",
    fontWeight: 800,
    padding: "0 0.5mm",
  },
  footer: {
    textAlign: "center",
    fontSize: "11px",
    fontWeight: 900,
  },
};

export default ThermalReceipt;
