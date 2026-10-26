/**
 * Invoice-level sale discount helpers.
 * Line prices stay intact; total = subtotal − discount_amount.
 */

export function roundMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

/**
 * @param {number|string} subtotal
 * @param {number|string} discountAmount
 * @param {number|string} discountPercent
 * @param {"amount"|"percent"} source which field the user just edited
 */
export function computeSaleTotals(
  subtotal,
  discountAmount,
  discountPercent,
  source = "amount"
) {
  const sub = Math.max(0, Number(subtotal) || 0);
  let amt = Math.max(0, Number(discountAmount) || 0);
  let pct = Math.max(0, Number(discountPercent) || 0);

  if (source === "percent") {
    if (pct > 100) pct = 100;
    amt = sub > 0 ? (sub * pct) / 100 : 0;
  } else {
    if (amt > sub) amt = sub;
    pct = sub > 0 ? (amt / sub) * 100 : 0;
  }

  amt = roundMoney(amt);
  pct = roundMoney(pct);
  const total = roundMoney(Math.max(0, sub - amt));

  return {
    subtotal: roundMoney(sub),
    discountAmount: amt,
    discountPercent: pct,
    total,
  };
}
