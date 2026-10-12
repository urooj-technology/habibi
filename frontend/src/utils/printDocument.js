/**
 * Shared print document helpers — company masthead + open print window.
 * Matches the contact-ledger / sales bill print look.
 */

export const COMPANY = {
  name: "فروشگاه آهن آلات پسران حاجی نصرالله جان سید کرم وال",
  tagline:
    "عرضه کننده مواد تعمیراتی از قبیل آهن گادر، چادر، پروفیل، پتی، لارن، سیخ گول و غیره",
  phone: "تلفن: 0778450873 — 0782210000",
  address: "آدرس: سرک سوم شاه شهید، روبروی مسجد شاه",
};

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatPrintMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function moneyOrDash(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return "—";
  return formatPrintMoney(n);
}

/** Core CSS shared by statement-style prints. */
export function printBaseStyles({ landscape = true } = {}) {
  return `
    @page {
      size: A4 ${landscape ? "landscape" : "portrait"};
      margin: 10mm 12mm;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #0f172a;
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet { width: 100%; max-width: ${landscape ? "277mm" : "190mm"}; margin: 0 auto; }
    .masthead {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .brand h1 {
      margin: 0;
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
    }
    .brand p {
      margin: 3px 0 0;
      color: #475569;
      font-size: 10px;
      max-width: 440px;
    }
    .doc-meta { text-align: right; min-width: 160px; }
    .doc-badge {
      display: inline-block;
      background: #0f172a;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 5px 10px;
      border-radius: 3px;
      margin-bottom: 6px;
    }
    .doc-meta .muted { color: #64748b; font-size: 10px; }
    .meta-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
      padding: 10px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
    }
    .meta-strip .label {
      display: block;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 2px;
    }
    .meta-strip .value {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }
    .bal-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }
    .bal-card {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 7px 9px;
      background: #fff;
    }
    .bal-card.dark {
      background: #0f172a;
      border-color: #0f172a;
      color: #fff;
    }
    .bal-card.dark .bal-label { color: #cbd5e1; }
    .bal-label {
      display: block;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 2px;
    }
    .bal-value {
      font-size: 13px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .section-title {
      margin: 14px 0 6px;
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      border-left: 3px solid #0f172a;
      padding-left: 8px;
    }
    table.data {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-bottom: 8px;
    }
    table.data thead { display: table-header-group; }
    table.data th {
      background: #0f172a;
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 6px 5px;
      text-align: left;
      border: 1px solid #0f172a;
    }
    table.data th.num, table.data td.num { text-align: right; }
    table.data th.c, table.data td.c { text-align: center; }
    table.data td {
      padding: 5px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
      font-size: 10px;
      word-wrap: break-word;
    }
    table.data tbody tr:nth-child(even) td { background: #f8fafc; }
    table.data td.num {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    table.data td.bal { font-weight: 700; }
    table.data td.empty {
      text-align: center;
      color: #64748b;
      padding: 14px;
      font-style: italic;
    }
    table.data tr.group td {
      background: #e2e8f0 !important;
      font-weight: 800;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    table.data tr.total td {
      background: #f1f5f9 !important;
      font-weight: 800;
      border-top: 2px solid #0f172a;
    }
    table.data tr.footer-emph td {
      background: #0f172a !important;
      color: #fff;
      font-weight: 800;
    }
    .sign-row {
      margin-top: 28px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 24px;
    }
    .sign-box { text-align: center; }
    .sign-line {
      border-top: 1px solid #94a3b8;
      margin: 0 auto 6px;
      width: 70%;
    }
    .sign-label { font-size: 10px; color: #475569; font-weight: 600; }
    .footer {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      color: #64748b;
      font-size: 9px;
    }
    @media print {
      table.data tr { page-break-inside: avoid; }
    }
  `;
}

export function mastheadHtml(title, printedAt = new Date().toLocaleString()) {
  return `
    <header class="masthead">
      <div class="brand">
        <h1>${escapeHtml(COMPANY.name)}</h1>
        <p>${escapeHtml(COMPANY.tagline)}</p>
      </div>
      <div class="doc-meta">
        <div class="doc-badge">${escapeHtml(title)}</div>
        <div class="muted">Printed: ${escapeHtml(printedAt)}</div>
      </div>
    </header>
  `;
}

export function metaStripHtml(items = []) {
  if (!items.length) return "";
  const cells = items
    .map(
      (item) => `
      <div>
        <span class="label">${escapeHtml(item.label)}</span>
        <div class="value">${escapeHtml(item.value ?? "—")}</div>
      </div>`
    )
    .join("");
  return `<section class="meta-strip">${cells}</section>`;
}

export function balanceCardsHtml(items = []) {
  if (!items.length) return "";
  const cards = items
    .map(
      (item, idx) => `
      <div class="bal-card${item.emphasize || idx === items.length - 1 ? " dark" : ""}">
        <span class="bal-label">${escapeHtml(item.label)}</span>
        <span class="bal-value">${escapeHtml(item.value)}</span>
      </div>`
    )
    .join("");
  return `<div class="bal-grid">${cards}</div>`;
}

export function signaturesHtml() {
  return `
    <div class="sign-row">
      <div class="sign-box"><div class="sign-line"></div><div class="sign-label">Prepared By</div></div>
      <div class="sign-box"><div class="sign-line"></div><div class="sign-label">Checked By</div></div>
      <div class="sign-box"><div class="sign-line"></div><div class="sign-label">Approved By</div></div>
    </div>
  `;
}

export function footerHtml() {
  return `
    <footer class="footer">
      <span>${escapeHtml(COMPANY.phone)}</span>
      <span>${escapeHtml(COMPANY.address)}</span>
    </footer>
  `;
}

/**
 * Open a print window with full HTML document.
 * @returns {boolean}
 */
export function openPrintWindow({ title, bodyHtml, landscape = true }) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${printBaseStyles({ landscape })}</style>
</head>
<body>
  <div class="sheet">
    ${bodyHtml}
  </div>
  <script>
    window.onload = function () {
      window.focus();
      setTimeout(function () { window.print(); }, 250);
    };
  </script>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}
