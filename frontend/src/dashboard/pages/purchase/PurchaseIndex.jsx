import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Download,
  Printer,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import usePermissions from "../../../hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import useFetchObjects from "../../../api/useFetchObjects";
import useDelete from "../../../api/useDelete";
import { useAuth } from "../../../context/AuthContext";

import PageHeader from "../../../components/PageHeader";
import { InlineAlert } from "../../../components/AlertMessage";
import SearchableSelect from "../../../components/SearchableSelect";
import {
  PageShell,
  ListCard,
  ListToolbar,
  FilterField,
  FilterSearch,
  FilterClearButton,
} from "../../../components/ListPage";
import { formatShopMoney } from "@/config/shopConfig";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "../../../config/env";
import PurchasePrint from "./PurchasePrint";
import { printDataTable } from "../../../utils/printDataTable";
import { openThermalPrint } from "../../../utils/thermalPrint";

function ActionBtn({ title, onClick, className, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            className
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}

const PurchaseIndex = () => {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const tableContainerRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState(null);

  const [purchasesData, setPurchasesData] = useState([]);
  const [selectedPurchaseForPrint, setSelectedPurchaseForPrint] = useState(null);
  const printRef = useRef(null);

  const { data: suppliersData, isLoading: suppliersLoading } = useFetchObjects(
    ["suppliers"],
    "suppliers/",
    token
  );

  const {
    data: purchasesRawData,
    isLoading,
    isError,
    refetch,
  } = useFetchObjects(
    ["purchases", searchQuery, page, 20],
    (() => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", page + 1);
      params.append("page_size", 20);
      return `purchases/?${params.toString()}`;
    })(),
    token
  );

  const loadMore = () => {
    if (!isLoadingMore && hasMore && !isLoading) {
      setIsLoadingMore(true);
      setPage((prev) => prev + 1);
    }
  };

  const handleScroll = useCallback(() => {
    if (!tableContainerRef.current || !hasMore || isLoadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 5) loadMore();
  }, [hasMore, isLoadingMore, isLoading]);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return undefined;
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const [suppliers, setSuppliers] = useState([]);
  useEffect(() => {
    if (suppliersData) {
      const dataArray = Array.isArray(suppliersData)
        ? suppliersData
        : suppliersData.results || [];
      setSuppliers(dataArray);
    }
  }, [suppliersData]);

  useEffect(() => {
    if (purchasesRawData) {
      const dataArray = Array.isArray(purchasesRawData)
        ? purchasesRawData
        : purchasesRawData.results || [];

      setPurchasesData((prev) => {
        if (page === 0) return dataArray;
        const existingIds = new Set(prev.map((item) => item.id));
        const newItems = dataArray.filter((item) => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });

      setHasMore(dataArray.length === 20);
      setIsLoadingMore(false);
    }
  }, [purchasesRawData, page]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery]);

  const { handleDelete, ConfirmDialog } = useDelete("purchases", token, refetch);

  const handleResetFilters = () => {
    setSupplierFilter(null);
    setSearchQuery("");
    setPage(0);
  };

  const calculateRemainingAmount = (purchase) => {
    const total = parseFloat(purchase.total_amount || 0);
    const received = parseFloat(purchase.received_amount || 0);
    return total - received;
  };

  const filteredRows = purchasesData.filter((purchase) => {
    if (supplierFilter?.id && purchase.supplier !== supplierFilter.id && purchase.supplier_details?.id !== supplierFilter.id) {
      return false;
    }
    return true;
  });

  const hasActiveFilters =
    Boolean(searchQuery) || Boolean(supplierFilter);

  const handlePrintBill = async (purchase) => {
    try {
      const headers = token ? { Authorization: `Token ${token}` } : {};
      const res = await fetch(`${API_BASE_URL}/purchases/${purchase.id}/`, { headers });
      if (!res.ok) throw new Error(t("common.errorOccurred"));
      const full = await res.json();
      setSelectedPurchaseForPrint(full);
      setTimeout(() => {
        if (!printRef.current) return;
        openThermalPrint(
          printRef.current.innerHTML,
          `${t("common.print")} - #${purchase.id}`
        );
      }, 300);
    } catch (e) {
      window.alert(e?.message || t("common.errorOccurred"));
    }
  };

  const handlePrintList = () => {
    printDataTable({
      title: t("purchase.title", "Purchases"),
      meta: [
        { label: t("common.rows", "Rows"), value: String(filteredRows.length) },
      ],
      columns: [
        { id: "id", label: t("common.id", "ID"), align: "center" },
        { id: "supplier", label: t("purchase.supplier", "Supplier") },
        { id: "date", label: t("purchase.date", "Date") },
        { id: "total", label: t("purchase.totalAmount", "Total"), align: "right" },
        { id: "received", label: t("purchase.receivedAmount", "Received"), align: "right" },
        { id: "remaining", label: t("purchase.remainingAmount", "Remaining"), align: "right" },
      ],
      rows: filteredRows,
      getCell: (row, col) => {
        if (col.id === "id") return `#${row.id}`;
        if (col.id === "supplier")
          return (
            row.supplier_details?.name ||
            t("purchase.walkInSupplier", "Cash / unlisted vendor")
          );
        if (col.id === "date") {
          return row.purchase_date
            ? new Date(row.purchase_date).toLocaleDateString()
            : "—";
        }
        if (col.id === "total") return formatShopMoney(row.total_amount || 0);
        if (col.id === "received") return formatShopMoney(row.received_amount || 0);
        if (col.id === "remaining") {
          return formatShopMoney(calculateRemainingAmount(row));
        }
        return "—";
      },
    });
  };

  const statusBadge = (purchase) => {
    const received = parseFloat(purchase.received_amount || 0);
    const total = parseFloat(purchase.total_amount || 0);
    if (received >= total && total > 0) {
      return (
        <Badge className="border-transparent bg-success/15 text-success hover:bg-success/15">
          {t("purchase.paid")}
        </Badge>
      );
    }
    if (received > 0) {
      return (
        <Badge className="border-transparent bg-warning/15 text-warning-foreground hover:bg-warning/15">
          {t("purchase.partial")}
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="bg-destructive/15 text-destructive hover:bg-destructive/15">
        {t("purchase.unpaid")}
      </Badge>
    );
  };

  return (
    <PageShell>
      <PageHeader
        title={t("purchase.title", "Purchases")}
        subtitle={t("purchase.subtitle", "Manage your purchases and returns")}
        breadcrumbs={[
          { link: "/app/dashboard", label: t("navigation.dashboard", "Dashboard") },
          { link: "/app/purchases", label: t("navigation.purchases", "Purchases") },
        ]}
        actions={[
          can("purchases.create") ? (
            <Button key="add" onClick={() => navigate("/app/purchases/add")} className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t("purchase.addNew", "Add Purchase")}
            </Button>
          ) : null,
        ].filter(Boolean)}
      />

      {isError && (
        <InlineAlert
          severity="error"
          message={isError.message || t("common.errorOccurred", "An error occurred")}
          title={t("common.error", "Error")}
          sx={{ mb: 2 }}
        />
      )}

      <ListCard>
        <ListToolbar
          actions={
            <>
              <FilterClearButton
                onClick={handleResetFilters}
                disabled={!hasActiveFilters}
                label={t("common.resetFilters", "Clear")}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Download className="h-4 w-4" />
                    {t("common.export")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePrintList}>
                    <Printer className="h-4 w-4" />
                    {t("common.print")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        >
          <FilterField label={t("common.search", "Search")}>
            <FilterSearch
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value || "")}
              placeholder={t("purchase.searchPlaceholder", "Search purchases...")}
            />
          </FilterField>

          <FilterField label={t("purchase.supplier", "Supplier")}>
            <SearchableSelect
              options={suppliers}
              value={supplierFilter}
              onChange={setSupplierFilter}
              loading={suppliersLoading}
              placeholder={t("purchase.filterSupplier", "Filter by supplier")}
              className="[&_button]:h-9"
            />
          </FilterField>

        </ListToolbar>

        <div
          ref={tableContainerRef}
          className="max-h-[min(600px,70vh)] overflow-auto"
          onScroll={handleScroll}
        >
          <TooltipProvider delayDuration={200}>
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("common.id", "ID")}</TableHead>
                  <TableHead>{t("purchase.supplier", "Supplier")}</TableHead>
                  <TableHead>{t("purchase.date", "Date")}</TableHead>
                  <TableHead className="text-end">{t("purchase.totalAmount", "Total")}</TableHead>
                  <TableHead className="text-end">{t("purchase.receivedAmount", "Received")}</TableHead>
                  <TableHead className="text-end">{t("purchase.remainingAmount", "Remaining")}</TableHead>
                  <TableHead>{t("common.status", "Status")}</TableHead>
                  <TableHead className="text-center">{t("common.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && page === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                      {t("purchase.noPurchasesFound", "No purchases found")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((purchase) => {
                    const remaining = calculateRemainingAmount(purchase);
                    return (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-medium tabular-nums">#{purchase.id}</TableCell>
                        <TableCell className="max-w-[160px] truncate">
                          {purchase.supplier_details?.name ||
                            t("purchase.walkInSupplier", "Cash / unlisted vendor")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {purchase.purchase_date
                            ? new Date(purchase.purchase_date).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-end tabular-nums font-medium">
                          {formatShopMoney(purchase.total_amount || 0)}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatShopMoney(purchase.received_amount || 0)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-end tabular-nums",
                            remaining > 0 && "font-medium text-destructive"
                          )}
                        >
                          {formatShopMoney(remaining)}
                        </TableCell>
                        <TableCell>{statusBadge(purchase)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-0.5">
                            <ActionBtn
                              title={t("common.view")}
                              className="text-primary hover:bg-primary/10"
                              onClick={() => navigate(`/app/purchases/${purchase.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </ActionBtn>
                            {can("purchases.edit") ? (
                              <ActionBtn
                                title={t("common.edit")}
                                onClick={() => navigate(`/app/purchases/${purchase.id}/edit`)}
                              >
                                <Pencil className="h-4 w-4" />
                              </ActionBtn>
                            ) : null}
                            <ActionBtn
                              title={t("common.print")}
                              onClick={() => void handlePrintBill(purchase)}
                            >
                              <Printer className="h-4 w-4" />
                            </ActionBtn>
                            {can("purchases.delete") ? (
                              <ActionBtn
                                title={t("common.delete")}
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(purchase.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </ActionBtn>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                {isLoadingMore && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-3 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )}
                {!hasMore && filteredRows.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-3 text-center text-xs text-muted-foreground">
                      {t("common.noMoreData", "No more data to load")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </div>
      </ListCard>

      <ConfirmDialog />

      {selectedPurchaseForPrint ? (
        <div ref={printRef} className="hidden">
          <PurchasePrint purchase={selectedPurchaseForPrint} />
        </div>
      ) : null}
    </PageShell>
  );
};

export default PurchaseIndex;
