/** Shared options for Add / Edit chart-of-accounts forms. */

export const ACCOUNT_TYPES = [
  { value: "ASSET", label: "accounting.accountTypeAsset" },
  { value: "LIABILITY", label: "accounting.accountTypeLiability" },
  { value: "EQUITY", label: "accounting.accountTypeEquity" },
  { value: "INCOME", label: "accounting.accountTypeIncome" },
  { value: "EXPENSE", label: "accounting.accountTypeExpense" },
];

export const ROLE_OPTIONS = [
  { value: "", label: "accounting.roles.unclassified" },
  { value: "CASH", label: "accounting.roles.cash" },
  { value: "BANK", label: "accounting.roles.bank" },
  { value: "AR", label: "accounting.roles.accountsReceivable" },
  { value: "AP", label: "accounting.roles.accountsPayable" },
  { value: "INVENTORY", label: "accounting.roles.inventory" },
  { value: "SALES", label: "accounting.roles.salesRevenue" },
  { value: "COGS", label: "accounting.roles.costOfGoodsSold" },
  { value: "CUSTOMER_ADVANCE", label: "accounting.roles.customerAdvances" },
  { value: "OPERATING_EXPENSE", label: "accounting.roles.operatingExpense" },
  { value: "OPENING_BALANCE_EQUITY", label: "accounting.roles.openingBalanceEquity" },
];

export const CURRENCY_OPTIONS = [
  { value: "AFN", label: "AFN", customLabel: "AFN" },
];

export const CATEGORY_OPTIONS = [
  { value: "", label: "accounting.categories.none" },
  { value: "CURRENT_ASSET", label: "accounting.categories.currentAsset" },
  { value: "FIXED_ASSET", label: "accounting.categories.fixedAsset" },
  { value: "OTHER_ASSET", label: "accounting.categories.otherAsset" },
  { value: "CURRENT_LIABILITY", label: "accounting.categories.currentLiability" },
  { value: "LONG_TERM_LIABILITY", label: "accounting.categories.longTermLiability" },
  { value: "CAPITAL", label: "accounting.categories.capital" },
  { value: "DRAWINGS", label: "accounting.categories.drawings" },
  { value: "RETAINED_EARNINGS", label: "accounting.categories.retainedEarnings" },
  { value: "CURRENT_YEAR_EARNINGS", label: "accounting.categories.currentYearEarnings" },
  { value: "SALES_INCOME", label: "accounting.categories.salesIncome" },
  { value: "SERVICE_INCOME", label: "accounting.categories.serviceIncome" },
  { value: "OTHER_INCOME", label: "accounting.categories.otherIncome" },
  { value: "OPERATING_EXPENSE", label: "accounting.categories.operatingExpense" },
  { value: "COGS", label: "accounting.categories.cogs" },
];

/** Suggested categories for a selected account type (UI hint only). */
export const CATEGORIES_BY_TYPE = {
  ASSET: ["CURRENT_ASSET", "FIXED_ASSET", "OTHER_ASSET"],
  LIABILITY: ["CURRENT_LIABILITY", "LONG_TERM_LIABILITY"],
  EQUITY: ["CAPITAL", "DRAWINGS", "RETAINED_EARNINGS", "CURRENT_YEAR_EARNINGS"],
  INCOME: ["SALES_INCOME", "SERVICE_INCOME", "OTHER_INCOME"],
  EXPENSE: ["OPERATING_EXPENSE", "COGS"],
};
