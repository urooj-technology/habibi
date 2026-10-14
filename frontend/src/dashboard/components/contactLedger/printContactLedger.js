import { shopAddressLine, shopPhoneLine } from "@/config/shopConfig";
/**
 * Opens a print-ready contact ledger statement in a new window.
 * Used by customer and supplier ledgers.
 */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function moneyCell(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return "—";
  return formatMoney(n);
}

/**
 * @param {object} opts
 * @param {string} opts.title - e.g. Customer Ledger / Supplier Ledger
 * @param {string} opts.contactLabel - Customer / Supplier
 * @param {string} opts.contactName
 * @param {string|number} opts.contactId
 * @param {object} [opts.profile]
 * @param {string} opts.from
 * @param {string} opts.to
 * @param {Array} opts.sections - ledger sections with lines + balances
 * @param {(type: string) => string} opts.labelTxn
 * @param {(status: string) => string} opts.labelStatus
 */
export function printContactLedger({
  title,
  contactLabel,
  contactName,
  contactId,
  profile = {},
  from,
  to,
  sections = [],
  labelTxn,
  labelStatus,
}) {
  const printedAt = new Date().toLocaleString();
  const displayName = contactName || `#${contactId}`;
  const contactPhone = profile.contact || "";
  const contactAddress = profile.address || "";

  const sectionHtml = sections
    .map((section) => {
      const lines = section.lines || [];
      const rows =
        lines.length > 0
          ? lines
              .map((line, idx) => {
                const debit = line.debit ?? line.debit_home;
                const credit = line.credit ?? line.credit_home;
                return `
              <tr>
                <td class="c">${idx + 1}</td>
                <td class="c nowrap">${escapeHtml(line.date || line.entry_date || "")}</td>
                <td>${escapeHtml(line.voucher_no || line.reference || "—")}</td>
                <td>${escapeHtml(line.reference_no || line.reference || "—")}</td>
                <td>${escapeHtml(
                  typeof labelTxn === "function"
                    ? labelTxn(line.transaction_type || line.source_type || "")
                    : line.transaction_type || line.source_type || ""
                )}</td>
                <td class="desc">${escapeHtml(line.description || line.line_memo || "—")}</td>
                <td class="num">${moneyCell(debit)}</td>
                <td class="num">${moneyCell(credit)}</td>
                <td class="num bal">${formatMoney(line.running_balance)}</td>
                <td class="c">${escapeHtml(
                  (typeof labelStatus === "function"
                    ? labelStatus(line.status || "")
                    : line.status) || "—"
                )}</td>
              </tr>`;
              })
              .join("")
          : `<tr><td colspan="10" class="empty">No activity in this period</td></tr>`;

      return `
      <section class="ledger-block">
        <div class="ledger-head">
          <h2>Ledger</h2>
          <div class="bal-grid">
            <div class="bal-card">
              <span class="bal-label">Opening</span>
              <span class="bal-value">${formatMoney(section.opening_balance)}</span>
            </div>
            <div class="bal-card">
              <span class="bal-label">Debit</span>
              <span class="bal-value">${formatMoney(section.period_debit)}</span>
            </div>
            <div class="bal-card">
              <span class="bal-label">Credit</span>
              <span class="bal-value">${formatMoney(section.period_credit)}</span>
            </div>
            <div class="bal-card emphasize">
              <span class="bal-label">Closing</span>
              <span class="bal-value">${formatMoney(section.closing_balance)}</span>
            </div>
          </div>
        </div>
        <table class="ledger-table">
          <thead>
            <tr>
              <th style="width:36px">#</th>
              <th style="width:88px">Date</th>
              <th style="width:110px">Voucher</th>
              <th style="width:110px">Reference</th>
              <th style="width:120px">Type</th>
              <th>Description</th>
              <th style="width:92px" class="num">Debit</th>
              <th style="width:92px" class="num">Credit</th>
              <th style="width:100px" class="num">Balance</th>
              <th style="width:72px">Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} — ${escapeHtml(displayName)}</title>
  <style>
    @page {
      size: A4 landscape;
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
    .sheet {
      width: 100%;
      max-width: 277mm;
      margin: 0 auto;
    }
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
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.01em;
      color: #0f172a;
    }
    .brand p {
      margin: 3px 0 0;
      color: #475569;
      font-size: 10px;
      max-width: 420px;
    }
    .doc-meta {
      text-align: right;
      min-width: 180px;
    }
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
    .doc-meta .muted {
      color: #64748b;
      font-size: 10px;
    }
    .party {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
      padding: 10px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
    }
    .party .label {
      display: block;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 2px;
    }
    .party .value {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .party .sub {
      color: #475569;
      font-size: 10px;
      margin-top: 2px;
    }
    .party-right {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 14px;
    }
    .ledger-block {
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .ledger-block + .ledger-block {
      page-break-before: always;
    }
    .ledger-head {
      margin-bottom: 8px;
    }
    .ledger-head h2 {
      margin: 0 0 8px;
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      border-left: 3px solid #0f172a;
      padding-left: 8px;
    }
    .bal-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 8px;
    }
    .bal-card {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 7px 9px;
      background: #fff;
    }
    .bal-card.emphasize {
      background: #0f172a;
      border-color: #0f172a;
      color: #fff;
    }
    .bal-card.emphasize .bal-label { color: #cbd5e1; }
    .bal-card.emphasize .bal-value { color: #fff; }
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
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .ledger-table thead {
      display: table-header-group;
    }
    .ledger-table th {
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
    .ledger-table th.num,
    .ledger-table td.num {
      text-align: right;
    }
    .ledger-table td {
      padding: 5px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
      font-size: 10px;
      word-wrap: break-word;
    }
    .ledger-table tbody tr:nth-child(even) td {
      background: #f8fafc;
    }
    .ledger-table td.c { text-align: center; }
    .ledger-table td.nowrap { white-space: nowrap; }
    .ledger-table td.desc { color: #334155; }
    .ledger-table td.bal { font-weight: 700; }
    .ledger-table td.num {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    .ledger-table td.empty {
      text-align: center;
      color: #64748b;
      padding: 14px;
      font-style: italic;
    }
    .footer {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      color: #64748b;
      font-size: 9px;
    }
    .sign-row {
      margin-top: 28px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 24px;
    }
    .sign-box {
      text-align: center;
    }
    .sign-line {
      border-top: 1px solid #94a3b8;
      margin: 0 auto 6px;
      width: 70%;
      padding-top: 4px;
    }
    .sign-label {
      font-size: 10px;
      color: #475569;
      font-weight: 600;
    }
    @media print {
      .ledger-block { page-break-inside: auto; }
      .ledger-table tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="masthead">
      <div class="brand">
        <h1>پوشاک حبیبی</h1>
        <p>فروشگاه پوشاک — عرضه کننده انواع لباس مردانه، زنانه و بچه‌گانه</p>
      </div>
      <div class="doc-meta">
        <div class="doc-badge">${escapeHtml(title)}</div>
        <div class="muted">Printed: ${escapeHtml(printedAt)}</div>
      </div>
    </header>

    <section class="party">
      <div>
        <span class="label">${escapeHtml(contactLabel)}</span>
        <div class="value">${escapeHtml(displayName)}</div>
        ${contactPhone ? `<div class="sub">${escapeHtml(contactPhone)}</div>` : ""}
        ${contactAddress ? `<div class="sub">${escapeHtml(contactAddress)}</div>` : ""}
      </div>
      <div class="party-right">
        <div>
          <span class="label">Period From</span>
          <div class="value" style="font-size:12px">${escapeHtml(from || "—")}</div>
        </div>
        <div>
          <span class="label">Period To</span>
          <div class="value" style="font-size:12px">${escapeHtml(to || "—")}</div>
        </div>
        <div>
          <span class="label">Account ID</span>
          <div class="value" style="font-size:12px">#${escapeHtml(contactId)}</div>
        </div>
      </div>
    </section>

    ${sectionHtml}

    <div class="sign-row">
      <div class="sign-box">
        <div class="sign-line"></div>
        <div class="sign-label">Prepared By</div>
      </div>
      <div class="sign-box">
        <div class="sign-line"></div>
        <div class="sign-label">Checked By</div>
      </div>
      <div class="sign-box">
        <div class="sign-line"></div>
        <div class="sign-label">Approved By</div>
      </div>
    </div>

    <footer class="footer">
      <span dir="auto">${escapeHtml(shopPhoneLine())}</span>
      <span dir="auto">${escapeHtml(shopAddressLine())}</span>
    </footer>
  </div>
  <script>
    window.onload = function () {
      window.focus();
      setTimeout(function () {
        window.print();
      }, 250);
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

export default printContactLedger;
