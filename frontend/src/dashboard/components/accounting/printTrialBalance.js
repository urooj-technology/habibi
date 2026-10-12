import {
  escapeHtml,
  formatPrintMoney,
  moneyOrDash,
  mastheadHtml,
  metaStripHtml,
  balanceCardsHtml,
  signaturesHtml,
  footerHtml,
  openPrintWindow,
} from "../../../utils/printDocument";

/**
 * Print trial balance as a dedicated landscape statement.
 */
export function printTrialBalance({
  title,
  from,
  to,
  currency,
  trial,
  groupedRows = [],
  balancedLabel,
  unbalancedLabel,
  netIncomeLabel,
}) {
  if (!trial) return false;

  const ccy = trial.currency || currency || "";
  const balanced = Boolean(trial.is_balanced);
  const netProfit = trial.net_profit;

  const totals = {
    opening_debit: 0,
    opening_credit: 0,
    period_debit: 0,
    period_credit: 0,
    closing_debit: 0,
    closing_credit: 0,
  };

  const bodyRows = [];
  groupedRows.forEach((group) => {
    bodyRows.push(`
      <tr class="group">
        <td colspan="8">${escapeHtml(group.label)}</td>
      </tr>`);
    (group.rows || []).forEach((r) => {
      totals.opening_debit += Number(r.opening_debit) || 0;
      totals.opening_credit += Number(r.opening_credit) || 0;
      totals.period_debit += Number(r.period_debit) || 0;
      totals.period_credit += Number(r.period_credit) || 0;
      totals.closing_debit += Number(r.closing_debit) || 0;
      totals.closing_credit += Number(r.closing_credit) || 0;
      bodyRows.push(`
        <tr>
          <td>${escapeHtml(r.account_code || r.code || "")}</td>
          <td>${escapeHtml(r.account_name || r.name || "")}</td>
          <td class="num">${moneyOrDash(r.opening_debit)}</td>
          <td class="num">${moneyOrDash(r.opening_credit)}</td>
          <td class="num">${moneyOrDash(r.period_debit)}</td>
          <td class="num">${moneyOrDash(r.period_credit)}</td>
          <td class="num">${moneyOrDash(r.closing_debit)}</td>
          <td class="num bal">${moneyOrDash(r.closing_credit)}</td>
        </tr>`);
    });
  });

  if (!bodyRows.length) {
    bodyRows.push(`<tr><td colspan="8" class="empty">No accounts in this period</td></tr>`);
  } else {
    bodyRows.push(`
      <tr class="total">
        <td colspan="2">Total</td>
        <td class="num">${formatPrintMoney(totals.opening_debit)}</td>
        <td class="num">${formatPrintMoney(totals.opening_credit)}</td>
        <td class="num">${formatPrintMoney(totals.period_debit)}</td>
        <td class="num">${formatPrintMoney(totals.period_credit)}</td>
        <td class="num">${formatPrintMoney(totals.closing_debit)}</td>
        <td class="num">${formatPrintMoney(totals.closing_credit)}</td>
      </tr>`);
  }

  const bodyHtml = `
    ${mastheadHtml(title)}
    ${metaStripHtml([
      { label: "Period From", value: from },
      { label: "Period To", value: to },
      { label: "Currency", value: ccy },
      {
        label: "Status",
        value: balanced ? balancedLabel || "Balanced" : unbalancedLabel || "Not balanced",
      },
    ])}
    ${balanceCardsHtml([
      {
        label: netIncomeLabel || "Net income",
        value: `${formatPrintMoney(netProfit)} ${ccy}`,
      },
      {
        label: "Accounts",
        value: String(trial.account_count ?? trial.rows?.length ?? 0),
      },
      {
        label: "Period debit",
        value: `${formatPrintMoney(totals.period_debit)} ${ccy}`,
      },
      {
        label: "Period credit",
        value: `${formatPrintMoney(totals.period_credit)} ${ccy}`,
        emphasize: true,
      },
    ])}
    <table class="data">
      <thead>
        <tr>
          <th style="width:70px">Code</th>
          <th>Account</th>
          <th class="num" style="width:88px">Open Dr</th>
          <th class="num" style="width:88px">Open Cr</th>
          <th class="num" style="width:88px">Period Dr</th>
          <th class="num" style="width:88px">Period Cr</th>
          <th class="num" style="width:88px">Close Dr</th>
          <th class="num" style="width:88px">Close Cr</th>
        </tr>
      </thead>
      <tbody>${bodyRows.join("")}</tbody>
    </table>
    ${signaturesHtml()}
    ${footerHtml()}
  `;

  return openPrintWindow({
    title: `${title} — ${from}–${to}`,
    bodyHtml,
    landscape: true,
  });
}

export default printTrialBalance;
