/**
 * Habibi poshak shop — price × quantity only (amounts in Afghani).
 */

export function formatShopMoney(amount) {
  if (amount === undefined || amount === null || amount === "") return "—";
  const n = typeof amount === "string" ? Number.parseFloat(amount) : Number(amount);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
