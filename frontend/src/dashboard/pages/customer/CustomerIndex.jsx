import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { printDataTable } from '../../../utils/printDataTable';

import {
  Button,
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  Skeleton,
  TableRow,
  TableCell,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider
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
  ReceiptLong as ReceiptLongIcon,
  Person as PersonIcon,
  Close as CloseIcon
} from "@/compat/icons";

// Custom hooks
import useFetchObjects from '../../../api/useFetchObjects';
import useDelete from "../../../api/useDelete";

// Components
import { useAuth } from "../../../context/AuthContext";
import ReusableTable from '../../../components/ReusableTable';
import PageHeader from '../../../components/PageHeader';
import { InlineAlert } from '../../../components/AlertMessage';
import { FormModal } from '../../../components/Modal';
import { FormSelectField, FormDatePicker } from '../../../components/FormFields';

const CustomerIndex = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
  });
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);
  
  // State for customers data
  const [customersData, setCustomersData] = useState([]);
  // Add state for view dialog
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [viewMoreOpen, setViewMoreOpen] = useState(false);
  
  // Fetch customers with search
  const {
    data: customers,
    isLoading,
    isError,
    refetch: refetchCustomers
  } = useFetchObjects(
    ["customers", searchQuery, page, 20, filters.status, filters.type],
    (() => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', page + 1);
      params.append('page_size', 20);
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      return `customers/?${params.toString()}`;
    })(),
    token
  );

  // Process customers data when it changes
  useEffect(() => {
    if (customers) {
      const dataArray = Array.isArray(customers)
        ? customers
        : customers.results || [];
      
      setCustomersData(prev => {
        if (page === 0) return dataArray;
        const existingIds = new Set(prev.map(item => item.id));
        const newItems = dataArray.filter(item => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
      
      setHasMore(dataArray.length === 20);
      setIsLoadingMore(false);
    }
  }, [customers, page]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, filters]);

  const { handleDelete, ConfirmDialog } = useDelete("customers", token);
  
  // Table columns configuration
  const columns = [
    { 
      id: 'id', 
      label: t('common.id'), 
      sortable: true,
      align: 'center',
      minWidth: 70
    },
    { 
      id: 'name', 
      label: t('customer.name'), 
      sortable: true,
      minWidth: 180,
      align: 'center'
    },
    { 
      id: 'contact', 
      label: t('customer.contact'), 
      sortable: true,
      minWidth: 140,
      align: 'center'
    },
    { 
      id: 'address', 
      label: t('customer.address'), 
      sortable: true,
      minWidth: 200,
      align: 'center'
    },
    {
      id: 'financial_summary',
      label: t('customer.totalAmount'),
      sortable: true,
      minWidth: 140,
      align: 'center',
      format: (value) => {
        if (!value || !value.total_amount || Object.keys(value.total_amount).length === 0) return '-';

        return (
          <Box>
            {Object.entries(value.total_amount).map(([currency, amount]) => (
              <Typography key={currency} variant="body2" sx={{ mb: 0.5 }}>
                {new Intl.NumberFormat(undefined, {
                  style: 'decimal',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }).format(amount)} {currency==="USD" ? t('sales.usd') : t('sales.afn')}
              </Typography>
            ))}
          </Box>
        );
      }
    },
    {
      id: 'financial_summary',
      label: t('customer.totalPaid'),
      sortable: true,
      minWidth: 140,
      align: 'center',
      format: (value) => {
        if (!value || !value.paid_amount || Object.keys(value.paid_amount).length === 0) return '-';

        return (
          <Box>
            {Object.entries(value.paid_amount).map(([currency, amount]) => (
              <Typography key={currency} variant="body2" sx={{ mb: 0.5 }}>
                {new Intl.NumberFormat(undefined, {
                  style: 'decimal',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }).format(amount)} {currency==="USD" ? t('sales.usd') : t('sales.afn')}
              </Typography>
            ))}
          </Box>
        );
      }
    },
    {
      id: 'financial_summary',
      label: t('customer.totalRemaining'),
      sortable: true,
      minWidth: 140,
      format: (value) => {
        if (!value || !value.remaining_amount || Object.keys(value.remaining_amount).length === 0) return '-';

        return (
          <Box>
            {Object.entries(value.remaining_amount).map(([currency, amount]) => {
              const color = amount < 0 ? 'error.main' : amount > 0 ? 'warning.main' : 'success.main';

              return (
                <Typography key={currency} variant="body2" sx={{ mb: 0.5, color }}>
                  {new Intl.NumberFormat(undefined, {
                    style: 'decimal',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }).format(amount)} {currency==="USD" ? t('sales.usd') : t('sales.afn')}
                </Typography>
              );
            })}
          </Box>
        );
      }
    },
    {
      id: "actions",
      label: t("common.actions"),
      sortable: false,
      minWidth: 120,
      align: "center",
    }
  ];
  
  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query || '');
  };
  
  // Handle row actions
  const handleView = (id) => {
    const customer = customersData.find((cust) => cust.id === id);
    if (customer) {
      setSelectedCustomer(customer);
      setViewMoreOpen(true);
    }
  };

  const handleLedger = (id) => {
    navigate(`/app/contacts/customers/${id}/ledger`);
  };

  const handleEdit = (id) => {
    navigate(`/app/contacts/customers/${id}/edit`);
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
      title: t("customer.title", "Customers"),
      meta: [{ label: t("common.rows", "Rows"), value: String((customersData || []).length) }],
      columns: [
        { id: "id", label: t("common.id", "ID"), align: "center" },
        { id: "name", label: t("customer.name", "Name") },
        { id: "contact", label: t("customer.contact", "Contact") },
        { id: "address", label: t("customer.address", "Address") },
      ],
      rows: customersData || [],
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
      status: '',
      type: '',
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
    if (!selectedCustomer) return null;

    return (
      <Dialog
        open={viewMoreOpen}
        onClose={() => setViewMoreOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: theme => theme.shadows[10]
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: theme => `1px solid ${theme.palette.divider}`,
          pb: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ 
              bgcolor: 'primary.main', 
              color: 'white', 
              p: 1, 
              borderRadius: '50%', 
              display: 'flex',
              margin:"0px 5px"
            }}>
              <PersonIcon />
            </Box>
            <Typography variant="h6">{t('customer.details')}</Typography>
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
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                {t('customer.basicInfo')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('customer.name')}
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedCustomer.name || '-'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('customer.totalAmount')}
                  </Typography>
                  <Typography variant="body1">
                    {selectedCustomer.financial_summary && selectedCustomer.financial_summary.total_amount && 
                     Object.keys(selectedCustomer.financial_summary.total_amount).length > 0 ? 
                      Object.entries(selectedCustomer.financial_summary.total_amount).map(([currency, amount]) => (
                        <Box key={currency}>
                          {new Intl.NumberFormat(undefined, {
                            style: 'decimal',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }).format(amount)} {currency}
                        </Box>
                      )) 
                      : '-'}
                  </Typography>
                </Grid> 

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('customer.totalPaid')}
                  </Typography>
                  <Typography variant="body1">
                    {selectedCustomer.financial_summary && selectedCustomer.financial_summary.paid_amount && 
                     Object.keys(selectedCustomer.financial_summary.paid_amount).length > 0 ? 
                      Object.entries(selectedCustomer.financial_summary.paid_amount).map(([currency, amount]) => (
                        <Box key={currency}>
                          {new Intl.NumberFormat(undefined, {
                            style: 'decimal',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }).format(amount)} {currency}
                        </Box>
                      )) 
                      : '-'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('customer.totalRemaining')}
                  </Typography>
                  <Typography variant="body1">
                    {selectedCustomer.financial_summary && selectedCustomer.financial_summary.remaining_amount && 
                     Object.keys(selectedCustomer.financial_summary.remaining_amount).length > 0 ? 
                      Object.entries(selectedCustomer.financial_summary.remaining_amount).map(([currency, amount]) => {
                        const color = amount < 0 ? 'error.main' : amount > 0 ? 'warning.main' : 'success.main';

                        return (
                          <Box key={currency} sx={{ color }}>
                            {new Intl.NumberFormat(undefined, {
                              style: 'decimal',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            }).format(amount)} {currency}
                          </Box>
                        );
                      }) 
                      : '-'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('customer.contact')}
                  </Typography>
                  <Typography variant="body1">
                    {selectedCustomer.contact || '-'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('customer.address')}
                  </Typography>
                  <Typography variant="body1">
                    {selectedCustomer.address || '-'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('common.status')}
                  </Typography>
                  <Typography variant="body1">
                    {selectedCustomer.status || '-'}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
            
            {/* Financial Information Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                {t('customer.financialInfo')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('customer.totalAmount')}
                  </Typography>
                  {selectedCustomer.financial_summary && selectedCustomer.financial_summary.total_amount && 
                   Object.keys(selectedCustomer.financial_summary.total_amount).length > 0 ? (
                    <Box>
                      {Object.entries(selectedCustomer.financial_summary.total_amount).map(([currency, amount]) => (
                        <Typography key={currency} variant="body1" sx={{ mb: 0.5 }} fontWeight="medium">
                          {new Intl.NumberFormat(undefined, {
                            style: 'decimal',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }).format(amount)} {currency}
                        </Typography>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body1">-</Typography>
                  )}
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('customer.totalPaid')}
                  </Typography>
                  {selectedCustomer.financial_summary && selectedCustomer.financial_summary.paid_amount && 
                   Object.keys(selectedCustomer.financial_summary.paid_amount).length > 0 ? (
                    <Box>
                      {Object.entries(selectedCustomer.financial_summary.paid_amount).map(([currency, amount]) => (
                        <Typography key={currency} variant="body1" sx={{ mb: 0.5 }}>
                          {new Intl.NumberFormat(undefined, {
                            style: 'decimal',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }).format(amount)} {currency}
                        </Typography>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body1">-</Typography>
                  )}
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('customer.totalRemaining')}
                  </Typography>
                  {selectedCustomer.financial_summary && selectedCustomer.financial_summary.remaining_amount && 
                   Object.keys(selectedCustomer.financial_summary.remaining_amount).length > 0 ? (
                    <Box>
                      {Object.entries(selectedCustomer.financial_summary.remaining_amount).map(([currency, amount]) => {
                        const color = amount < 0 ? 'error.main' : amount > 0 ? 'warning.main' : 'success.main';

                        return (
                          <Typography key={currency} variant="body1" sx={{ mb: 0.5, color }}>
                            {new Intl.NumberFormat(undefined, {
                              style: 'decimal',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            }).format(amount)} {currency}
                          </Typography>
                        );
                      })}
                    </Box>
                  ) : (
                    <Typography variant="body1">-</Typography>
                  )}
                </Grid>
              </Grid>
            </Grid>
            
            {/* Notes Section (if available) */}
            {selectedCustomer.notes && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  {t('common.notes')}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'grey.50', 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'grey.200'
                }}>
                  <Typography variant="body1">
                    {selectedCustomer.notes}
                  </Typography>
                </Box>
              </Grid>
            )}
            
            {/* System Information Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                {t('common.systemInfo')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('common.id')}
                  </Typography>
                  <Typography variant="body1">
                    {selectedCustomer.id || '-'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('common.createdAt')}
                  </Typography>
                  <Typography variant="body1">
                    {selectedCustomer.created_at 
                      ? new Date(selectedCustomer.created_at).toLocaleString() 
                      : '-'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('common.updatedAt')}
                  </Typography>
                  <Typography variant="body1">
                    {selectedCustomer.updated_at 
                      ? new Date(selectedCustomer.updated_at).toLocaleString() 
                      : '-'}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2, borderTop: theme => `1px solid ${theme.palette.divider}` }}>
          <Button 
            variant="outlined" 
            onClick={() => setViewMoreOpen(false)}
            style={{margin:"0px 5px"}}
          >
            {t('common.close')}
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              setViewMoreOpen(false);
              handleEdit(selectedCustomer.id);
            }}
            startIcon={<EditIcon style={{margin:"0px 5px"}}/>}
          >
            {t('common.edit')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden pb-6">
      <PageHeader
        title={t('customer.customers')}
        subtitle={t('customer.managementSubtitle')}
        breadcrumbs={[
          { link: '/app/dashboard', label: t('navigation.dashboard') },
          { link: '/app/contacts', label: t('navigation.contacts') },
          { link: '/app/contacts/customers', label: t('navigation.customers') },
        ]}
        actions={[
          <Button
            key="add-customer"
            variant="contained"
            color="primary"
            startIcon={<AddIcon style={{ margin: '0px 5px' }} />}
            onClick={() => navigate('/app/contacts/customers/add')}
          >
            {t('customer.addNew')}
          </Button>
        ]}
      />
      
      {isError && (
        <InlineAlert
          severity="error"
          message={isError.message || t('common.errorOccurred')}
          title={t('common.error')}
          sx={{ mb: 2 }}
        />
      )}
      
      <ReusableTable
        columns={columns}
        data={customersData || []}
        title={t('customer.customerList')}
        onEdit={(id) => handleEdit(id)}
        onView={(id) => handleView(id)}
        onDelete={(id) => handleDelete(id)}
        onLedger={(id) => handleLedger(id)}
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
          "ACTIVE": { color: "success", label: t('customer.status.active') },
          "INACTIVE": { color: "error", label: t('customer.status.inactive') },
          "PENDING": { color: "warning", label: t('customer.status.pending') }
        }}
      />
      
      {/* Menu for extra actions */}
      <Menu
        id="customer-menu"
        anchorEl={anchorEl}
        open={openMenu}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleMenuClose}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          {t('common.export')}
        </MenuItem>
        <MenuItem onClick={handlePrintList}>
          <PrintIcon fontSize="small" sx={{ mr: 1 }} />
          {t('common.print')}
        </MenuItem>
      </Menu>
      
      {/* Filter Modal */}
      <FormModal
        open={filterModalOpen}
        onClose={handleFilterClose}
        title={t('common.filter')}
        onSubmit={() => handleFilterApply(filters)}
        submitText={t('common.apply')}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <FormSelectField
            name="status"
            label={t('common.status')}
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            options={[
              { value: '', label: t('common.all') },
              { value: 'ACTIVE', label: t('customer.status.active') },
              { value: 'INACTIVE', label: t('customer.status.inactive') },
              { value: 'PENDING', label: t('customer.status.pending') },
            ]}
          />
          
          <FormSelectField
            name="type"
            label={t('customer.type1')}
            value={filters.type}
            onChange={(e) => setFilters({...filters, type: e.target.value})}
            options={[
              { value: '', label: t('common.all') },
              { value: 'INDIVIDUAL', label: t('customer.individual') },
              { value: 'BUSINESS', label: t('customer.business') },
            ]}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button onClick={handleFilterReset} color="inherit">
              {t('common.reset')}
            </Button>
          </Box>
        </Box>
      </FormModal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog />

      <ViewMoreDialog />
    </div>
  );
};

export default CustomerIndex;
