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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  Typography,
  useTheme,
  Skeleton,
  TableRow,
  TableCell,
  Badge,
  TextField,
} from "@/compat/ui";
import {
  Add as AddIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Badge as BadgeIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Close as CloseIcon,
} from "@/compat/icons";
import { useAuth } from "../../../context/AuthContext";

// Custom hooks
import useFetchObjects from "../../../api/useFetchObjects";
import useDelete from "../../../api/useDelete";

// Components
import PageHeader from "../../../components/PageHeader";
import ReusableTable from "../../../components/ReusableTable";
import { ConfirmationModal } from "../../../components/Modal";
import { InlineAlert } from "../../../components/AlertMessage";
import { FormModal } from "../../../components/Modal";
import { FormSelectField } from "../../../components/FormFields";

const EmployeeIndex = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;
  //pagenation sate
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // State for employees data
  const [employeesData, setEmployeesData] = useState([]);
  // State for search, filters, and modals
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    department: "",
    month: "",
    year: "",
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  // State for menu
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  // Fetch employees with search
  const {
    data: employees,
    isLoading,
    isError,
    refetch,
  } = useFetchObjects(
    ["employees", searchQuery, page, 20, filters.department, filters.month, filters.year],
    (() => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', page + 1);
      params.append('page_size', 20);
      if (filters.department) params.append('department', filters.department);
      if (filters.month) params.append('month', filters.month);
      if (filters.year) params.append('year', filters.year);
      return `employees/?${params.toString()}`;
    })(),
    token
  );

  // Process employees data when it changes
  useEffect(() => {
    if (employees) {
      const dataArray = Array.isArray(employees)
        ? employees
        : employees.results || [];
      
      setEmployeesData(prev => {
        if (page === 0) return dataArray;
        const existingIds = new Set(prev.map(item => item.id));
        const newItems = dataArray.filter(item => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
      
      setHasMore(dataArray.length === 20);
      setIsLoadingMore(false);
    }
  }, [employees, page]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, filters]);

  const { handleDelete, ConfirmDialog } = useDelete("employees", token);

  // Table columns configuration
  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  // Handle row actions
  const handleView = (id) => {
    const employee = employeesData.find((emp) => emp.id === id);
    if (employee) {
      setSelectedEmployee(employee);
      setViewMoreOpen(true);
    }
  };

  const handleEdit = (id) => {
    navigate(`/app/hr/employees/edit/${id}`);
  };

  const handleLedger = (id) => {
    navigate(`/app/accounting/reports/employee-ledger?employee_id=${id}`);
  };

  // Handle delete
  const handleDeleteEmployee = (id) => {
    handleDelete(id);
    setDeleteConfirmOpen(true);
  };

  // Handle menu
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
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
      department: "",
      month: "",
      year: "",
    });
    setFilterModalOpen(false);
  };

  // Month options for filter
  const monthOptions = [
    { value: "", label: t("common.all") },
    { value: "1", label: t("months.january") },
    { value: "2", label: t("months.february") },
    { value: "3", label: t("months.march") },
    { value: "4", label: t("months.april") },
    { value: "5", label: t("months.may") },
    { value: "6", label: t("months.june") },
    { value: "7", label: t("months.july") },
    { value: "8", label: t("months.august") },
    { value: "9", label: t("months.september") },
    { value: "10", label: t("months.october") },
    { value: "11", label: t("months.november") },
    { value: "12", label: t("months.december") },
  ];

  // Year options for filter - last 5 years and next 2 years
  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { value: "", label: t("common.all") },
    ...Array.from({ length: 7 }, (_, i) => ({
      value: String(currentYear - 4 + i),
      label: String(currentYear - 4 + i),
    })),
  ];

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

  // Table columns configuration
  const columns = [
    { id: "id", label: t("common.id"), minWidth: 70 },
    { id: "name", label: t("employee.name"), minWidth: 150 },
    { id: "contact", label: t("employee.contact"), minWidth: 120 },
    { id: "salary", label: t("employee.salary"), minWidth: 100 },
    {
      id: "paid",
      label: t("employee.paidThisPeriod", "Paid"),
      minWidth: 110,
      format: (_, row) => row?.finance?.total_paid ?? 0,
    },
    {
      id: "remaining",
      label: t("employee.totalRemaining", "Remaining"),
      minWidth: 130,
      format: (_, row) => row?.finance?.remaining_amount ?? (row?.salary ?? 0),
    },
    { id: "created_at", label: t("common.createdAt"), minWidth: 150, format: (value) => value ? new Date(value).toLocaleString() : '-' },
  ];

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handlePrintList = () => {
    handleMenuClose();
    printDataTable({
      title: t("hr.employees", "Employees"),
      meta: [{ label: t("common.rows", "Rows"), value: String((employeesData || []).length) }],
      columns: [
        { id: "id", label: t("common.id", "ID"), align: "center" },
        { id: "name", label: t("employee.name", "Name") },
        { id: "contact", label: t("employee.contact", "Contact") },
        { id: "position", label: t("employee.position", "Position") },
      ],
      rows: employeesData || [],
      getCell: (row, col) => {
        if (col.id === "id") return `#${row.id}`;
        if (col.id === "name") return row.name || "—";
        if (col.id === "contact") return row.contact || row.phone || "—";
        if (col.id === "position") return row.position || row.role || "—";
        return "—";
      },
    });
  };

  // Add these state variables at the top of the component
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [viewMoreOpen, setViewMoreOpen] = useState(false);

  // Add ViewMoreDialog component
  const ViewMoreDialog = () => {
    if (!selectedEmployee) return null;

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
                margin: "0px 5px",
                display: "flex",
              }}
            >
              <PersonIcon />
            </Box>
            <Typography variant="h6">{t("employee.details")}</Typography>
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
            {/* Personal Information Section */}
            <Grid item xs={12}>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                color="primary"
                gutterBottom
              >
                {t("employee.personalInfo")}
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("employee.name")}
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedEmployee.name || "-"}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("employee.fatherName")}
                  </Typography>
                  <Typography variant="body1">
                    {selectedEmployee.fathername || "-"}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("employee.contact")}
                  </Typography>
                  <Typography variant="body1">
                    {selectedEmployee.contact || "-"}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("employee.address")}
                  </Typography>
                  <Typography variant="body1">
                    {selectedEmployee.address || "-"}
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
                {t("employee.financialInfo")}
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("employee.salary")}
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedEmployee.salary
                      ? `${selectedEmployee.salary} ؋`
                      : "-"}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("employee.totalPaid")}
                  </Typography>
                  <Typography variant="body1">
                    {selectedEmployee.finance?.total_paid
                      ? `${selectedEmployee.finance.total_paid} ؋`
                      : "-"}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("employee.remaining")}
                  </Typography>
                  <Typography
                    variant="body1"
                    color={
                      !selectedEmployee.finance?.remaining_amount
                        ? "text.primary"
                        : selectedEmployee.finance.remaining_amount < 0
                        ? "error.main"
                        : selectedEmployee.finance.remaining_amount > 0
                        ? "warning.main"
                        : "success.main"
                    }
                  >
                    {selectedEmployee.finance?.remaining_amount
                      ? `${selectedEmployee.finance.remaining_amount} ؋`
                      : "-"}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>

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
                    {t("common.createdAt")}
                  </Typography>
                  <Typography variant="body1">
                    {selectedEmployee.created_at
                      ? new Date(selectedEmployee.created_at).toLocaleString()
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
                    {selectedEmployee.updated_at
                      ? new Date(selectedEmployee.updated_at).toLocaleString()
                      : "-"}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("common.id")}
                  </Typography>
                  <Typography variant="body1">
                    {selectedEmployee.id || "-"}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>

            {/* Tazkira Section (if available) */}
            {selectedEmployee.tazkira && (
              <Grid item xs={12}>
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  color="primary"
                  gutterBottom
                >
                  {t("employee.documents")}
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ mt: 1 }}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("employee.tazkira")}
                  </Typography>
                  <Box
                    component="img"
                    src={selectedEmployee.tazkira}
                    alt={t("employee.tazkira")}
                    sx={{
                      maxWidth: "100%",
                      maxHeight: 200,
                      objectFit: "contain",
                      mt: 1,
                      border: "1px solid #eee",
                      borderRadius: 1,
                    }}
                  />
                </Box>
              </Grid>
            )}
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
              handleEdit(selectedEmployee.id);
            }}
            startIcon={<EditIcon style={{ margin: "0px 5px" }} />}
          >
            {t("common.edit")}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Handle pagination
  const loadMore = () => {
    if (!isLoadingMore && hasMore && !isLoading) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden pb-6">
      <PageHeader
        title={t("employee.employees")}
        subtitle={t("employee.management")}
        actions={[
          <Button
            key="add"
            variant="contained"
            color="primary"
            startIcon={<AddIcon style={{ margin: "0px 5px" }} />}
            onClick={() => navigate("/app/hr/employees/add")}
          >
            {t("employee.add")}
          </Button>,
        ]}
        icon={<BadgeIcon />}
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
        data={employeesData || []}
        title={t("employee.employeeList")}
        onEdit={handleEdit}
        onView={handleView}
        onLedger={handleLedger}
        onDelete={handleDeleteEmployee}
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
      />

      <ViewMoreDialog />

      {/* Menu for extra actions */}
      <Menu
        id="employee-menu"
        anchorEl={anchorEl}
        open={openMenu}
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
          <TextField
            name="department"
            label={t("employee.department")}
            value={filters.department}
            onChange={(e) =>
              setFilters({ ...filters, department: e.target.value })
            }
            fullWidth
          />

          <TextField
            select
            name="month"
            label={t("employee.month")}
            value={filters.month}
            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            fullWidth
          >
            {monthOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            name="year"
            label={t("employee.year")}
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            fullWidth
          >
            {yearOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
            <Button onClick={handleFilterReset} color="inherit">
              {t("common.reset")}
            </Button>
          </Box>
        </Box>
      </FormModal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          handleDelete(selectedEmployeeId);
        }}
        title={t("common.deleteConfirmation")}
      />
    </div>
  );
};

export default EmployeeIndex;
