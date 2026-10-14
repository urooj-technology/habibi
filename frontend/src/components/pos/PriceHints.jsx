import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { RotateCcw } from "lucide-react";
import { formatShopMoney } from "@/config/shopConfig";
import { cn } from "@/lib/utils";

const toNumber = (value) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

/** Profit margin of `price` over `cost` (markup %), or a below-cost warning. */
export function MarginHint({ cost, price, className }) {
  const { t } = useTranslation();
  const c = toNumber(cost);
  const p = toNumber(price);
  if (c == null || p == null || c <= 0 || p <= 0) return null;

  const profit = p - c;
  const pct = (profit / c) * 100;
  const below = profit < 0;
  return (
    <span
      className={cn(
        "block truncate text-[10px] font-semibold tabular-nums",
        below ? "text-destructive" : profit === 0 ? "text-muted-foreground" : "text-emerald-600",
        className
      )}
      title={`${t("pricing.cost")}: ${formatShopMoney(c)}`}
    >
      {below
        ? t("pricing.belowCost", { cost: formatShopMoney(c) })
        : t("pricing.margin", {
            percent: pct.toFixed(1),
            profit: formatShopMoney(profit),
          })}
    </span>
  );
}

MarginHint.propTypes = {
  cost: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  className: PropTypes.string,
};

/**
 * Sale line hint: shows the default (purchase-defined) sell price and lets the
 * cashier restore it after overriding.
 */
export function ListPriceHint({ listPrice, price, onReset }) {
  const { t } = useTranslation();
  const list = toNumber(listPrice);
  if (list == null || list <= 0) return null;
  const current = toNumber(price);
  const changed = current == null || Math.abs(current - list) >= 0.005;
  return (
    <span className="flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground">
      <span className="truncate tabular-nums">
        {t("pricing.listPrice")}: {formatShopMoney(list)}
      </span>
      {changed && onReset ? (
        <button
          type="button"
          tabIndex={-1}
          onClick={onReset}
          className="inline-flex shrink-0 items-center rounded p-0.5 text-primary hover:bg-primary/10"
          title={t("pricing.resetToList")}
          aria-label={t("pricing.resetToList")}
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  );
}

ListPriceHint.propTypes = {
  listPrice: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onReset: PropTypes.func,
};
