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
