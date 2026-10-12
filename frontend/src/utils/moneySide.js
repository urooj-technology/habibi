/**
 * Professional debit / credit coloring for GL money displays.
 *
 * Convention (finance UIs):
 *   Debit  → rose / red
 *   Credit → emerald / green
 *   Signed balance → green if ≥ 0, red if < 0
 */

import { cn } from "@/lib/utils";

export const MONEY_SIDE = {
  DEBIT: "debit",
  CREDIT: "credit",
  BALANCE: "balance",
  NEUTRAL: "neutral",
};

/** Infer side from a column id / field name. */
export function inferMoneySide(idOrLabel = "") {
  const s = String(idOrLabel || "").toLowerCase();
  if (!s) return MONEY_SIDE.NEUTRAL;
  if (/(^|_)(debit|dr)(_|$)/.test(s) || s.includes("debit") || s === "dr") {
    return MONEY_SIDE.DEBIT;
  }
  if (/(^|_)(credit|cr)(_|$)/.test(s) || s.includes("credit") || s === "cr") {
    return MONEY_SIDE.CREDIT;
  }
  if (s.includes("balance") || s.includes("remaining") || s.includes("outstanding")) {
    return MONEY_SIDE.BALANCE;
  }
  return MONEY_SIDE.NEUTRAL;
}

export function formatMoneyNumber(value, { empty = "—", digits = 2 } = {}) {
  if (value === null || value === undefined || value === "") return empty;
  const n = Number(value);
  if (Number.isNaN(n)) return empty;
  if (n === 0) return empty === "0.00" ? "0.00" : empty;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * Tailwind classes for amount text by side.
 * @param {"debit"|"credit"|"balance"|"neutral"} side
 * @param {number|string|null} [value] — used for balance (signed)
 */
export function moneySideTextClass(side, value) {
  if (side === MONEY_SIDE.DEBIT) {
    return "text-debit font-semibold tabular-nums";
  }
  if (side === MONEY_SIDE.CREDIT) {
    return "text-credit font-semibold tabular-nums";
  }
  if (side === MONEY_SIDE.BALANCE) {
    const n = Number(value);
    if (!Number.isNaN(n) && n < 0) {
      return "text-debit font-semibold tabular-nums";
    }
    if (!Number.isNaN(n) && n > 0) {
      return "text-credit font-semibold tabular-nums";
    }
    return "text-muted-foreground font-semibold tabular-nums";
  }
  return "text-foreground font-semibold tabular-nums";
}

/** Soft tint for summary chips / total cards. */
export function moneySideSurfaceClass(side) {
  if (side === MONEY_SIDE.DEBIT) {
    return "border-debit/25 bg-debit/8 text-debit";
  }
  if (side === MONEY_SIDE.CREDIT) {
    return "border-credit/25 bg-credit/8 text-credit";
  }
  return "border-border bg-muted/40 text-foreground";
}

/** Column header tint for Debit / Credit. */
export function moneySideHeaderClass(side) {
  if (side === MONEY_SIDE.DEBIT) {
    return "text-debit";
  }
  if (side === MONEY_SIDE.CREDIT) {
    return "text-credit";
  }
  return "text-muted-foreground";
}

export function moneySideClasses(side, value, extra) {
  return cn(moneySideTextClass(side, value), extra);
}
