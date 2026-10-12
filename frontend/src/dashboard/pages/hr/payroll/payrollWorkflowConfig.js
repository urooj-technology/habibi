export const payrollRunConfig = {
  i18nPrefix: "payrollRun",
  apiPath: "payroll/runs",
  routeBase: "/app/hr/payroll-runs",
  dateField: "run_date",
  showPostActions: true,
  workflowI18nPrefix: "payrollWorkflow",
  breadcrumbs: [
    { link: "/app/dashboard", label: "navigation.dashboard" },
    { link: "/app/hr/employees", label: "hr.title" },
    { link: "/app/hr/payroll-runs", label: "hr.payrollRuns" },
  ],
  listColumns: [
    { id: "id", label: "common.id" },
    { id: "run_date", label: "payrollRun.run_date" },
    { id: "period_label", label: "payrollRun.period" },
    { id: "total_amount", label: "common.total" },
    { id: "status", label: "common.status" },
  ],
};
