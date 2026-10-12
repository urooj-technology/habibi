import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Typography,
  useTheme,
  Chip,
  Avatar,
  Grid,
  Tooltip,
  Card,
  CardHeader,
  CardContent,
  Stack,
  Divider,
} from "@/compat/ui";
import {
  Add as AddIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  Search as SearchIcon,
} from "@/compat/icons";
import { useAuth } from "../../../context/AuthContext";
import usePermissions from "../../../hooks/usePermissions";

// Custom hooks
import useFetchObjects from "../../../api/useFetchObjects";
import useDelete from "../../../api/useDelete";

// Components
import PageHeader from "../../../components/PageHeader";
import ReusableTable from "../../../components/ReusableTable";
import { ConfirmationModal, FormModal } from "../../../components/Modal";
import { InlineAlert } from "../../../components/AlertMessage";
import { FormTextField } from "../../../components/FormFields";

const UserIndex = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const auth = useAuth();
  const token = auth?.user?.token;
  const { can } = usePermissions();

  // State for search, filters, and modals
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    is_active: "",
  });
  const [viewMoreOpen, setViewMoreOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
  const [currentRowId, setCurrentRowId] = useState(null);

  // State for menu
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);
  const openActionMenu = Boolean(actionMenuAnchorEl);

  // Fetch users with search
  const {
    data: users,
    isLoading,
    isError,
    error,
    refetch,
  } = useFetchObjects(
    "users",
    {
      search: searchQuery,
      ...filters,
    },
    token
  );

  const { handleDelete, isLoading: isDeleting, isSuccess: isDeleteSuccess, ConfirmDialog } = useDelete("users", token);

  // React to successful deletion
  React.useEffect(() => {
    if (isDeleteSuccess) {
      refetch();
    }
  }, [isDeleteSuccess, refetch]);

  // Handle row action menu
  const handleRowMenuOpen = (event, id) => {
    setActionMenuAnchorEl(event.currentTarget);
    setCurrentRowId(id);
  };

  const handleRowMenuClose = () => {
    setActionMenuAnchorEl(null);
    setCurrentRowId(null);
  };

  // Table columns configuration
  const columns = [
    {
      id: "id",
      label: t("common.id"),
      sortable: true,
      minWidth: 60,
    },
    {
      id: "username",
      label: t("user.username"),
      sortable: true,
      minWidth: 130,
      format: (value, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar 
            src={row.profile_picture} 
            alt={row.username}
            sx={{ width: 32, height: 32 }}
          >
            {row.first_name ? row.first_name.charAt(0) : row.username.charAt(0)}
          </Avatar>
          <Typography variant="body2" fontWeight="medium">
            {value}
          </Typography>
        </Box>
      ),
    },
    {
      id: "email",
      label: t("user.email"),
      sortable: true,
      minWidth: 180,
    },
    {
      id: "name",
      label: t("user.name"),
      sortable: true,
      minWidth: 150,
      format: (value, row) => `${row.first_name || ''} ${row.last_name || ''}`.trim() || '-',
    },
    {
      id: "role_detail",
      label: t("roles.name", "Role"),
      sortable: false,
      minWidth: 140,
      format: (value, row) => (
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label={
            value?.name ||
            row.role_detail?.name ||
            (row.is_admin ? t("roles.admin", "Admin") : "—")
          }
        />
      ),
    },
    {
      id: "is_active",
      label: t("user.status"),
      sortable: true,
      minWidth: 100,
      format: (value) => (
        <Chip
          size="small"
          color={value ? "success" : "error"}
          label={value ? t("common.active") : t("common.inactive")}
          sx={{ 
            fontWeight: "medium",
            background: value ? 'rgba(84, 214, 44, 0.16)' : 'rgba(255, 72, 66, 0.16)',
            color: value ? 'rgb(34, 154, 22)' : 'rgb(183, 33, 54)',
            border: 'none'
          }}
        />
      ),
    },
    {
      id: "created_at",
      label: t("common.createdAt"),
      sortable: true,
      minWidth: 120,
      format: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    {
      id: "actions",
      label: t("common.actions"),
      sortable: false,
      minWidth: 120,
      align: "center"
    }
  ];

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  // Handle row actions
  const handleView = (id) => {
    const user = users.find((user) => user.id === id);
    if (user) {
      setSelectedUser(user);
      setViewMoreOpen(true);
    }
  };

  const handleEdit = (id) => {
    navigate(`/app/user/users/${id}/edit`);
  };

  // Handle menu
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle filter modal
  const handleFilterOpen = () => {
    setFilterModalOpen(true);
  };

  const handleFilterClose = () => {
    setFilterModalOpen(false);
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Reset filters
  const handleFilterReset = () => {
    setFilters({
      is_active: "",
    });
  };

  // Apply filters
  const handleFilterApply = () => {
    handleFilterClose();
  };

  // View More Dialog component
  const ViewMoreDialog = () => {
    if (!selectedUser) return null;

    return (
      <Dialog 
        open={viewMoreOpen} 
        onClose={() => setViewMoreOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          elevation: 1,
          sx: {
            borderRadius: 2,
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {t("user.userDetails")}
            </Typography>
            <IconButton 
              edge="end" 
              color="inherit" 
              onClick={() => setViewMoreOpen(false)} 
              aria-label={t("common.accessibility.close")}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar
                src={selectedUser.profile_picture}
                alt={`${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim()}
                sx={{ width: 80, height: 80, mr: 2 }}
              >
                {selectedUser.first_name ? selectedUser.first_name.charAt(0) : selectedUser.username.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h6">{`${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.username}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedUser.email}</Typography>
                <Box sx={{ display: 'flex', mt: 1 }}>
                  <Chip
                    size="small"
                    color={selectedUser.is_active ? "success" : "error"}
                    label={selectedUser.is_active ? t("common.active") : t("common.inactive")}
                    sx={{ 
                      fontWeight: "medium",
                      background: selectedUser.is_active ? 'rgba(84, 214, 44, 0.16)' : 'rgba(255, 72, 66, 0.16)',
                      color: selectedUser.is_active ? 'rgb(34, 154, 22)' : 'rgb(183, 33, 54)',
                      border: 'none'
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
            {t("user.accountInformation")}
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">{t("user.username")}</Typography>
              <Typography variant="body1" gutterBottom>{selectedUser.username}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">{t("user.email")}</Typography>
              <Typography variant="body1" gutterBottom>{selectedUser.email}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">{t("user.phone")}</Typography>
              <Typography variant="body1" gutterBottom>{selectedUser.phone || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">{t("common.createdAt")}</Typography>
              <Typography variant="body1" gutterBottom>
                {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : '-'}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
            {t("user.personalInformation")}
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">{t("user.firstName")}</Typography>
              <Typography variant="body1" gutterBottom>{selectedUser.first_name || '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">{t("user.lastName")}</Typography>
              <Typography variant="body1" gutterBottom>{selectedUser.last_name || '-'}</Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
            {t("roles.name", "Role")}
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip
              color="primary"
              variant="outlined"
              label={
                selectedUser.role_detail?.name ||
                (selectedUser.is_admin
                  ? t("roles.admin", "Admin")
                  : t("common.notAvailable", "—"))
              }
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={() => setViewMoreOpen(false)} 
            color="inherit"
            variant="outlined"
            style={{margin:"0px 10px"}}
          >
            {t("common.close")}
          </Button>
          <Button 
            onClick={() => {
              setViewMoreOpen(false);
              handleEdit(selectedUser.id);
            }} 
            color="primary" 
            variant="contained"
            startIcon={<EditIcon style={{margin:"0px 5px"}}/>}
          >
            {t("common.edit")}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Filter Modal component
  const FilterModal = () => (
    <FormModal
      open={filterModalOpen}
      onClose={handleFilterClose}
      title={t("common.filter")}
      maxWidth="sm"
      actions={
        <>
          <Button onClick={handleFilterReset} color="inherit">
            {t("common.reset")}
          </Button>
          <Button onClick={handleFilterApply} color="primary" variant="contained">
            {t("common.apply")}
          </Button>
        </>
      }
    >
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <FormTextField
            name="is_active"
            label={t("user.status")}
            select
            value={filters.is_active}
            onChange={handleFilterChange}
            fullWidth
          >
            <MenuItem value="">{t("common.all")}</MenuItem>
            <MenuItem value="true">{t("common.active")}</MenuItem>
            <MenuItem value="false">{t("common.inactive")}</MenuItem>
          </FormTextField>
        </Grid>
      </Grid>
    </FormModal>
  );

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden pb-6">
      <PageHeader
        title={t("user.users")}
        subtitle={t("user.usersList")}
        icon={<PersonIcon />}
        actions={[
          <Tooltip title={t("common.filter")} key="filter">
            <IconButton
              color="inherit"
              onClick={handleFilterOpen}
              sx={{ 
                backgroundColor: filterModalOpen ? 'rgba(0, 0, 0, 0.08)' : 'transparent'
              }}
            >
              <FilterListIcon />
            </IconButton>
          </Tooltip>,
          can("users.create") ? (
            <Button
              key="add"
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => navigate("/app/user/users/add")}
              sx={{ ml: 1 }}
            >
              {t("user.addUser")}
            </Button>
          ) : null,
        ].filter(Boolean)}
      />

      {isError && (
        <InlineAlert
          severity="error"
          message={error?.message || t("common.errorOccurred")}
        />
      )}

      <ReusableTable
        columns={columns}
        data={users || []}
        isLoading={isLoading}
        searchPlaceholder={t("user.searchPlaceholder")}
        onSearch={handleSearch}
        searchQuery={searchQuery}
        elevation={0}
        rowActions={true}
        onView={handleView}
        onEdit={can("users.edit") ? handleEdit : undefined}
        onDelete={can("users.delete") ? (id) => handleDelete(id) : undefined}
        sx={{
          '& .MuiTableHead-root': {
            backgroundColor: theme.palette.background.neutral,
          },
          '& .MuiTableCell-head': {
            color: theme.palette.text.secondary,
            fontWeight: 600,
          },
          '& .MuiTableRow-root:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        }}
      />

      {/* View More Dialog */}
      <ViewMoreDialog />

      {/* Filter Modal */}
      <FilterModal />
      
      {/* Render the ConfirmDialog from useDelete hook */}
      <ConfirmDialog />
    </div>
  );
};

export default UserIndex;
