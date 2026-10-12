import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Save,
  X,
  Wallet,
  Loader2,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import useFetchObject from "../../../../api/useFetchObject";
import useFetchObjects from "../../../../api/useFetchObjects";
import useAdd from "../../../../api/useAdd";
import useUpdate from "../../../../api/useUpdate";
import { useAuth } from "../../../../context/AuthContext";
import PageHeader from "../../../../components/PageHeader";
import { FormTextField, FormDatePicker } from "../../../../components/FormFields";
import { InlineAlert } from "../../../../components/AlertMessage";
import { FullPageLoader } from "../../../../components/LoadingScreen";
import SearchableSelect from "../../../../components/SearchableSelect";
import {
  FormShell,
  FormBody,
  FormGrid,
  FormSection,
  FormRow,
} from "../../../../components/FormShell";
import { payrollRunConfig } from "./payrollWorkflowConfig";

const emptyLine = () => ({
  key: Date.now() + Math.random(),
  employee: null,
  gross_amount: "",
  deductions: "0",
  note: "",
});

const calcNet = (gross, deductions) => {
  const g = Number.parseFloat(gross || 0);
  const d = Number.parseFloat(deductions || 0);
  if (!Number.isFinite(g) || !Number.isFinite(d)) return 0;
  return Math.max(0, g - d);
};

const periodDefaults = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d) => d.toISOString().split("T")[0];
  return { period_start: fmt(start), period_end: fmt(end) };
};

