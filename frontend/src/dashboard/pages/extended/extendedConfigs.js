const acctToolsBreadcrumb = {
  link: "/app/accounting/opening-balances",
  label: "accountantTools.title",
};

export const openingBalanceConfig = {
  i18nPrefix: "openingBalance",
  apiPath: "accounting/opening-balances",
  routeBase: "/app/accounting/opening-balances",
  formType: "openingBalance",
  dateField: "entry_date",
  showPostActions: true,
  workflowI18nPrefix: "extendedWorkflow",
  breadcrumbs: [
    { link: "/app/dashboard", label: "navigation.dashboard" },
    { link: "/app/accounting/accounts", label: "accounting.title" },
    acctToolsBreadcrumb,
    { link: "/app/accounting/opening-balances", label: "accountantTools.openingBalances" },
  ],
  listColumns: [
    { id: "id", label: "common.id" },
    { id: "entry_date", label: "openingBalance.entry_date" },
    { id: "account_label", label: "openingBalance.account" },
    { id: "debit_amount", label: "accounting.totalDebit" },
    { id: "credit_amount", label: "accounting.totalCredit" },
    { id: "status", label: "common.status" },
  ],
};
