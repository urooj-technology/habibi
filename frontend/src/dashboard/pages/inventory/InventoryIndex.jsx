import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Filter, Download, ChevronDown, Edit, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Custom hooks
import useFetchObjects from "../../../api/useFetchObjects";
import useDelete from "../../../api/useDelete";
import { useAuth } from "../../../context/AuthContext";
import { API_BASE_URL } from "../../../config/env";

// Components
import ReusableTable from "../../../components/ReusableTable";
import PageHeader from "../../../components/PageHeader";
import { InlineAlert } from "../../../components/AlertMessage";
import { FormModal } from "../../../components/Modal";
import SearchableSelect from "../../../components/SearchableSelect";

const InventoryIndex = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [viewMoreOpen, setViewMoreOpen] = useState(false);
  const [inventoryData, setInventoryData] = useState([]);

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    product: "",
  });

  // Temporary filters for the modal
  const [tempFilters, setTempFilters] = useState({
    product: null,
  });

  // Products data for filter select
  const [productsData, setProductsData] = useState([]);

  // Fetch inventory data
  const {
    data: inventory,
    isLoading,
    isError,
    refetch,
  } = useFetchObjects(
    ["inventory", searchQuery, page, filters.product],
    (() => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', page + 1);
      params.append('page_size', 20);
      if (filters.product) params.append('product', filters.product);
      return `inventory/?${params.toString()}`;
    })(),
    token
  );

  // Fetch products data for filter
  const {
    data: productsRawData,
    isLoading: productsLoading,
  } = useFetchObjects(["products"], `products/?page_size=100`, token);

  // Process products data when it changes
  useEffect(() => {
    if (productsRawData) {
      const dataArray = Array.isArray(productsRawData)
        ? productsRawData
        : productsRawData.results || [];
      setProductsData(dataArray);
    }
  }, [productsRawData]);

  // Process inventory data when it changes
  useEffect(() => {
    if (inventory) {
      const dataArray = Array.isArray(inventory)
        ? inventory
        : inventory.results || [];

      if (page === 0) {
        setInventoryData(dataArray);
      } else {
        setInventoryData(prev => [...prev, ...dataArray]);
      }

      setHasMore(dataArray.length === 20);
      setIsLoadingMore(false);
    }
  }, [inventory, page]);

  useEffect(() => {
    setPage(0);
    setInventoryData([]);
    setHasMore(true);
  }, [searchQuery, filters]);

  const { handleDelete, ConfirmDialog } = useDelete("inventory", token);

  // Handle search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query || '');
  }, []);

  // Handle row actions
  const handleView = (id) => {
    const item = inventoryData.find((inv) => inv.id === id);
    if (item) {
      setSelectedInventory(item);
      setViewMoreOpen(true);
    }
  };

  const handleEdit = (id) => {
    navigate(`/app/inventory/edit/${id}`);
  };

  // Handle filter modal
  const handleFilterOpen = () => {
    const selectedProduct = filters.product
      ? productsData.find((p) => p.id === parseInt(filters.product)) || null
      : null;

    setTempFilters({
      product: selectedProduct,
    });
    setFilterModalOpen(true);
  };

  const handleFilterClose = () => {
    setFilterModalOpen(false);
  };

  const handleFilterApply = () => {
    const newFilters = {
      product: tempFilters.product ? tempFilters.product.id : "",
    };

    setFilters(newFilters);
    setFilterModalOpen(false);
    setPage(0);
  };

  const handleFilterReset = () => {
    setTempFilters({
      product: null,
    });
    setFilters({
      product: "",
    });
    setFilterModalOpen(false);
    setPage(0);
  };

  // Refetch when filters or search change
  useEffect(() => {
    refetch();
  }, [filters, searchQuery, page, refetch]);

  // Handle pagination
  const loadMore = () => {
    if (!isLoadingMore && hasMore && !isLoading) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
    }
  };

  const downloadExport = async (kind) => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (filters.product) params.append("product", filters.product);
      const qs = params.toString();
      const url = `${API_BASE_URL}/inventory/export/${kind}/${qs ? `?${qs}` : ""}`;
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
        (m && m[1]) ||
        (kind === "excel" ? "stock-inventory.xlsx" : "stock-inventory.pdf");

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

  // Render toolbar buttons
  const toolbarButtons = [
    <Button
      key="filter"
      variant={Object.values(filters).some(Boolean) ? "default" : "outline"}
      size="sm"
      onClick={handleFilterOpen}
    >
      <Filter className="h-4 w-4" />
      {t("common.filter")}
    </Button>,
    <DropdownMenu key="export">
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
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
    </DropdownMenu>,
  ];

  // Table columns configuration
  const columns = [
    { id: "id", label: t("common.id"), minWidth: 70 },
    {
      id: "product",
      label: t("inventory.product"),
      minWidth: 150,
      format: (value, row) => row.product_details?.name || "-"
    },
    { id: "weight_amount", label: t("inventory.weightAmount"), minWidth: 120 },
    { id: "khada_amount", label: t("inventory.khadaAmount"), minWidth: 120 },
    { id: "meter_amount", label: t("inventory.meterAmount"), minWidth: 120 },
    { id: "thickness", label: t("inventory.thickness"), minWidth: 100 },
  ];

  const InfoField = ({ label, value }) => (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-base font-medium text-foreground">{value}</p>
    </div>
  );

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden pb-6">
      <PageHeader
        title={t("inventory.title")}
        subtitle={t("inventory.managementSubtitle")}
        breadcrumbs={[
          { link: "/app/dashboard", label: t("navigation.dashboard") },
          { link: "/app/inventory", label: t("navigation.inventory") },
        ]}
      />

      {isError && (
        <InlineAlert
          severity="error"
          message={isError.message || t("common.errorOccurred")}
          title={t("common.error")}
          sx={{ marginBottom: "1rem" }}
        />
      )}

      <ReusableTable
        columns={columns}
        data={inventoryData || []}
        title={t("inventory.inventoryList")}
        onView={handleView}
        onSearch={handleSearch}
        enableSelection={true}
        rowActions={true}
        loading={isLoading && page === 0}
        pagination={false}
        toolbarButtons={toolbarButtons}
        onLoadMore={loadMore}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
      />

      {/* View More Dialog */}
      <Dialog open={viewMoreOpen} onOpenChange={setViewMoreOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground p-2 rounded-full flex">
                <Package className="h-4 w-4" />
              </div>
              <DialogTitle>{t("inventory.details")}</DialogTitle>
            </div>
          </DialogHeader>
          {selectedInventory && (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-bold text-primary mb-2">{t("inventory.productInfo")}</p>
                <hr className="border-border mb-3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoField label={t("inventory.product")} value={selectedInventory.product_details?.name || "-"} />
                  <InfoField label={t("common.id")} value={selectedInventory.id || "-"} />
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-primary mb-2">{t("inventory.quantityInfo")}</p>
                <hr className="border-border mb-3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoField
                    label={t("inventory.weightAmount")}
                    value={selectedInventory.weight_amount ? parseFloat(selectedInventory.weight_amount).toFixed(2) : "0.00"}
                  />
                  <InfoField
                    label={t("inventory.khadaAmount")}
                    value={selectedInventory.khada_amount ? parseFloat(selectedInventory.khada_amount).toFixed(2) : "0.00"}
                  />
                  <InfoField
                    label={t("inventory.meterAmount")}
                    value={selectedInventory.meter_amount ? parseFloat(selectedInventory.meter_amount).toFixed(2) : "0.00"}
                  />
                  <InfoField
                    label={t("inventory.thickness")}
                    value={selectedInventory.thickness ? parseFloat(selectedInventory.thickness).toFixed(2) : "0.00"}
                  />
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-primary mb-2">{t("common.systemInfo")}</p>
                <hr className="border-border mb-3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoField
                    label={t("common.createdAt")}
                    value={selectedInventory.created_at ? new Date(selectedInventory.created_at).toLocaleString() : "-"}
                  />
                  <InfoField
                    label={t("common.updatedAt")}
                    value={selectedInventory.updated_at ? new Date(selectedInventory.updated_at).toLocaleString() : "-"}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewMoreOpen(false)}>
              {t("common.close")}
            </Button>
            <Button
              onClick={() => {
                setViewMoreOpen(false);
                handleEdit(selectedInventory.id);
              }}
            >
              <Edit className="h-4 w-4" />
              {t("common.edit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Modal */}
      <FormModal
        open={filterModalOpen}
        onClose={handleFilterClose}
        title={t("common.filter")}
        onSubmit={handleFilterApply}
        submitText={t("common.apply")}
      >
        <div className="flex flex-col gap-4 pt-1">
          <SearchableSelect
            options={productsData || []}
            getOptionLabel={(option) => option.name || ""}
            value={tempFilters.product}
            onChange={(newValue) => setTempFilters({ ...tempFilters, product: newValue })}
            loading={productsLoading}
            label="inventory.product"
            isOptionEqualToValue={(option, value) => option.id === value?.id}
          />

          <div className="flex justify-between mt-2">
            <Button variant="ghost" onClick={handleFilterReset}>
              {t("common.reset")}
            </Button>
          </div>
        </div>
      </FormModal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog />
    </div>
  );
};

export default InventoryIndex;
