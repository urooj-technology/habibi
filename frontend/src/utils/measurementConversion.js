/** Quantity helpers for Habibi poshak shop (price × quantity). */

export const QUANTITY_FIELD = "quantity";

export function getLineQuantity(item = {}) {
  const n = Number.parseFloat(
    item.quantity ?? item.grain_amount ?? item[QUANTITY_FIELD]
  );
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function calculatePricedLineTotal(amounts, unitPrice) {
  const price = Number.parseFloat(unitPrice);
  if (!Number.isFinite(price) || price <= 0) return 0;
  return getLineQuantity(amounts) * price;
}

export function resolveLineProduct(item = {}) {
  return (
    item.inventory_details?.product_details ||
    item.inventory?.product_details ||
    item.product_details ||
    item.product ||
    {}
  );
}

export function calculateSaleLineTotal(item = {}) {
  return calculatePricedLineTotal(item, item.sale_price);
}

export function getLineMeasurementEntries(item = {}) {
  const amount = getLineQuantity(item);
  if (amount <= 0) return [];
  return [{ unit: "quantity", field: QUANTITY_FIELD, amount }];
}

/** @deprecated dual measurement removed */
export function getSelectedUnits() {
  return ["quantity"];
}

export function defaultPricingBase() {
  return "quantity";
}

export function isDualMeasurementProduct() {
  return false;
}

export function applyDualMeasurementSync({ changedField, changedValue }) {
  return { [changedField]: changedValue };
}

export function hasDualMeasurementRatio() {
  return false;
}

export function formatSyncedAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function quantityPayload(qty) {
  const n = Number.parseFloat(qty);
  const value = Number.isFinite(n) && n > 0 ? n.toFixed(2) : "0.00";
  return { quantity: value };
}

export function emptyQuantityAmounts() {
  return { quantity: "" };
}

/** Back-compat aliases used by older pages during migration. */
export const UNIT_FLAGS = {};
export const AMOUNT_FIELDS = { quantity: "quantity", grain: "quantity" };
export const UNIT_LABEL_KEYS = { quantity: "common.quantity" };
export const QUANTITY_AMOUNT_FIELD = "quantity";
export const QUANTITY_UNIT = "quantity";
export const PRODUCT_QUANTITY_FLAGS = {};
