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
} from "@/compat/ui";
import {
  Add as AddIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
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

const CategoryIndex = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
  });

  // Menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  // State for categories data
  const [categoriesData, setCategoriesData] = useState([]);
  
  // Fetch categories with search
  const {
    data: categories,
    isLoading,
    isError,
  } = useFetchObjects(
    ["categories", searchQuery, page, 20],
    (() => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', page + 1);
      params.append('page_size', 20);
      if (filters.name) params.append('name', filters.name);
      return `category/?${params.toString()}`;
    })(),
    token
  );

  // Process categories data when it changes
  useEffect(() => {
    if (categories) {
      const dataArray = Array.isArray(categories)
        ? categories
        : categories.results || [];
      
      setCategoriesData(prev => {
        if (page === 0) return dataArray;
        const existingIds = new Set(prev.map(item => item.id));
        const newItems = dataArray.filter(item => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
      
      setHasMore(dataArray.length === 20);
      setIsLoadingMore(false);
    }
  }, [categories, page]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, filters]);

  const { handleDelete, ConfirmDialog } = useDelete("category", token);

  // Handle search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  // Handle edit
  const handleEdit = (id) => {
    navigate(`/app/inventory/categories/${id}/edit`);
  };

  // Handle add category
  const handleAddCategory = () => {
    navigate("/app/inventory/categories/add");
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
      title: t("category.title", "Categories"),
      meta: [{ label: t("common.rows", "Rows"), value: String((categoriesData || []).length) }],
      columns: [
        { id: "id", label: t("common.id", "ID"), align: "center" },
        { id: "name", label: t("category.name", "Name") },
      ],
      rows: categoriesData || [],
      getCell: (row, col) => {
        if (col.id === "id") return `#${row.id}`;
        if (col.id === "name") return row.name || "—";
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

  const handleFilterApply = () => {
    setFilterModalOpen(false);
  };

  const handleFilterReset = () => {
    setFilters({
      name: "",
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

  // Table columns
  const columns = [
    { id: 'id', label: t('common.id'), sortable: true },
    { id: 'name', label: t('category.name'), sortable: true },
  ];

  // Toolbar buttons
  const toolbarButtons = [
    <Button key="filter" startIcon={<FilterListIcon />} onClick={handleFilterOpen}>
      {t('common.filter')}
    </Button>
  ];

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden pb-6">
      <PageHeader
        title={t("category.title")}
        subtitle={t("category.subtitle")}
        breadcrumbs={[
          { link: "/app/dashboard", label: t("navigation.dashboard") },
          { link: "/app/inventory", label: t("navigation.inventory") },
          {
            link: "/app/inventory/categories",
            label: t("navigation.categories"),
          },
        ]}
        actions={[
          <Button
            key="add-category"
            variant="contained"
            color="primary"
            startIcon={<AddIcon style={{ margin: "0px 5px" }} />}
            onClick={handleAddCategory}
          >
            {t("category.addNew")}
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
        data={categoriesData || []}
        title={t("category.categoryList")}
        onEdit={handleEdit}
        onDelete={handleDelete}
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

      {/* Menu for extra actions */}
      <Menu
        id="category-menu"
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
        onSubmit={handleFilterApply}
        submitText={t("common.apply")}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
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

export default CategoryIndex;
