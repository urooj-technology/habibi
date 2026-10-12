import React from "react";
import { cn } from "@/lib/utils";
import {
  MONEY_SIDE,
  formatMoneyNumber,
  moneySideTextClass,
  moneySideSurfaceClass,
  inferMoneySide,
} from "../../utils/moneySide";

/**
 * Colored money amount for debit / credit / signed balance.
 *
 * @param {object} props
 * @param {number|string|null} props.value
 * @param {"debit"|"credit"|"balance"|"neutral"} [props.side]
 * @param {string} [props.field] — auto-infer side from field name when side omitted
 * @param {string} [props.currency] — optional suffix (AFN / USD)
 * @param {boolean} [props.surface] — soft tinted chip background
 * @param {boolean} [props.showZero] — show 0.00 instead of em dash
 * @param {string} [props.className]
 */
export default function MoneyAmount({
  value,
  side,
  field,
  currency = "",
  surface = false,
  showZero = false,
  className,
  empty = "—",
}) {
  const resolvedSide = side || inferMoneySide(field) || MONEY_SIDE.NEUTRAL;
  const n = Number(value);
  const isEmpty =
    value === null ||
    value === undefined ||
    value === "" ||
    Number.isNaN(n) ||
    (!showZero && n === 0);

  if (isEmpty) {
    return (
      <span className={cn("tabular-nums text-muted-foreground/50", className)}>
        {empty}
      </span>
    );
  }

  const display = formatMoneyNumber(value, {
    empty: showZero ? "0.00" : empty,
    digits: 2,
  });
  const suffix = currency ? ` ${currency}` : "";

  if (surface) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md border px-2 py-0.5 text-sm",
          moneySideSurfaceClass(resolvedSide),
          "font-semibold tabular-nums",
          className
        )}
      >
        {display}
        {suffix}
      </span>
    );
  }

  return (
    <span
      className={cn(
        moneySideTextClass(resolvedSide, value),
        className
      )}
    >
      {display}
      {suffix ? (
        <span className="ms-1 text-xs font-medium opacity-70">{currency}</span>
      ) : null}
    </span>
  );
}

export { MONEY_SIDE, inferMoneySide };
