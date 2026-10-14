import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { printDataTable } from '../../../utils/printDataTable';

import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  TableRow,
  TableCell,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from "@/compat/ui";
import {
  Add as AddIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Inventory as InventoryIcon,
  Close as CloseIcon,
} from "@/compat/icons";

import useFetchObjects from "../../../api/useFetchObjects";
import useDelete from "../../../api/useDelete";
import { useAuth } from "../../../context/AuthContext";

import PageHeader from "../../../components/PageHeader";
import ReusableTable from "../../../components/ReusableTable";
import { InlineAlert } from "../../../components/AlertMessage";
import { FormModal } from "../../../components/Modal";
import { FormSelectField } from "../../../components/FormFields";

const ProductIndex = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;

  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
    status: "",
    category: "",
  });

  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const [productsData, setProductsData] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Single selected product for view dialog
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewMoreOpen, setViewMoreOpen] = useState(false);

  const { data: categories = [] } = useFetchObjects(
    ["categories"],
    "category/",
    token
  );

  const {
    data: products,
    isLoading,
    isError,
  } = useFetchObjects(
    [
      "products",
      searchQuery,
      page,
      filters.name,
      filters.category,
      filters.status,
    ],
    (() => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', page + 1);
      params.append('page_size', 20);
      if (filters.name) params.append('name', filters.name);
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      return `products/?${params.toString()}`;
    })(),
    token
  );

  useEffect(() => {
    if (products) {
      const dataArray = Array.isArray(products)
        ? products
        : products.results || [];
      
      setProductsData(prev => {
        if (page === 0) return dataArray;
        const existingIds = new Set(prev.map(item => item.id));
        const newItems = dataArray.filter(item => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
      
      setHasMore(dataArray.length === 20);
      setIsLoadingMore(false);
    }
  }, [products, page]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, filters]);

  const { handleDelete, ConfirmDialog } = useDelete("products", token);

  const columns = [
    { id: "id", label: t("common.id"), sortable: true, minWidth: 70 },
    { id: "name", label: t("product.name"), sortable: true, minWidth: 180 },
    {
      id: "barcode",
      label: t("product.barcode"),
      sortable: true,
      minWidth: 150,
      format: (value) => (
        <span style={{ fontFamily: "ui-monospace, monospace", letterSpacing: "0.04em" }}>
          {value || "-"}
        </span>
      ),
    },
    {
      id: "category",
      label: t("product.category"),
      sortable: true,
      minWidth: 150,
      format: (_, row) => row.category_details?.name || "-",
    },
    {
      id: "status",
      label: t("common.status"),
      sortable: true,
      minWidth: 100,
      format: (value, row) => (
        <Chip
          label={row.is_deleted ? t("common.deleted") : t("common.active")}
          color={row.is_deleted ? "error" : "success"}
          size="small"
        />
      ),
    },
    {
      id: "actions",
      label: t("common.actions"),
      minWidth: 150,
      format: (value, row) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleView(row.id)}
            title={t("common.view")}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleEdit(row.id)}
            title={t("common.edit")}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(row.id)}
            title={t("common.delete")}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  const handleSearch = useCallback((query) => {
    setSearchQuery(query || '');
  }, []);

  const handleView = (id) => {
    const product = productsData.find((prod) => prod.id === id);
    if (product) {
      setSelectedProduct(product);
      setViewMoreOpen(true);
    }
  };

  const handleEdit = (id) => {
    navigate(`/app/inventory/products/${id}/edit`);
  };

  const handleAddProduct = () => {
    navigate("/app/inventory/products/add");
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handlePrintList = () => {
    handleMenuClose();
    printDataTable({
      title: t("product.title", "Products"),
      meta: [{ label: t("common.rows", "Rows"), value: String((productsData || []).length) }],
      columns: [
        { id: "id", label: t("common.id", "ID"), align: "center" },
        { id: "name", label: t("product.name", "Name") },
        { id: "barcode", label: t("product.barcode", "Barcode") },
        { id: "category", label: t("product.category", "Category") },
      ],
      rows: productsData || [],
      getCell: (row, col) => {
        if (col.id === "id") return `#${row.id}`;
        if (col.id === "name") return row.name || "—";
        if (col.id === "barcode") return row.barcode || "—";
        if (col.id === "category") return row.category_details?.name || row.category_name || "—";
        return "—";
      },
    });
  };

  const handleFilterOpen = () => {
    setFilterModalOpen(true);
  };

  const handleFilterClose = () => {
    setFilterModalOpen(false);
  };

  const handleFilterApply = (filterData) => {
    setFilters(filterData);
    setFilterModalOpen(false);
  };

  const handleFilterReset = () => {
    setFilters({
      name: "",
      status: "",
      category: "",
    });
    setFilterModalOpen(false);
  };

  const loadMore = () => {
    if (!isLoadingMore && hasMore && !isLoading) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
    }
  };

  const toolbarButtons = [
    <Button
      key="filter"
      startIcon={<FilterListIcon />}
      onClick={handleFilterOpen}
      variant={Object.values(filters).some(Boolean) ? "contained" : "outlined"}
      color={Object.values(filters).some(Boolean) ? "primary" : "inherit"}
      size="small"
    >
      {t("common.filter")}
    </Button>,
    <IconButton
      key="more"
      aria-label={t("common.more")}
      aria-controls="product-menu"
      aria-haspopup="true"
      onClick={handleMenuClick}
      size="small"
    >
      <MoreVertIcon />
    </IconButton>,
  ];

  const loadingComponent = (
    <>
      {Array.from(new Array(5)).map((_, rowIndex) => (
        <TableRow key={`skeleton-${rowIndex}`}>
          {columns.map((column, colIndex) => (
            <TableCell key={`skeleton-${rowIndex}-${colIndex}`}>
              <Skeleton variant="text" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );

  // Clean professional detail dialog
  const ViewMoreDialog = () => {
    if (!selectedProduct) return null;

    const infoItems = [
      { label: t("product.name"), value: selectedProduct.name },
      { label: t("product.barcode"), value: selectedProduct.barcode || "-" },
      {
        label: t("common.status"),
        value: selectedProduct.is_deleted
          ? t("common.deleted")
          : t("common.active"),
        chip: true,
        chipColor: selectedProduct.is_deleted ? "error" : "success",
      },
      {
        label: t("product.category"),
        value: selectedProduct.category_details?.name || "-",
      },
      { label: t("common.id"), value: selectedProduct.id },
      {
        label: t("common.createdAt"),
        value: selectedProduct.created_at
          ? new Date(selectedProduct.created_at).toLocaleString()
          : "-",
      },
      {
        label: t("common.updatedAt"),
        value: selectedProduct.updated_at
          ? new Date(selectedProduct.updated_at).toLocaleString()
          : "-",
      },
    ];

    return (
      <Dialog
        open={viewMoreOpen}
        onClose={() => setViewMoreOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, p: 3 } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            variant="h6"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <InventoryIcon color="primary" /> {t("product.details")}
          </Typography>
          <IconButton onClick={() => setViewMoreOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={2}>
            {infoItems.map(({ label, value, chip, chipColor }, idx) => (
              <Grid item xs={12} sm={chip ? 6 : 12} key={idx}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  {label}
                </Typography>
                {chip ? (
                  <Chip label={value} color={chipColor} size="small" />
                ) : (
                  <Typography variant="body1" sx={{ whiteSpace: "pre-line" }}>
                    {value}
                  </Typography>
                )}
              </Grid>
            ))}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ justifyContent: "flex-end" }}>
          <Button variant="outlined" onClick={() => setViewMoreOpen(false)}>
            {t("common.close")}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setViewMoreOpen(false);
              handleEdit(selectedProduct.id);
            }}
          >
            {t("common.edit")}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden pb-6">
      <PageHeader
        title={t("product.title")}
        subtitle={t("product.subtitle")}
        breadcrumbs={[
          { link: "/app/dashboard", label: t("navigation.dashboard") },
          { link: "/app/inventory", label: t("navigation.inventory") },
          { link: "/app/inventory/products", label: t("navigation.products") },
        ]}
        actions={[
          <Button
            key="add-product"
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddProduct}
          >
            {t("product.addNew")}
          </Button>,
        ]}
      />

      {isError && (
        <InlineAlert
          severity="error"
          message={isError.message || t("common.errorOccurred")}
          title={t("common.error")}
          sx={{ mb: 2 }}
        />
      )}

      <ReusableTable
        columns={columns}
        data={productsData || []}
        title={t("product.productList")}
        onEdit={handleEdit}
        onView={handleView}
        onDelete={handleDelete}
        onSearch={handleSearch}
        searchQuery={searchQuery}
        rowActions={true}
        loading={isLoading && page === 0}
        loadingComponent={loadingComponent}
        pagination={false}
        toolbarButtons={toolbarButtons}
        onLoadMore={loadMore}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
      />

      <ViewMoreDialog />

      <Menu
        id="product-menu"
        anchorEl={anchorEl}
        open={openMenu}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={handleMenuClose}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          {t("common.export")}
        </MenuItem>
        <MenuItem onClick={handlePrintList}>
          <PrintIcon fontSize="small" sx={{ mr: 1 }} />
          {t("common.print")}
        </MenuItem>
      </Menu>

      <FormModal
        open={filterModalOpen}
        onClose={handleFilterClose}
        title={t("common.filter")}
        onSubmit={() => handleFilterApply(filters)}
        submitText={t("common.apply")}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <FormSelectField
            name="category"
            label={t("product.category")}
            value={filters.category}
            onChange={(e) =>
              setFilters({ ...filters, category: e.target.value })
            }
            options={[
              { value: "", label: t("common.all") },
              ...(categories || []).map((cat) => ({
                value: cat.id,
                label: cat.name,
              })),
            ]}
          />

          <FormSelectField
            name="status"
            label={t("common.status")}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            options={[
              { value: "", label: t("common.all") },
              { value: "ACTIVE", label: t("common.active") },
              { value: "INACTIVE", label: t("common.inactive") },
            ]}
          />

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
            <Button onClick={handleFilterReset} color="inherit">
              {t("common.reset")}
            </Button>
          </Box>
        </Box>
      </FormModal>

      <ConfirmDialog />
    </div>
  );
};

export default ProductIndex;



