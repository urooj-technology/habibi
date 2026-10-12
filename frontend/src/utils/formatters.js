/**
 * Format a currency value with the specified currency code
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - The currency code (e.g., USD, EUR, AFN)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currencyCode = 'USD') => {
  if (amount === undefined || amount === null) return '-';
  
  // Convert string to number if needed
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Check if conversion resulted in a valid number
  if (isNaN(numericAmount)) return '-';
  
  // Format the number with comma separators for thousands
  const formattedAmount = numericAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return `${currencyCode} ${formattedAmount}`;
};

/**
 * Format a date string into a localized date string
 * @param {string} dateString - The date string to format
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '-';
    }

    // Format: 22 Jun 2020
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

/**
 * Format a date and time string into a localized date and time string
 * @param {string} dateTimeString - The date and time string to format
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return '-';
  
  try {
    const date = new Date(dateTimeString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '-';
    }

    // Format: 22 Jun 2020, 08:30 PM
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
    console.error('Error formatting date time:', error);
    return '-';
  }
}; 