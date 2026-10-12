import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { printDataTable } from '../../../utils/printDataTable';

import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  Skeleton,
  TableRow,
  TableCell,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
} from "@/compat/ui";
import {
  Add as AddIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ReceiptLong as ReceiptLongIcon,
  Business as BusinessIcon,
  Close as CloseIcon,
} from "@/compat/icons";

// Custom hooks
import useFetchObjects from "../../../api/useFetchObjects";
import useDelete from "../../../api/useDelete";
import { useAuth } from "../../../context/AuthContext";

// Components
import PageHeader from "../../../components/PageHeader";
import ReusableTable from "../../../components/ReusableTable";
import { InlineAlert } from "../../../components/AlertMessage";
import { FormModal } from "../../../components/Modal";
import {
  FormSelectField,
  FormDatePicker,
} from "../../../components/FormFields";

function formatMoney(amount) {
  if (amount == null || amount === "") return "—";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function remainingColor(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n === 0) return "success.main";
  return n > 0 ? "warning.main" : "error.main";
}

const SupplierIndex = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Changed to 0-based for MUI TablePagination

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    type: "",
  });

  // Menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  // State for suppliers data
  const [suppliersData, setSuppliersData] = useState([]);
  // Add state for view dialog
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [viewMoreOpen, setViewMoreOpen] = useState(false);

  // Fetch suppliers with search
  const {
    data: suppliers,
    isLoading,
    isError,
    refetch: refetchSuppliers,
  } = useFetchObjects(
    ["suppliers", searchQuery, page, 20, filters.status, filters.type],
    (() => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', page + 1);
      params.append('page_size', 20);
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      return `suppliers/?${params.toString()}`;
    })(),
    token
  );

  // Process suppliers data when it changes
  useEffect(() => {
    if (suppliers) {
      const dataArray = Array.isArray(suppliers)
        ? suppliers
        : suppliers.results || [];
      
      setSuppliersData(prev => {
        if (page === 0) return dataArray;
        const existingIds = new Set(prev.map(item => item.id));
        const newItems = dataArray.filter(item => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
      
      setHasMore(dataArray.length === 20);
      setIsLoadingMore(false);
    }
  }, [suppliers, page]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, filters]);

  const { handleDelete, ConfirmDialog } = useDelete("suppliers", token);

  // Table columns configuration
  const columns = [
    {
      id: "id",
      label: t("common.id"),
      sortable: true,
      minWidth: 70,
      align: 'center',
    },
    {
      id: "name",
      label: t("supplier.name"),
      sortable: true,
      minWidth: 180,
      align: 'center',
    },
    {
      id: "contact",
      label: t("supplier.contact"),
      sortable: true,
      minWidth: 140,
      align: 'center',
    },
    {
      id: "address",
      label: t("supplier.address"),
      sortable: true,
      minWidth: 200,
      align: 'center',
      },
    {
      id: "financial_summary",
      label: t("supplier.totalAmount"),
      sortable: true,
      minWidth: 200,
      align: 'center',
      format: (value) => formatMoney(value?.total_amount),
    },
    {
      id: "financial_summary",
      label: t("supplier.totalPaid"),
      sortable: true,
      minWidth: 200,
      align: 'center',
      format: (value) => formatMoney(value?.paid_amount),
    },
    {
      id: "financial_summary",
      label: t("supplier.totalRemaining"),
      sortable: true,
      align: 'center',
      minWidth: 200,
      format: (value) => (
        <Typography variant="body2" sx={{ color: remainingColor(value?.remaining_amount) }}>
          {formatMoney(value?.remaining_amount)}
        </Typography>
      ),
    },
    {
      id: "actions",
      label: t("common.actions"),
      minWidth: 150,
      align: "center",
    },
  ];

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query || '');
  };

  // Handle row actions
  const handleView = (id) => {
    const supplier = suppliersData.find((sup) => sup.id === id);
    if (supplier) {
      setSelectedSupplier(supplier);
      setViewMoreOpen(true);
    }
  };

  const handleLedger = (id) => {
    navigate(`/app/contacts/suppliers/${id}/ledger`);
  };

  const handleEdit = (id) => {
    navigate(`/app/contacts/suppliers/${id}/edit`);
  };

  // Handle menu
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handlePrintList = () => {
    handleMenuClose();
    printDataTable({
      title: t("supplier.title", "Suppliers"),
      meta: [{ label: t("common.rows", "Rows"), value: String((suppliersData || []).length) }],
      columns: [
        { id: "id", label: t("common.id", "ID"), align: "center" },
        { id: "name", label: t("supplier.name", "Name") },
        { id: "contact", label: t("supplier.contact", "Contact") },
        { id: "address", label: t("supplier.address", "Address") },
      ],
      rows: suppliersData || [],
      getCell: (row, col) => {
        if (col.id === "id") return `#${row.id}`;
        if (col.id === "name") return row.name || "—";
        if (col.id === "contact") return row.contact || "—";
        if (col.id === "address") return row.address || "—";
        return "—";
      },
    });
  };

  // Handle filter modal
  const handleFilterOpen = () => {
    setFilterModalOpen(true);
  };

  const handleFilterClose = () => {
    setFilterModalOpen(false);
  };

  const handleFilterApply = (appliedFilters) => {
    setFilters(appliedFilters);
    setFilterModalOpen(false);
  };

  const handleFilterReset = () => {
    setFilters({
      status: "",
      type: "",
    });
    setFilterModalOpen(false);
  };

  // Handle pagination
  const loadMore = () => {
    if (!isLoadingMore && hasMore && !isLoading) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
    }
  };

  // Render toolbar buttons
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
  ];

  // Custom loading component for the table
  const loadingComponent = (
    <TableRow>
      <TableCell colSpan={99}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {[...Array(5)].map((_, index) => (
            <Skeleton key={index} variant="rectangular" height={40} />
          ))}
        </Box>
      </TableCell>
    </TableRow>
  );

  // Add ViewMoreDialog component
  const ViewMoreDialog = () => {
    if (!selectedSupplier) return null;

    return (
      <Dialog
        open={viewMoreOpen}
        onClose={() => setViewMoreOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: (theme) => theme.shadows[10],
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            pb: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Box
              sx={{
                bgcolor: "primary.main",
                color: "white",
                p: 1,
                borderRadius: "50%",
                display: "flex",
                margin: "0px 5px",
              }}
            >
              <BusinessIcon />
            </Box>
            <Typography variant="h6">{t("supplier.details")}</Typography>
          </Box>
          <IconButton
            aria-label={t("common.accessibility.close")}
            onClick={() => setViewMoreOpen(false)}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            {/* Basic Information Section */}
            <Grid item xs={12}>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                color="primary"
                gutterBottom
              >
                {t("supplier.basicInfo")}
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("supplier.name")}
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedSupplier.name || "-"}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('supplier.totalAmount')}
                  </Typography>
                  <Typography variant="body1">
                    {formatMoney(selectedSupplier.financial_summary?.total_amount)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('supplier.totalPaid')}
                  </Typography>
                  <Typography variant="body1">
                    {formatMoney(selectedSupplier.financial_summary?.paid_amount)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('supplier.totalRemaining')}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ color: remainingColor(selectedSupplier.financial_summary?.remaining_amount) }}
                  >
                    {formatMoney(selectedSupplier.financial_summary?.remaining_amount)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("supplier.contact")}
                  </Typography>
                  <Typography variant="body1">
                    {selectedSupplier.contact || "-"}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("supplier.address")}
                  </Typography>
                  <Typography variant="body1">
                    {selectedSupplier.address || "-"}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("common.status")}
                  </Typography>
                  <Typography variant="body1">
                    {selectedSupplier.status || "-"}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>

            {/* Financial Information Section */}
            <Grid item xs={12}>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                color="primary"
                gutterBottom
              >
                {t("supplier.financialInfo")}
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("supplier.totalAmount")}
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatMoney(selectedSupplier.financial_summary?.total_amount)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("supplier.totalPaid")}
                  </Typography>
                  <Typography variant="body1">
                    {formatMoney(selectedSupplier.financial_summary?.paid_amount)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("supplier.totalRemaining")}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ color: remainingColor(selectedSupplier.financial_summary?.remaining_amount) }}
                  >
                    {formatMoney(selectedSupplier.financial_summary?.remaining_amount)}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>

            {/* Notes Section (if available) */}
            {selectedSupplier.notes && (
              <Grid item xs={12}>
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  color="primary"
                  gutterBottom
                >
                  {t("common.notes")}
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box
                  sx={{
                    p: 2,
                    bgcolor: "grey.50",
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "grey.200",
                  }}
                >
                  <Typography variant="body1">
                    {selectedSupplier.notes}
                  </Typography>
                </Box>
              </Grid>
            )}

            {/* System Information Section */}
            <Grid item xs={12}>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                color="primary"
                gutterBottom
              >
                {t("common.systemInfo")}
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("common.id")}
                  </Typography>
                  <Typography variant="body1">
                    {selectedSupplier.id || "-"}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("common.createdAt")}
                  </Typography>
                  <Typography variant="body1">
                    {selectedSupplier.created_at
                      ? new Date(selectedSupplier.created_at).toLocaleString()
                      : "-"}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("common.updatedAt")}
                  </Typography>
                  <Typography variant="body1">
                    {selectedSupplier.updated_at
                      ? new Date(selectedSupplier.updated_at).toLocaleString()
                      : "-"}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Button
            variant="outlined"
            onClick={() => setViewMoreOpen(false)}
            style={{ margin: "0px 5px" }}
          >
            {t("common.close")}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setViewMoreOpen(false);
              handleEdit(selectedSupplier.id);
            }}
            startIcon={<EditIcon style={{ margin: "0px 5px" }} />}
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
        title={t("supplier.title")}
        subtitle={t("supplier.subtitle")}
        breadcrumbs={[
          { link: "/app/dashboard", label: t("navigation.dashboard") },
          { link: "/app/contacts", label: t("navigation.contacts") },
          { link: "/app/contacts/suppliers", label: t("navigation.suppliers") },
        ]}
        actions={[
          <Button
            key="add-supplier"
            variant="contained"
            color="primary"
            startIcon={<AddIcon style={{ margin: "0px 5px" }} />}
            onClick={() => navigate("/app/contacts/suppliers/add")}
          >
            {t("supplier.addNew")}
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
        data={suppliersData || []}
        title={t("supplier.supplierList")}
        onEdit={handleEdit}
        onView={handleView}
        onDelete={handleDelete}
        onLedger={handleLedger}
        onSearch={handleSearch}
        enableSelection={true}
        rowActions={true}
        loading={isLoading && page === 0}
        loadingComponent={loadingComponent}
        pagination={false}
        toolbarButtons={toolbarButtons}
        onLoadMore={loadMore}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        responsive={true}
        chipField="status"
        chipOptions={{
          ACTIVE: { color: "success", label: t("supplier.status.active") },
          INACTIVE: { color: "error", label: t("supplier.status.inactive") },
          PENDING: { color: "warning", label: t("supplier.status.pending") },
        }}
        customRowAction={null}
      />

      <ViewMoreDialog />

      {/* Menu for extra actions */}
      <Menu
        id="supplier-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
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

      {/* Filter Modal */}
      <FormModal
        open={filterModalOpen}
        onClose={handleFilterClose}
        title={t("common.filter")}
        onSubmit={() => handleFilterApply(filters)}
        submitText={t("common.apply")}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <FormSelectField
            name="status"
            label={t("common.status")}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            options={[
              { value: "ACTIVE", label: t("supplier.status.active") },
              { value: "INACTIVE", label: t("supplier.status.inactive") },
              { value: "PENDING", label: t("supplier.status.pending") },
            ]}
          />

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
            <Button onClick={handleFilterReset} color="inherit">
              {t("common.reset")}
            </Button>
          </Box>
        </Box>
      </FormModal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog />
    </div>
  );
};

export default SupplierIndex;
