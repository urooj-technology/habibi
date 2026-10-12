import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Eye, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import useFetchObjects from "../../../../api/useFetchObjects";
import useDelete from "../../../../api/useDelete";
import { useAuth } from "../../../../context/AuthContext";
import { formatShopMoney } from "@/config/shopConfig";
import PageHeader from "../../../../components/PageHeader";
import { InlineAlert } from "../../../../components/AlertMessage";
import {
  PageShell,
  ListCard,
  ListToolbar,
  FilterField,
  FilterSearch,
} from "../../../../components/ListPage";

const SaleReturnsIndex = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page_size", "50");
    if (debouncedSearch) params.set("search", debouncedSearch);
    return `sales-returns/?${params.toString()}`;
  }, [debouncedSearch]);

  const { data, isLoading, isError, error, refetch } = useFetchObjects(
    ["sales-returns", debouncedSearch],
    endpoint,
    token
  );

  const rows = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : data.results || [];
  }, [data]);

  const { handleDelete, ConfirmDialog } = useDelete("sales-returns", token);

  return (
    <PageShell>
      <PageHeader
        title={t("saleReturn.returnsList", "Sale Returns")}
        subtitle={t(
          "saleReturn.listSubtitle",
          "Customer credit notes — restore stock and settle by cash refund or AR credit"
        )}
        breadcrumbs={[
          { link: "/app/dashboard", label: t("navigation.dashboard") },
          { link: "/app/sales", label: t("sales.title", "Sales") },
          { label: t("saleReturn.returnsList", "Returns") },
        ]}
        actions={[
          <Button
            key="add"
            onClick={() => navigate("/app/sales/returns/add")}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {t("saleReturn.addNew", "Add Sale Return")}
          </Button>,
        ]}
      />

      {isError ? (
        <InlineAlert
          severity="error"
          message={error?.message || t("common.errorOccurred")}
          sx={{ mb: 2 }}
        />
      ) : null}

      <ListCard>
        <ListToolbar>
          <FilterField label={t("common.search")} className="sm:col-span-2">
            <FilterSearch
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value ?? "")}
              placeholder={t(
                "saleReturn.searchPlaceholder",
                "Search by customer, product, notes…"
              )}
            />
          </FilterField>
        </ListToolbar>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t("saleReturn.returnDate")}</TableHead>
                <TableHead>{t("saleReturn.sale")}</TableHead>
                <TableHead>{t("saleReturn.customer")}</TableHead>
                <TableHead className="text-end">{t("saleReturn.totalAmount")}</TableHead>
                <TableHead className="text-end">
                  {t("saleReturn.refundedAmount", "Refunded")}
                </TableHead>
                <TableHead className="text-end">
                  {t("saleReturn.creditedAmount", "AR credit")}
                </TableHead>
                <TableHead className="text-end">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    {t("saleReturn.noReturns", "No sale returns yet.")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const total = Number(row.total_amount || 0);
                  const refunded = Number(row.refunded_amount || 0);
                  const credited = Number(
                    row.credited_amount != null
                      ? row.credited_amount
                      : total - refunded
                  );
                  return (
                    <TableRow key={row.id} className="hover:bg-muted/40">
                      <TableCell className="font-semibold tabular-nums">
                        #{row.id}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {(row.return_date || "").toString().slice(0, 10)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        #{row.sale || row.sale_details?.id}
                      </TableCell>
                      <TableCell>
                        {row.customer_details?.name || "—"}
                      </TableCell>
                      <TableCell className="text-end tabular-nums font-medium">
                        {formatShopMoney(total)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatShopMoney(refunded)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatShopMoney(credited)}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="inline-flex gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() =>
                              navigate(`/app/sales/returns/${row.id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(row.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </ListCard>
      {ConfirmDialog}
    </PageShell>
  );
};

export default SaleReturnsIndex;
