import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, ReceiptText } from 'lucide-react';
import useFetchObject from '../../../api/useFetchObject';
import { useAuth } from '../../../context/AuthContext';
import PageHeader from '../../../components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const EmployeeDetails = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const auth = useAuth();
  const token = auth?.user?.token;

  const { data: employee, isLoading, error } = useFetchObject(
    ["employee", id],
    "employees",
    id,
    token
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[100vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-destructive">{t('common.errorLoadingData')}</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={employee?.name || t('employee.details')}
        subtitle={t('employee.financialSummary')}
        backButton="/app/hr/employees"
        backButtonLabel={t('common.backToList')}
        actions={[
          <Button
            key="ledger"
            variant="outline"
            onClick={() =>
              navigate(`/app/accounting/reports/employee-ledger?employee_id=${employee?.id || ""}`)
            }
          >
            <ReceiptText className="h-4 w-4" />
            {t("operationalReports.employeeLedger")}
          </Button>,
          <Button
            key="pay-salary"
            onClick={() => navigate(`/app/hr/payroll-runs/add?employee=${employee?.id || ""}`)}
          >
            {t("hr.payrollRuns", "Payroll Runs")}
          </Button>,
        ]}
      />

      {/* Basic Information */}
      <Card className="mb-6 border-border">
        <CardContent className="p-6">
          <h6 className="text-lg font-semibold mb-2">
            {t('employee.basicInfo')}
          </h6>
          <hr className="border-border mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  {t('employee.name')}
                </p>
                <p className="text-base">
                  {employee?.name || '-'}
                </p>
              </div>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  {t('employee.fathername')}
                </p>
                <p className="text-base">
                  {employee?.fathername || '-'}
                </p>
              </div>
            </div>
            <div>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  {t('employee.contact')}
                </p>
                <p className="text-base">
                  {employee?.contact || '-'}
                </p>
              </div>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  {t('employee.address')}
                </p>
                <p className="text-base">
                  {employee?.address || '-'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salary (payroll / advances removed — record via chart of accounts & journals) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
        <Card className="border-border">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              {t('employee.monthlySalary')}
            </p>
            <p className="text-2xl font-semibold text-primary">
              {employee?.salary || 0} ؋
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              {t('employee.paidThisPeriod', 'Paid (this period)')}
            </p>
            <p className="text-2xl font-semibold text-success">
              {employee?.finance?.total_paid || 0} ؋
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              {t('employee.totalRemaining', 'Remaining')}
            </p>
            <p
              className={cn(
                'text-2xl font-semibold',
                (employee?.finance?.remaining_amount || 0) < 0 ? 'text-destructive' : 'text-info'
              )}
            >
              {employee?.finance?.remaining_amount || 0} ؋
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            {t('employee.glPayrollNote')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeDetails;
