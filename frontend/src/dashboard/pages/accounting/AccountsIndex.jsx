import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Download, ChevronDown, Network, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import useFetchObjects from "../../../api/useFetchObjects";
import useDelete from "../../../api/useDelete";
import PageHeader from "../../../components/PageHeader";
import ReusableTable from "../../../components/ReusableTable";
import { useAuth } from "../../../context/AuthContext";
import { API_BASE_URL } from "../../../config/env";
import { InlineAlert } from "../../../components/AlertMessage";
import {
  PageShell,
  ListCard,
  ListToolbar,
  FilterField,
  FilterSearch,
} from "../../../components/ListPage";
import MoneyAmount from "../../../components/accounting/MoneyAmount";
import { MONEY_SIDE } from "../../../utils/moneySide";

function rowDisplayAmounts(row) {
  return {
    amount_debit: row.total_debit,
    amount_credit: row.total_credit,
    amount_balance: row.balance,
  };
}

const AccountsIndex = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const auth = useAuth();
  const token = auth?.user?.token;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  const accountsEndpoint = useMemo(() => {
    const params = new URLSearchParams({
      page_size: String(rowsPerPage),
      page: String(page + 1),
    });
    if (debouncedSearch) params.append("search", debouncedSearch);
    return `accounting/accounts/?${params.toString()}`;
  }, [rowsPerPage, page, debouncedSearch]);

  const {
    data: accountsResp,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useFetchObjects(
    ["accounting-accounts", rowsPerPage, page, debouncedSearch],
    accountsEndpoint,
    token
  );

  const accounts = useMemo(() => {
    if (!accountsResp) return [];
    return Array.isArray(accountsResp) ? accountsResp : accountsResp.results || [];
  }, [accountsResp]);

  const totalCount = useMemo(() => {
    if (!accountsResp || Array.isArray(accountsResp)) return accounts.length;
    const c = accountsResp.count;
    return typeof c === "number" ? c : accounts.length;
  }, [accountsResp, accounts.length]);

  useEffect(() => {
    if (totalCount <= 0) return;
    const lastPage = Math.max(0, Math.ceil(totalCount / rowsPerPage) - 1);
    if (page > lastPage) setPage(lastPage);
  }, [totalCount, rowsPerPage, page]);

  const tableRows = useMemo(
    () => accounts.map((row) => ({ ...row, ...rowDisplayAmounts(row) })),
    [accounts]
  );

  const { handleDelete, ConfirmDialog } = useDelete("accounting/accounts", token);

  const downloadExport = async (kind) => {
    try {
      const url = `${API_BASE_URL}/accounting/accounts/export/${kind}/`;
      const headers = token ? { Authorization: `Token ${token}` } : {};
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(txt || `${t("common.errorOccurred")} (${resp.status})`);
      }
      const blob = await resp.blob();
      const cd = resp.headers.get("content-disposition") || "";
      const m = cd.match(/filename="([^"]+)"/);
      const filename =
        (m && m[1]) || (kind === "excel" ? "chart-of-accounts.xlsx" : "chart-of-accounts.pdf");

      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.alert(e?.message || t("common.errorOccurred"));
    }
  };

  const columns = useMemo(() => {
    const moneyCell = (value, row, side = MONEY_SIDE.NEUTRAL) => (
      <MoneyAmount
        value={value}
        side={side}
        currency=""
        showZero
        empty="0.00"
      />
    );

    return [
      {
        id: "code",
        label: t("accounting.accountCode", "Code"),
        sortable: true,
        minWidth: 88,
        format: (value) => (
          <span className="font-extrabold font-mono tracking-tight">{value || "—"}</span>
        ),
      },
      {
        id: "name",
        label: t("accounting.accountName", "Account"),
        sortable: true,
        minWidth: 180,
      },
      {
        id: "account_type",
        label: t("accounting.accountType", "Type"),
        sortable: true,
        minWidth: 110,
        format: (value) => (
          <Badge variant="outline" className="font-medium">
            {value || "—"}
          </Badge>
        ),
      },
      {
        id: "role",
        label: t("accounting.role", "Role"),
        sortable: true,
        minWidth: 120,
        format: (value) => (
          <span className="text-sm text-muted-foreground">{value || "—"}</span>
        ),
      },
      {
        id: "amount_debit",
        label: t("journal.debit", "Debit"),
        sortable: true,
        minWidth: 120,
        format: (v, row) => moneyCell(v, row, MONEY_SIDE.DEBIT),
      },
      {
        id: "amount_credit",
        label: t("journal.credit", "Credit"),
        sortable: true,
        minWidth: 120,
        format: (v, row) => moneyCell(v, row, MONEY_SIDE.CREDIT),
      },
      {
        id: "amount_balance",
        label: t("accounting.balance", "Balance"),
        sortable: true,
        minWidth: 120,
        format: (v, row) => moneyCell(v, row, MONEY_SIDE.BALANCE),
      },
      {
        id: "is_active",
        label: t("common.active", "Active"),
        sortable: true,
        minWidth: 96,
        format: (value) =>
          value ? (
            <Badge className="border-transparent bg-success/15 text-success hover:bg-success/15">
              {t("common.active", "Active")}
            </Badge>
          ) : (
            <Badge variant="outline">{t("common.inactive", "Inactive")}</Badge>
          ),
      },
      {
        id: "actions",
        label: t("common.actions", "Actions"),
        minWidth: 100,
        sortable: false,
      },
    ];
  }, [t]);

  return (
    <PageShell>
      <PageHeader
        title="accounting.accounts"
        subtitle="accounting.accountsSubtitle"
        breadcrumbs={[
          { link: "/app/dashboard", label: "navigation.dashboard" },
          { link: "/app/accounting/accounts", label: "accounting.accounts" },
        ]}
        variant="compact"
        startContent={<Network className="h-5 w-5 text-primary" />}
        actions={[
          <Button
            key="add"
            onClick={() => navigate("/app/accounting/accounts/add")}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {t("accounting.addAccount", "Add Account")}
          </Button>,
        ]}
      />

      {isError ? (
        <InlineAlert
          severity="error"
          message={error?.message || t("common.errorOccurred")}
          title={t("common.error")}
          sx={{ mb: 3 }}
        />
      ) : null}

      <ListCard>
        <ListToolbar
          actions={
            <>
              {!isLoading ? (
                <Badge variant="secondary" className="h-9 shrink-0 px-3 font-semibold">
                  {totalCount.toLocaleString()} {t("accounting.accountsShort", "accounts")}
                </Badge>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="h-9 gap-1.5 shrink-0"
                disabled={isFetching}
                onClick={() => void refetch()}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                />
                {t("common.refresh", "Refresh")}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="h-9 gap-1.5 shrink-0">
                    <Download className="h-4 w-4" />
                    {t("common.export", "Export")}
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => void downloadExport("excel")}>
                    {t("common.exportExcel", "Export Excel")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void downloadExport("pdf")}>
                    {t("common.exportPdf", "Export PDF")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        >
          <FilterField label={t("common.search", "Search")} className="sm:col-span-1">
            <FilterSearch
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value || "")}
              placeholder={t("accounting.searchAccounts", "Search code or name…")}
            />
          </FilterField>

        </ListToolbar>

        <ReusableTable
          columns={columns}
          data={tableRows}
          title={t("accounting.accountList", "Account list")}
          onEdit={(editId) => navigate(`/app/accounting/accounts/${editId}/edit`)}
          onDelete={(delId) => handleDelete(delId)}
          rowActions
          loading={isLoading}
          pagination
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={totalCount}
          onPageChange={(newPage) => setPage(newPage)}
          onRowsPerPageChange={(newSize) => {
            setRowsPerPage(newSize);
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          defaultSort="code"
          defaultSortDirection="asc"
          showSearch={false}
          embedded
          stickyHeader
          tableContainerSx={{ maxHeight: 560 }}
        />
      </ListCard>

      <ConfirmDialog />
    </PageShell>
  );
};

export default AccountsIndex;
