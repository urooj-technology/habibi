/** Measurement unit helpers for dual pricing and purchase-learned unit ratios. */

export const UNIT_FLAGS = {
  weight: "is_weight",
  meter: "is_meter",
  khada: "is_khada",
  grain: "is_grain",
};

export const AMOUNT_FIELDS = {
  weight: "weight_amount",
  meter: "meter_amount",
  khada: "khada_amount",
  grain: "grain_amount",
};

export const UNIT_LABEL_KEYS = {
  weight: "product.isWeight",
  meter: "product.isMeter",
  khada: "product.isKhada",
  grain: "product.isGrain",
};

export function getSelectedUnits(flags = {}) {
  const units = [];
  if (flags.is_weight) units.push("weight");
  if (flags.is_meter) units.push("meter");
  if (flags.is_khada) units.push("khada");
  if (flags.is_grain) units.push("grain");
  return units;
}

/**
 * Runtime pricing unit for dual-measurement lines.
 * Prefer weight when present; otherwise first selected unit.
 */
export function defaultPricingBase(productOrFlags = {}, override) {
  const units = getSelectedUnits(productOrFlags);
  if (units.length === 0) return "";
  if (units.length === 1) return units[0];
  if (override && units.includes(override)) return override;
  if (units.includes("weight")) return "weight";
  return units[0];
}

/** Qty used for unit_price × qty from explicit pricing_base. */
export function getPricingQuantity(amounts = {}, pricingBase) {
  if (!pricingBase) return 0;
  const field = AMOUNT_FIELDS[pricingBase];
  if (!field) return 0;
  const n = Number.parseFloat(amounts[field]);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Line total = unit price × qty of the selected pricing base. */
export function calculatePricedLineTotal(amounts, unitPrice, pricingBase) {
  const price = Number.parseFloat(unitPrice);
  if (!Number.isFinite(price) || price <= 0) return 0;
  return getPricingQuantity(amounts, pricingBase) * price;
}

/** Product flags from sale / purchase nested payloads. */
export function resolveLineProduct(item = {}) {
  return (
    item.inventory_details?.product_details ||
    item.inventory?.product_details ||
    item.product_details ||
    item.product ||
    {}
  );
}

/** Sale line total using runtime pricing_base (dual-safe). */
export function calculateSaleLineTotal(item = {}) {
  const product = resolveLineProduct(item);
  const base = defaultPricingBase(product, item.pricing_base);
  return calculatePricedLineTotal(item, item.sale_price, base);
}

/**
 * Positive measurement amounts for display.
 * Returns [{ unit, field, amount }] — never treats thickness as qty.
 */

/** True when product has exactly two measurement units (e.g. weight + khada). */
export function isDualMeasurementProduct(productOrFlags = {}) {
  return getSelectedUnits(productOrFlags).length === 2;
}

/** Format a synced secondary qty for display in line inputs. */
export function formatSyncedAmount(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (unit === "khada" || unit === "grain") {
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
  }
  return n.toFixed(2);
}

/**
 * Whether a ratio can be derived from two positive amounts on `source`.
 * Used for inventory (sale) or the current purchase line after both qtys are entered.
 */
export function hasDualMeasurementRatio(source = {}, productOrFlags = {}) {
  const units = getSelectedUnits(productOrFlags);
  if (units.length !== 2) return false;
  const f1 = AMOUNT_FIELDS[units[0]];
  const f2 = AMOUNT_FIELDS[units[1]];
  const a = Number.parseFloat(source[f1]);
  const b = Number.parseFloat(source[f2]);
  return Number.isFinite(a) && a > 0 && Number.isFinite(b) && b > 0;
}

/**
 * When a dual-measurement product line changes one qty field, derive the peer field
 * from ratioSource (inventory stock ratio on sale; line ratio on purchase after both set).
 */
export function applyDualMeasurementSync({
  productOrFlags = {},
  ratioSource = {},
  changedField,
  changedValue,
}) {
  const units = getSelectedUnits(productOrFlags);
  if (units.length !== 2) {
    return { [changedField]: changedValue };
  }

  const [u1, u2] = units;
  const f1 = AMOUNT_FIELDS[u1];
  const f2 = AMOUNT_FIELDS[u2];
  if (changedField !== f1 && changedField !== f2) {
    return { [changedField]: changedValue };
  }

  const peerField = changedField === f1 ? f2 : f1;
  const peerUnit = changedField === f1 ? u2 : u1;
  const trimmed = String(changedValue ?? "").trim();

  if (trimmed === "") {
    return { [changedField]: "", [peerField]: "" };
  }

  const num = Number.parseFloat(trimmed);
  if (!Number.isFinite(num) || num < 0) {
    return { [changedField]: changedValue };
  }

  if (!hasDualMeasurementRatio(ratioSource, productOrFlags)) {
    return { [changedField]: changedValue };
  }

  const src1 = Number.parseFloat(ratioSource[f1]);
  const src2 = Number.parseFloat(ratioSource[f2]);
  const peerValue =
    changedField === f1 ? num * (src2 / src1) : num * (src1 / src2);

  return {
    [changedField]: changedValue,
    [peerField]: formatSyncedAmount(peerValue, peerUnit),
  };
}

export function getLineMeasurementEntries(item = {}, product) {
  const flags = product || resolveLineProduct(item);
  const units = getSelectedUnits(flags);
  const list = units.length
    ? units
    : ["weight", "meter", "khada", "grain"].filter((u) => {
        const n = Number.parseFloat(item[AMOUNT_FIELDS[u]]);
        return Number.isFinite(n) && n > 0;
      });

  return list
    .map((unit) => {
      const field = AMOUNT_FIELDS[unit];
      const amount = Number.parseFloat(item[field]);
      if (!Number.isFinite(amount) || amount <= 0) return null;
      return { unit, field, amount };
    })
    .filter(Boolean);
}
