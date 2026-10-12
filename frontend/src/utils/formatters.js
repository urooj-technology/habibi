/**
 * Format a money amount. Defaults to AFN label; pass empty string for number-only.
 * @param {number|string} amount
 * @param {string} [currencyCode='AFN'] - Currency label prefixed; use '' for bare number
 * @returns {string}
 */
export const formatCurrency = (amount, currencyCode = "AFN") => {
  if (amount === undefined || amount === null || amount === "") return "-";

  const numericAmount =
    typeof amount === "string" ? Number.parseFloat(amount) : Number(amount);

  if (!Number.isFinite(numericAmount)) return "-";

  const formattedAmount = numericAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (!currencyCode) return formattedAmount;
  return `${currencyCode} ${formattedAmount}`;
};

/**
 * Format a date string into a localized date string
 * @param {string} dateString
 * @returns {string}
 */
export const formatDate = (dateString) => {
  if (!dateString) return "-";

  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "-";
  }
};

/**
 * Format a date and time string into a localized date and time string
 * @param {string} dateTimeString
 * @returns {string}
 */
export const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return "-";

  try {
    const date = new Date(dateTimeString);
    if (Number.isNaN(date.getTime())) return "-";

    const datePart = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
    const timePart = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
    return `${datePart}, ${timePart}`;
  } catch (error) {
    console.error("Error formatting date time:", error);
    return "-";
  }
};
