import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
  ChevronDown,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import usePermissions from "../../../hooks/usePermissions";
import { Can } from "../../../components/RequirePermission";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import useFetchObjects from "../../../api/useFetchObjects";
import useDelete from "../../../api/useDelete";
import { useAuth } from "../../../context/AuthContext";
import { formatCurrency } from "../../../utils/formatters";
import { printDataTable } from "../../../utils/printDataTable";

import PageHeader from "../../../components/PageHeader";
import { InlineAlert } from "../../../components/AlertMessage";
import SearchableSelect from "../../../components/SearchableSelect";
import SalesPrint from "./SalesPrint";
import {
  PageShell,
  ListCard,
  ListToolbar,
  FilterGrid,
  FilterField,
  FilterSearch,
  FilterClearButton,
} from "../../../components/ListPage";
import { cn } from "@/lib/utils";

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

const SalesIndex = () => {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const tableContainerRef = useRef(null);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [salesData, setSalesData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState(null);
  const printRef = useRef();
  const [customers, setCustomers] = useState([]);

  const { data: customersData, isLoading: customersLoading } = useFetchObjects(
    ["customers"],
    "customers/",
    token
  );

  const salesListEndpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.append("search", debouncedSearch);
    params.append("page", String(page + 1));
    params.append("page_size", "20");
    if (customerFilter?.id) params.append("customer", String(customerFilter.id));
    if (currencyFilter && currencyFilter !== "all") params.append("currency", currencyFilter);
    if (dateFrom) params.append("date_from", dateFrom);
    if (dateTo) params.append("date_to", dateTo);
    if (paymentStatus && paymentStatus !== "all") params.append("payment_status", paymentStatus);
    return `sales/?${params.toString()}`;
  }, [debouncedSearch, page, customerFilter?.id, currencyFilter, dateFrom, dateTo, paymentStatus]);

  const {
    data: sales,
    isLoading,
    isError,
    refetch: refetchSales,
  } = useFetchObjects(
    ["sales", debouncedSearch, page, 20, customerFilter?.id, currencyFilter, dateFrom, dateTo, paymentStatus],
    salesListEndpoint,
    token
  );

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && !isLoading) {
      setIsLoadingMore(true);
      setPage((prev) => prev + 1);
    }
  }, [isLoadingMore, hasMore, isLoading]);

  const handleScroll = useCallback(() => {
    if (!tableContainerRef.current || !hasMore || isLoadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 5) loadMore();
  }, [hasMore, isLoadingMore, loadMore]);

  useEffect(() => {
    if (customersData) {
      const customersArray = Array.isArray(customersData)
        ? customersData
        : customersData.results || [];
      setCustomers(customersArray);
    }
  }, [customersData]);

  useEffect(() => {
    if (sales) {
      const dataArray = Array.isArray(sales) ? sales : sales.results || [];
      setSalesData((prev) => {
        if (page === 0) return dataArray;
        const existingIds = new Set(prev.map((item) => item.id));
        return [...prev, ...dataArray.filter((item) => !existingIds.has(item.id))];
      });
      setHasMore(dataArray.length === 20);
      setIsLoadingMore(false);
      if (sales.count !== undefined) setTotalCount(sales.count);
      else if (sales.total !== undefined) setTotalCount(sales.total);
      else setTotalCount(dataArray.length);
    }
  }, [sales, page]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 380);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, customerFilter, currencyFilter, dateFrom, dateTo, paymentStatus]);

  const { handleDelete, ConfirmDialog } = useDelete("sales", token, refetchSales);

  const handlePrint = (sale) => {
    setSelectedSaleForPrint(sale);
    setTimeout(() => {
      if (!printRef.current) return;
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <html><head><title>${t("common.print")} - ${t("sales.saleDetails")}</title>
        <style>@page{margin:0}body{margin:0;padding:0}</style></head>
        <body><div>${printRef.current.innerHTML}</div></body></html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }, 500);
  };

  const handlePrintList = () => {
    printDataTable({
      title: t("sales.title", "Sales"),
      meta: [{ label: t("common.rows", "Rows"), value: String(salesData.length) }],
      columns: [
        { id: "id", label: t("common.id", "ID"), align: "center" },
        { id: "customer", label: t("customer.customer", "Customer") },
        { id: "date", label: t("sales.date", "Date") },
        { id: "total", label: t("sales.totalAmount", "Total"), align: "right" },
        { id: "received", label: t("sales.receivedAmount", "Received"), align: "right" },
        { id: "remaining", label: t("sales.remainingAmount", "Remaining"), align: "right" },
        { id: "currency", label: t("sales.currency", "Currency"), align: "center" },
      ],
      rows: salesData,
      getCell: (row, col) => {
        const ccy = row.currency || "AFN";
        if (col.id === "id") return `#${row.id}`;
        if (col.id === "customer") return row.customer_details?.name || "—";
        if (col.id === "date") {
          return row.sale_date ? new Date(row.sale_date).toLocaleDateString() : "—";
        }
        if (col.id === "total") return formatCurrency(row.total_amount || 0, ccy);
        if (col.id === "received") return formatCurrency(row.received_amount || 0, ccy);
        if (col.id === "remaining") {
          return formatCurrency(calculateRemainingAmount(row), ccy);
        }
        if (col.id === "currency") return ccy;
        return "—";
      },
    });
  };

  const calculateRemainingAmount = (sale) =>
    parseFloat(sale.total_amount || 0) - parseFloat(sale.received_amount || 0);

  const statusBadge = (sale) => {
    const remaining = calculateRemainingAmount(sale);
    if (sale.is_paid === true || remaining <= 0) {
      return (
        <Badge className="border-transparent bg-success/15 text-success hover:bg-success/15">
          {t("sales.paid", "Paid")}
        </Badge>
      );
    }
    if (sale.received_amount > 0) {
      return (
        <Badge className="border-transparent bg-warning/15 text-warning-foreground hover:bg-warning/15">
          {t("sales.partial", "Partial")}
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="bg-destructive/15 text-destructive hover:bg-destructive/15">
        {t("sales.unpaid", "Unpaid")}
      </Badge>
    );
  };

  const handleResetFilters = () => {
    setCurrencyFilter("all");
    setCustomerFilter(null);
    setSearchInput("");
    setDebouncedSearch("");
    setDateFrom("");
    setDateTo("");
    setPaymentStatus("all");
  };

  const hasActiveFilters =
    !!debouncedSearch ||
    !!customerFilter ||
    (currencyFilter && currencyFilter !== "all") ||
    !!dateFrom ||
    !!dateTo ||
    (paymentStatus && paymentStatus !== "all");

  return (
    <PageShell>
      <PageHeader
        title={t("sales.salesManagement", "Sales")}
        subtitle={t("sales.salesSubtitle", "View and manage your sales")}
        breadcrumbs={[
          { link: "/app/dashboard", label: t("navigation.dashboard", "Dashboard") },
          { link: "/app/sales", label: t("navigation.sales", "Sales") },
        ]}
        actions={[
          can("sales.create") ? (
            <Button key="add" onClick={() => navigate("/app/sales/add")} className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t("sales.addNew", "Add Sale")}
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
          <FilterField label={t("common.search", "Search")} className="sm:col-span-2">
            <FilterSearch
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value ?? "")}
              placeholder={t(
                "sales.masterSearchPlaceholder",
                "Search by #ID, customer, phone, product…"
              )}
            />
            <p className="text-[11px] text-muted-foreground">
              {!isLoading && page === 0
                ? t("sales.salesFoundCount", "{{count}} sales found", { count: totalCount })
                : t(
                    "sales.masterSearchHint",
                    "Searches sale number, customer, products, and notes."
                  )}
            </p>
          </FilterField>
        </ListToolbar>

        <div className="space-y-3 border-b border-border px-3 pb-3 sm:px-4">
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1.5">
              {debouncedSearch ? (
                <Badge variant="secondary" className="gap-1 pe-1">
                  &quot;{debouncedSearch}&quot;
                  <button type="button" className="rounded-sm p-0.5 hover:bg-muted" onClick={() => { setSearchInput(""); setDebouncedSearch(""); }}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null}
              {customerFilter ? (
                <Badge variant="secondary" className="gap-1 pe-1">
                  {customerFilter.name}
                  <button type="button" className="rounded-sm p-0.5 hover:bg-muted" onClick={() => setCustomerFilter(null)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null}
              {currencyFilter !== "all" ? (
                <Badge variant="secondary" className="gap-1 pe-1">
                  {currencyFilter}
                  <button type="button" className="rounded-sm p-0.5 hover:bg-muted" onClick={() => setCurrencyFilter("all")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null}
            </div>
          )}

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t("sales.advancedFilters", "Date, customer & payment")}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", advancedOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <FilterGrid>
                <FilterField label={t("sales.customer", "Customer")}>
                  <SearchableSelect
                    options={customers}
                    value={customerFilter}
                    onChange={setCustomerFilter}
                    loading={customersLoading}
                    placeholder={t("sales.filterCustomer", "Filter by customer")}
                    className="[&_button]:h-9"
                  />
                </FilterField>
                <FilterField label={t("sales.currency", "Currency")}>
                  <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                    <SelectTrigger className="h-9 w-full min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="AFN">AFN</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
                <FilterField label={t("finance.dateFrom", "Date from")}>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-full min-w-0" />
                </FilterField>
                <FilterField label={t("finance.dateTo", "Date to")}>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-full min-w-0" />
                </FilterField>
                <FilterField label={t("sales.paymentStatusFilter", "Payment status")}>
                  <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                    <SelectTrigger className="h-9 w-full min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                      <SelectItem value="paid">{t("sales.paymentStatusPaid", "Paid")}</SelectItem>
                      <SelectItem value="partial">{t("sales.paymentStatusPartial", "Partial")}</SelectItem>
                      <SelectItem value="unpaid">{t("sales.paymentStatusUnpaid", "Unpaid")}</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
              </FilterGrid>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div
          ref={tableContainerRef}
          className="max-h-[min(600px,70vh)] overflow-auto"
          onScroll={handleScroll}
        >
          <TooltipProvider delayDuration={200}>
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("sales.id", "ID")}</TableHead>
                  <TableHead>{t("sales.customer", "Customer")}</TableHead>
                  <TableHead>{t("sales.date", "Date")}</TableHead>
                  <TableHead className="text-end">{t("sales.totalAmount", "Total")}</TableHead>
                  <TableHead className="text-end">{t("sales.receivedAmount", "Received")}</TableHead>
                  <TableHead className="text-end">{t("sales.remainingAmount", "Remaining")}</TableHead>
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
                ) : salesData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                      {t("sales.noSalesFound", "No sales found")}
                    </TableCell>
                  </TableRow>
                ) : (
                  salesData.map((sale) => {
                    const remaining = calculateRemainingAmount(sale);
                    const currency = sale.currency || "USD";
                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium tabular-nums">#{sale.id}</TableCell>
                        <TableCell className="max-w-[160px] truncate">
                          {sale.customer_details?.name || sale.customer_name || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {sale.sale_date
                            ? new Date(sale.sale_date).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-end tabular-nums font-medium">
                          {formatCurrency(sale.total_amount || 0, currency)}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatCurrency(sale.received_amount || 0, currency)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-end tabular-nums",
                            remaining > 0 && "font-medium text-destructive"
                          )}
                        >
                          {formatCurrency(remaining, currency)}
                        </TableCell>
                        <TableCell>{statusBadge(sale)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-0.5">
                            <ActionBtn
                              title={t("common.view")}
                              className="text-primary hover:bg-primary/10"
                              onClick={() => navigate(`/app/sales/${sale.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </ActionBtn>
                            <Can perm="sales.edit">
                              <ActionBtn
                                title={t("common.edit")}
                                onClick={() => navigate(`/app/sales/${sale.id}/edit`)}
                              >
                                <Pencil className="h-4 w-4" />
                              </ActionBtn>
                            </Can>
                            <ActionBtn
                              title={t("common.print")}
                              onClick={() => handlePrint(sale)}
                            >
                              <Printer className="h-4 w-4" />
                            </ActionBtn>
                            <Can perm="sales.delete">
                              <ActionBtn
                                title={t("common.delete")}
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(sale.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </ActionBtn>
                            </Can>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                {isLoadingMore && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-3 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )}
                {!hasMore && salesData.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-3 text-center text-xs text-muted-foreground">
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

      {selectedSaleForPrint && (
        <div ref={printRef} className="hidden">
          <SalesPrint sale={selectedSaleForPrint} />
        </div>
      )}
    </PageShell>
  );
};

export default SalesIndex;