const money = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const PayrollRunForm = ({ config = payrollRunConfig }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const employeeParam = searchParams.get("employee");
  const isEdit = Boolean(id);
  const auth = useAuth();
  const token = auth?.user?.token;
  const hydratedRef = useRef(false);

  const {
    i18nPrefix,
    apiPath,
    routeBase,
    breadcrumbs,
    workflowI18nPrefix = "payrollWorkflow",
  } = config;

  const defaults = periodDefaults();
  const [header, setHeader] = useState({
    run_date: new Date().toISOString().split("T")[0],
    period_start: defaults.period_start,
    period_end: defaults.period_end,
    currency: "AFN",
    reference: "",
    memo: "",
  });
  const [lines, setLines] = useState([emptyLine()]);
  const [formError, setFormError] = useState("");

  const { data: doc, isLoading: fetchLoading } = useFetchObject(
    [apiPath, id],
    apiPath,
    id,
    token
  );

  const { data: employeesData, isLoading: employeesLoading } = useFetchObjects(
    ["employees"],
    "employees/?page_size=500",
    token
  );
  const employees = useMemo(
    () =>
      Array.isArray(employeesData) ? employeesData : employeesData?.results || [],
    [employeesData]
  );

  const { handleAdd, loading: addLoading } = useAdd(
    apiPath,
    token,
    routeBase,
    t(`${i18nPrefix}.createSuccess`),
    t(`${i18nPrefix}.createError`)
  );

  const { handleUpdate, loading: updateLoading } = useUpdate(
    apiPath,
    token,
    routeBase,
    t(`${i18nPrefix}.updateSuccess`),
    t(`${i18nPrefix}.updateError`)
  );

  const resolveEmployee = (line) => {
    const empId = line.employee?.id ?? line.employee;
    const fromList = employees.find((e) => Number(e.id) === Number(empId));
    if (fromList) return fromList;
    if (line.employee_details) {
      return { id: empId, ...line.employee_details };
    }
    if (line.employee && typeof line.employee === "object") return line.employee;
    return empId ? { id: empId } : null;
  };

  // Prefill from ?employee= on create
  useEffect(() => {
    if (isEdit || !employeeParam || !employees.length) return;
    const emp = employees.find((e) => String(e.id) === String(employeeParam));
    if (!emp) return;
    setLines([
      {
        key: Date.now(),
        employee: emp,
        gross_amount:
          emp.salary != null && emp.salary !== "" ? String(emp.salary) : "",
        deductions: "0",
        note: "",
      },
    ]);
  }, [isEdit, employeeParam, employees]);

  // Hydrate edit once; enrich employee objects when list arrives
  useEffect(() => {
    if (!doc || !isEdit) return;

    if (!hydratedRef.current) {
      setHeader({
        run_date: doc.run_date || "",
        period_start: doc.period_start || "",
        period_end: doc.period_end || "",
        currency: doc.currency || "AFN",
        reference: doc.reference || "",
        memo: doc.memo || "",
      });
      if (doc.lines?.length) {
        setLines(
          doc.lines.map((line) => ({
            key: line.id || Date.now() + Math.random(),
            employee: resolveEmployee(line),
            employee_details: line.employee_details,
            gross_amount:
              line.gross_amount != null ? String(line.gross_amount) : "",
            deductions:
              line.deductions != null ? String(line.deductions) : "0",
            note: line.note || "",
          }))
        );
      } else {
        setLines([emptyLine()]);
      }
      hydratedRef.current = true;
      return;
    }

    if (!employees.length) return;
    setLines((prev) =>
      prev.map((line) => {
        const full = employees.find(
          (e) => Number(e.id) === Number(line.employee?.id)
        );
        return full && line.employee?.name !== full.name
          ? { ...line, employee: full }
          : line;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, isEdit, employees]);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setHeader((prev) => ({ ...prev, [name]: value }));
    setFormError("");
  };

  const updateLine = (key, field, value) => {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, [field]: value } : line))
    );
    setFormError("");
  };

  const onEmployeeSelect = (key, emp) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line;
        const next = { ...line, employee: emp };
        if (
          emp?.salary != null &&
          emp.salary !== "" &&
          (!line.gross_amount || line.gross_amount === "0")
        ) {
          next.gross_amount = String(emp.salary);
        }
        return next;
      })
    );
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (key) =>
    setLines((prev) =>
      prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)
    );

  const loadAllEmployees = () => {
    if (!employees.length) return;
    const usedIds = new Set(lines.map((l) => l.employee?.id).filter(Boolean));
    const newLines = employees
      .filter((e) => !usedIds.has(e.id))
      .map((e) => ({
        key: Date.now() + e.id,
        employee: e,
        gross_amount: e.salary != null ? String(e.salary) : "",
        deductions: "0",
        note: "",
      }));
    setLines((prev) => {
      const kept = prev.filter((l) => l.employee?.id);
      return kept.length
        ? [...kept, ...newLines]
        : newLines.length
          ? newLines
          : [emptyLine()];
    });
  };

  const totalGross = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + (Number.parseFloat(line.gross_amount) || 0),
        0
      ),
    [lines]
  );
  const totalDeductions = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + (Number.parseFloat(line.deductions) || 0),
        0
      ),
    [lines]
  );
  const totalNet = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + calcNet(line.gross_amount, line.deductions),
        0
      ),
    [lines]
  );

  const buildPayload = () => ({
    ...header,
    lines: lines
      .filter((line) => line.employee?.id)
      .map((line) => ({
        employee: line.employee.id,
        gross_amount: line.gross_amount || "0",
        deductions: line.deductions || "0",
        note: line.note || "",
      })),
  });

  const validate = () => {
    if (!header.run_date) return t("validation.required");
    if (!header.period_start || !header.period_end)
      return t(`${i18nPrefix}.periodRequired`, "Pay period is required");
    if (header.period_end < header.period_start)
      return t(
        `${i18nPrefix}.periodInvalid`,
        "Period end must be on or after period start"
      );
    const validLines = lines.filter(
      (l) => l.employee?.id && Number.parseFloat(l.gross_amount || 0) > 0
    );
    if (!validLines.length)
      return t(
        `${i18nPrefix}.linesRequired`,
        "Add at least one employee with a gross amount"
      );
    for (const line of validLines) {
      const g = Number.parseFloat(line.gross_amount || 0);
      const d = Number.parseFloat(line.deductions || 0);
      if (d > g)
        return t(
          `${i18nPrefix}.deductionsExceed`,
          "Deductions cannot exceed gross on a line"
        );
    }
    return "";
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    const payload = buildPayload();
    if (isEdit) handleUpdate(id, payload);
    else handleAdd(payload);
  };

  const loading = addLoading || updateLoading;
  const readOnly = isEdit && doc?.status && doc.status !== "DRAFT";
  const usedEmployeeIds = useMemo(
    () => new Set(lines.map((l) => l.employee?.id).filter(Boolean)),
    [lines]
  );
  const validLineCount = useMemo(
    () => lines.filter((l) => l.employee?.id && Number.parseFloat(l.gross_amount || 0) > 0).length,
    [lines]
  );

  if (isEdit && fetchLoading) {
    return <FullPageLoader message="common.loading" />;
  }

  return (
    <FormShell>
      <PageHeader
        title={t(isEdit ? `${i18nPrefix}.editTitle` : `${i18nPrefix}.addTitle`)}
        subtitle={t(
          isEdit ? `${i18nPrefix}.editSubtitle` : `${i18nPrefix}.addSubtitle`
        )}
        backButton={routeBase}
        backButtonLabel={t("common.backToList")}
        breadcrumbs={breadcrumbs.map((b) => ({ ...b, label: t(b.label) }))}
        actions={[
          <Button
            key="cancel"
            variant="outline"
            onClick={() => navigate(routeBase)}
            disabled={loading}
          >
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>,
          !readOnly ? (
            <Button
              key="save"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? t("common.saving") : t("common.save")}
            </Button>
          ) : null,
        ]}
        icon={<Wallet className="h-5 w-5" />}
      />

      <FormBody>
        {readOnly ? (
          <InlineAlert
            severity="info"
            message={t(`${workflowI18nPrefix}.readOnlyPosted`)}
            title={t("common.status")}
          />
        ) : null}

        {formError ? (
          <InlineAlert
            severity="error"
            message={formError}
            title={t("common.error")}
          />
        ) : null}

        <FormGrid>
          <FormSection
            span="twoThirds"
            icon={<Wallet className="h-5 w-5" />}
            title={t(`${i18nPrefix}.headerInfo`)}
            description={t(
              `${i18nPrefix}.headerInfoSub`,
              "Pay period, currency and reference"
            )}
          >
            <FormRow cols={3}>
              <FormDatePicker
                name="run_date"
                label={`${i18nPrefix}.run_date`}
                value={header.run_date}
                onChange={handleHeaderChange}
                disabled={readOnly}
              />
              <FormDatePicker
                name="period_start"
                label={`${i18nPrefix}.period_start`}
                value={header.period_start}
                onChange={handleHeaderChange}
                disabled={readOnly}
              />
              <FormDatePicker
                name="period_end"
                label={`${i18nPrefix}.period_end`}
                value={header.period_end}
                onChange={handleHeaderChange}
                disabled={readOnly}
              />
            </FormRow>

            <FormRow cols={2}>
              <div className="flex min-w-0 flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  {t("common.currency")}
                </label>
                <Select
                  value={header.currency}
                  onValueChange={(v) =>
                    setHeader((prev) => ({ ...prev, currency: v }))
                  }
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AFN">AFN</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FormTextField
                name="reference"
                label={`${i18nPrefix}.reference`}
                value={header.reference}
                onChange={handleHeaderChange}
                disabled={readOnly}
                fullWidth
                placeholder={t(
                  `${i18nPrefix}.referencePlaceholder`,
                  "Optional reference"
                )}
              />
            </FormRow>

            <FormTextField
              name="memo"
              label={`${i18nPrefix}.memo`}
              value={header.memo}
              onChange={handleHeaderChange}
              multiline
              rows={2}
              disabled={readOnly}
              fullWidth
              placeholder={t(
                `${i18nPrefix}.memoPlaceholder`,
                "Optional notes for this run"
              )}
            />
          </FormSection>
          <FormSection
            span="third"
            title={t("accounting.summary", "Summary")}
            description={t(`${i18nPrefix}.summarySub`, "Quick totals and status")}
          >
            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("common.status", "Status")}</span>
                <span className="font-semibold text-foreground">
                  {readOnly ? t(`${workflowI18nPrefix}.posted`, "Posted") : t(`${workflowI18nPrefix}.draft`, "Draft")}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t(`${i18nPrefix}.employeesCount`, "Employees")}</span>
                <span className="font-semibold text-foreground tabular-nums">{validLineCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t(`${i18nPrefix}.totalGross`, "Total gross")}</span>
                <span className="font-semibold text-foreground tabular-nums">{money(totalGross)} {header.currency}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t(`${i18nPrefix}.totalDeductions`, "Total deductions")}</span>
                <span className="font-semibold text-foreground tabular-nums">{money(totalDeductions)} {header.currency}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
                <span className="font-medium text-foreground">{t(`${i18nPrefix}.totalNet`)}</span>
                <span className="font-bold text-primary tabular-nums">{money(totalNet)} {header.currency}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t(`${i18nPrefix}.periodLabel`, "Period")}: {header.period_start || "—"} - {header.period_end || "—"}
            </p>
          </FormSection>

          <FormSection
            span="full"
            icon={<Users className="h-5 w-5" />}
            title={t(`${i18nPrefix}.lines`)}
            description={t(
              `${i18nPrefix}.linesSub`,
              "Gross, deductions and net pay per employee"
            )}
            actions={
              !readOnly ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={loadAllEmployees}
                    disabled={!employees.length}
                  >
                    <Users className="h-3.5 w-3.5" />
                    {t(`${i18nPrefix}.loadAllEmployees`)}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={addLine}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t(`${workflowI18nPrefix}.addLine`)}
                  </Button>
                </div>
              ) : null
            }
          >
            <div className="min-w-0 space-y-3 overflow-x-auto">
              <div className="hidden min-w-[44rem] grid-cols-[minmax(12rem,1.4fr)_7rem_7rem_7rem_minmax(8rem,1fr)_2.5rem] gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                <span>{t("hr.employees")}</span>
                <span>{t(`${i18nPrefix}.gross_amount`)}</span>
                <span>{t(`${i18nPrefix}.deductions`)}</span>
                <span>{t(`${i18nPrefix}.net_amount`)}</span>
                <span>{t("common.notes")}</span>
                <span />
              </div>

              {lines.map((line) => {
                const net = calcNet(line.gross_amount, line.deductions);
                const options = employees.filter(
                  (e) =>
                    !usedEmployeeIds.has(e.id) ||
                    Number(e.id) === Number(line.employee?.id)
                );
                const dedExceeds =
                  Number.parseFloat(line.deductions || 0) >
                  Number.parseFloat(line.gross_amount || 0);

                return (
                  <div
                    key={line.key}
                    className={cn(
                      "grid min-w-[44rem] grid-cols-1 gap-2 rounded-lg border border-border/80 bg-muted/20 p-3 md:grid-cols-[minmax(12rem,1.4fr)_7rem_7rem_7rem_minmax(8rem,1fr)_2.5rem] md:items-end md:gap-2 md:bg-transparent md:p-0 md:border-0"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] font-medium text-muted-foreground md:hidden">
                        {t("hr.employees")}
                      </p>
                      <SearchableSelect
                        options={options}
                        value={line.employee}
                        onChange={(val) => onEmployeeSelect(line.key, val)}
                        getOptionLabel={(e) => e?.name || `#${e?.id || ""}`}
                        loading={employeesLoading}
                        disabled={readOnly}
                        placeholder="hr.employees"
                      />
                    </div>

                    <div>
                      <p className="mb-1 text-[10px] font-medium text-muted-foreground md:hidden">
                        {t(`${i18nPrefix}.gross_amount`)}
                      </p>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.gross_amount}
                        onChange={(e) =>
                          updateLine(line.key, "gross_amount", e.target.value)
                        }
                        disabled={readOnly}
                        className="h-10 tabular-nums"
                      />
                    </div>

                    <div>
                      <p className="mb-1 text-[10px] font-medium text-muted-foreground md:hidden">
                        {t(`${i18nPrefix}.deductions`)}
                      </p>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.deductions}
                        onChange={(e) =>
                          updateLine(line.key, "deductions", e.target.value)
                        }
                        disabled={readOnly}
                        className={cn(
                          "h-10 tabular-nums",
                          dedExceeds && "border-destructive"
                        )}
                      />
                    </div>

                    <div>
                      <p className="mb-1 text-[10px] font-medium text-muted-foreground md:hidden">
                        {t(`${i18nPrefix}.net_amount`)}
                      </p>
                      <div className="flex h-10 items-center rounded-md border border-transparent bg-muted/40 px-3 text-sm font-semibold tabular-nums">
                        {money(net)}
                      </div>
                    </div>

                    <div>
                      <p className="mb-1 text-[10px] font-medium text-muted-foreground md:hidden">
                        {t("common.notes")}
                      </p>
                      <Input
                        value={line.note}
                        onChange={(e) =>
                          updateLine(line.key, "note", e.target.value)
                        }
                        disabled={readOnly}
                        className="h-10"
                        placeholder="—"
                      />
                    </div>

                    <div className="flex items-end justify-end pb-0.5">
                      {!readOnly && lines.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-destructive hover:bg-destructive/10"
                          onClick={() => removeLine(line.key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="h-10 w-10" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-3">
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t(`${i18nPrefix}.totalGross`, "Total gross")}
                </p>
                <p className="text-sm font-semibold tabular-nums">
                  {money(totalGross)} {header.currency}
                </p>
              </div>
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t(`${i18nPrefix}.totalDeductions`, "Total deductions")}
                </p>
                <p className="text-sm font-semibold tabular-nums">
                  {money(totalDeductions)} {header.currency}
                </p>
              </div>
              <div className="rounded-md bg-primary/10 px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-primary">
                  {t(`${i18nPrefix}.totalNet`)}
                </p>
                <p className="text-base font-bold tabular-nums text-primary">
                  {money(totalNet)} {header.currency}
                </p>
              </div>
            </div>
          </FormSection>
        </FormGrid>
      </FormBody>

      {!readOnly ? (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-elegant backdrop-blur md:hidden">
          <Button
            variant="outline"
            onClick={() => navigate(routeBase)}
            disabled={loading}
          >
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      ) : null}
    </FormShell>
  );
};

export default PayrollRunForm;
