import {
  escapeHtml,
  formatPrintMoney,
  mastheadHtml,
  metaStripHtml,
  balanceCardsHtml,
  signaturesHtml,
  footerHtml,
  openPrintWindow,
} from "../../../../utils/printDocument";

function cellValue(row, col, { currency, formatMoney, translateBucket }) {
  let val = row[col.id];
  if (col.translateBucket && val) {
    return translateBucket(val);
  }
  if (col.money && val != null) {
    const lineCcy = row.currency || (currency && currency !== "MIXED" ? currency : "");
    return formatMoney(val, lineCcy);
  }
  if (val == null || val === "") return "—";
  if (col.suffix) return `${val}${col.suffix}`;
  return String(val);
}

/**
 * Dedicated print for operational accounting reports.
 */
export function printOperationalReport({
  title,
  metaLines = [],
  balanceItems = [],
  displayType,
  currency,
  columns = [],
  rows = [],
  summaryRows = [],
  financialSections = [],
  financialFooterRows = [],
  balanced,
  unbalancedLabel,
  formatMoney = (v, ccy) => `${formatPrintMoney(v)}${ccy ? ` ${ccy}` : ""}`,
  translateBucket = (v) => v,
}) {
  const meta = metaLines.map((m) =>
    typeof m === "string" ? { label: "", value: m } : { label: m.label, value: m.value }
  );

  let content = "";

  if (balanceItems.length) {
    content += balanceCardsHtml(
      balanceItems.map((item) => ({
        label: item.label,
        value: item.value,
      }))
    );
  }

  if (displayType === "summary") {
    const kvRows =
      summaryRows.length > 0
        ? summaryRows
            .map(
              (row) => `
          <tr>
            <td>${escapeHtml(row.label)}</td>
            <td class="num bal">${escapeHtml(
              row.money ? formatMoney(row.value, currency) : row.value ?? "—"
            )}</td>
          </tr>`
            )
            .join("")
        : `<tr><td colspan="2" class="empty">No data</td></tr>`;
    content += `
      <table class="data">
        <thead>
          <tr><th>Description</th><th class="num" style="width:160px">Amount</th></tr>
        </thead>
        <tbody>${kvRows}</tbody>
      </table>`;
  } else if (displayType === "balanceSheet" || displayType === "profitAndLoss") {
    if (typeof balanced === "boolean" && !balanced) {
      content += `<p style="color:#b45309;font-weight:700;margin:0 0 8px">${escapeHtml(
        unbalancedLabel || "Statement is not balanced"
      )}</p>`;
    }
    financialSections.forEach((section) => {
      content += `<h3 class="section-title">${escapeHtml(section.title)}</h3>`;
      const sectionRows = (section.rows || [])
        .map(
          (r) => `
          <tr>
            <td style="width:80px">${escapeHtml(r.code || r.account_code || "")}</td>
            <td>${escapeHtml(r.name || r.account_name || "")}</td>
            <td class="num">${escapeHtml(
              formatMoney(r.balance ?? r.amount, currency)
            )}</td>
          </tr>`
        )
        .join("");
      content += `
        <table class="data">
          <thead>
            <tr>
              <th style="width:80px">Code</th>
              <th>Account</th>
              <th class="num" style="width:140px">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${sectionRows || `<tr><td colspan="3" class="empty">—</td></tr>`}
            <tr class="total">
              <td colspan="2">${escapeHtml(section.title)} total</td>
              <td class="num">${escapeHtml(formatMoney(section.total, currency))}</td>
            </tr>
          </tbody>
        </table>`;
    });
    if (financialFooterRows.length) {
      content += `
        <table class="data">
          <tbody>
            ${financialFooterRows
              .map(
                (row, idx) => `
              <tr class="${idx === financialFooterRows.length - 1 ? "footer-emph" : "total"}">
                <td>${escapeHtml(row.label)}</td>
                <td class="num" style="width:160px">${escapeHtml(
                  formatMoney(row.value, currency)
                )}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>`;
    }
  } else {
    // Tabular ledger-style reports
    const headers = columns
      .map(
        (col) =>
          `<th class="${col.money || col.align === "right" ? "num" : ""}">${escapeHtml(
            col.label || col.id
          )}</th>`
      )
      .join("");
    const body =
      rows.length > 0
        ? rows
            .map((row) => {
              const cells = columns
                .map((col) => {
                  const isNum = col.money || col.align === "right";
                  return `<td class="${isNum ? "num" : ""}">${escapeHtml(
                    cellValue(row, col, { currency, formatMoney, translateBucket })
                  )}</td>`;
                })
                .join("");
              return `<tr>${cells}</tr>`;
            })
            .join("")
        : `<tr><td colspan="${Math.max(columns.length, 1)}" class="empty">No rows</td></tr>`;
    content += `
      <table class="data">
        <thead><tr>${headers}</tr></thead>
        <tbody>${body}</tbody>
      </table>`;
  }

  const bodyHtml = `
    ${mastheadHtml(title)}
    ${metaStripHtml(meta.slice(0, 4))}
    ${content}
    ${signaturesHtml()}
    ${footerHtml()}
  `;

  const landscape =
    displayType === "balanceSheet" || displayType === "profitAndLoss"
      ? false
      : true;

  return openPrintWindow({
    title,
    bodyHtml,
    landscape,
  });
}

export default printOperationalReport;
