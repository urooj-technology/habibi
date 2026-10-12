import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
} from "@/compat/ui";
import {
  Add as AddIcon,
  Publish as PostIcon,
  Cancel as CancelIcon,
} from "@/compat/icons";

import useFetchObjects from "../../../../api/useFetchObjects";
import useDelete from "../../../../api/useDelete";
import useDocumentAction from "../../../../api/useDocumentAction";
import { useAuth } from "../../../../context/AuthContext";
import { formatCurrency } from "../../../../utils/formatters";
import PageHeader from "../../../../components/PageHeader";
import ReusableTable from "../../../../components/ReusableTable";
import { InlineAlert } from "../../../../components/AlertMessage";
import { payrollRunConfig } from "./payrollWorkflowConfig";

const statusColor = (status) => {
  switch (status) {
    case "POSTED":
      return "success";
    case "CANCELLED":
      return "error";
    default:
      return "default";
  }
};

const PayrollRunIndex = ({ config = payrollRunConfig }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;
  const {
    i18nPrefix,
    apiPath,
    routeBase,
    breadcrumbs,
    listColumns,
    showPostActions,
    workflowI18nPrefix = "payrollWorkflow",
  } = config;

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState([]);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    params.append("page", page + 1);
    params.append("page_size", "20");
    return `${apiPath}/?${params.toString()}`;
  }, [apiPath, searchQuery, page]);

  const { data, isLoading, isError, error, refetch } = useFetchObjects(
    [apiPath, searchQuery, page],
    endpoint,
    token
  );

  useEffect(() => {
    if (!data) return;
    const dataArray = Array.isArray(data) ? data : data.results || [];
    setRows((prev) => {
      if (page === 0) return dataArray;
      const ids = new Set(prev.map((r) => r.id));
      return [...prev, ...dataArray.filter((r) => !ids.has(r.id))];
    });
    setHasMore(dataArray.length === 20);
    setIsLoadingMore(false);
  }, [data, page]);

  useEffect(() => setPage(0), [searchQuery]);

  const { handleDelete, ConfirmDialog } = useDelete(apiPath, token);
  const { postDocument, cancelDocument, loading: actionLoading } = useDocumentAction(
    apiPath,
    token,
    workflowI18nPrefix
  );

  const handleSearch = useCallback((q) => setSearchQuery(q), []);
  const handleEdit = (id) => navigate(`${routeBase}/${id}/edit`);
  const loadMore = () => {
    if (!isLoadingMore && hasMore && !isLoading) {
      setIsLoadingMore(true);
      setPage((p) => p + 1);
    }
  };

  const tableData = rows.map((row) => ({
    ...row,
    period_label:
      row.period_start && row.period_end
        ? `${row.period_start} → ${row.period_end}`
        : "—",
    total_amount:
      row.total_amount != null ? formatCurrency(row.total_amount) : "—",
    status: (
      <Chip
        size="small"
        label={t(`${workflowI18nPrefix}.status.${row.status}`, row.status)}
        color={statusColor(row.status)}
      />
    ),
    workflow_actions:
      showPostActions && row.status === "DRAFT" ? (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title={t(`${workflowI18nPrefix}.post`)}>
            <IconButton
              size="small"
              color="primary"
              disabled={actionLoading}
              onClick={(e) => {
                e.stopPropagation();
                postDocument(row.id);
                setTimeout(() => refetch(), 400);
              }}
            >
              <PostIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t(`${workflowI18nPrefix}.cancel`)}>
            <IconButton
              size="small"
              color="warning"
              disabled={actionLoading}
              onClick={(e) => {
                e.stopPropagation();
                cancelDocument(row.id);
                setTimeout(() => refetch(), 400);
              }}
            >
              <CancelIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ) : null,
  }));

  const columns = [
    ...listColumns.map((col) => ({ ...col, label: t(col.label) })),
    ...(showPostActions
      ? [{ id: "workflow_actions", label: t(`${workflowI18nPrefix}.actions`), sortable: false }]
      : []),
  ];

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden pb-6">
      <PageHeader
        title={t(`${i18nPrefix}.title`)}
        subtitle={t(`${i18nPrefix}.subtitle`)}
        breadcrumbs={breadcrumbs.map((b) => ({ ...b, label: t(b.label) }))}
        actions={[
          <Button
            key="add"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate(`${routeBase}/add`)}
          >
            {t(`${i18nPrefix}.addNew`)}
          </Button>,
        ]}
      />

      {isError && (
        <InlineAlert severity="error" message={error?.message || t("common.errorOccurred")} sx={{ mb: 2 }} />
      )}

      <ReusableTable
        columns={columns}
        data={tableData}
        title={t(`${i18nPrefix}.listTitle`)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSearch={handleSearch}
        enableSelection={false}
        rowActions
        loading={isLoading && page === 0}
        pagination={false}
        onLoadMore={loadMore}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
      />

      <ConfirmDialog />
    </div>
  );
};

export default PayrollRunIndex;
