/**
 * Habibi poshak shop — price × quantity only (amounts in Afghani).
 */
import i18n from "@/lang/i18n";

export const SHOP_PHONES = ["0777110890", "0701023354"];

const DEFAULT_ADDRESS = "دهن باغ زنانه، عقب مرکز تجارتی پنجشیر، غفار تاور، منزل تحتانی";

/** "Phone: 0777110890 — 0701023354" in the active UI language. */
export function shopPhoneLine() {
  return `${i18n.t("receipt.phoneLabel", "تلفن")}: ${SHOP_PHONES.join(" — ")}`;
}

/** "Address: …" in the active UI language. */
export function shopAddressLine() {
  return `${i18n.t("receipt.addressLabel", "آدرس")}: ${i18n.t("receipt.address", DEFAULT_ADDRESS)}`;
}

export function formatShopMoney(amount) {
  if (amount === undefined || amount === null || amount === "") return "—";
  const n = typeof amount === "string" ? Number.parseFloat(amount) : Number(amount);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
