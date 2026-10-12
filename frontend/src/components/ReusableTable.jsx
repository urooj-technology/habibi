import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Search,
  Trash2,
  Pencil,
  Eye,
  Receipt,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}

function getComparator(order, orderBy) {
  return order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

function useDirection() {
  const { i18n } = useTranslation();
  const [direction, setDirection] = useState(document.dir || "ltr");
  useEffect(() => {
    const dir = ["da", "ps"].includes(i18n.language) ? "rtl" : "ltr";
    setDirection(dir);
  }, [i18n.language]);
  return direction;
}

function IconAction({ title, onClick, className, children }) {
  return (
    <TooltipProvider delayDuration={200}>
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
    </TooltipProvider>
  );
}

function EnhancedTableHead(props) {
  const {
    onSelectAllClick,
    order,
    orderBy,
    numSelected,
    rowCount,
    onRequestSort,
    columns,
    enableSelection,
  } = props;
  const { t } = useTranslation();
  const direction = useDirection();

  const createSortHandler = (property) => () => {
    onRequestSort(null, property);
  };

  const alignForColumn = direction === "rtl" ? "text-right" : "text-left";

  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        {enableSelection && (
          <TableHead className="w-10 text-center">
            <Checkbox
              aria-label={t("common.accessibility.selectAll")}
              checked={
                rowCount > 0 && numSelected === rowCount
                  ? true
                  : numSelected > 0
                  ? "indeterminate"
                  : false
              }
              onCheckedChange={(checked) =>
                onSelectAllClick({ target: { checked: Boolean(checked) } })
              }
            />
          </TableHead>
        )}
        {columns.map((column) => (
          <TableHead
            key={column.id}
            className={alignForColumn}
            style={{ minWidth: column.minWidth, width: column.width }}
          >
            {column.sortable ? (
              <button
                type="button"
                onClick={createSortHandler(column.id)}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                {column.label}
                {orderBy === column.id ? (
                  order === "desc" ? (
                    <ArrowDown className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowUp className="h-3.5 w-3.5" />
                  )
                ) : (
                  <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                )}
              </button>
            ) : (
              column.label
            )}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

EnhancedTableHead.propTypes = {
  numSelected: PropTypes.number.isRequired,
  onRequestSort: PropTypes.func.isRequired,
  onSelectAllClick: PropTypes.func.isRequired,
  order: PropTypes.oneOf(["asc", "desc"]).isRequired,
  orderBy: PropTypes.string.isRequired,
  rowCount: PropTypes.number.isRequired,
  columns: PropTypes.array.isRequired,
  enableSelection: PropTypes.bool,
};

function EnhancedTableToolbar(props) {
  const {
    numSelected,
    title,
    onDelete,
    onSearch,
    searchQuery,
    setSearchQuery,
    toolbarButtons,
    showSearch = true,
  } = props;
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4",
        numSelected > 0 && "bg-primary/5"
      )}
    >
      {numSelected > 0 ? (
        <p className="flex-1 text-sm font-medium text-foreground">
          {numSelected} {t("common.selected")}
        </p>
      ) : (
        <h6 id="tableTitle" className="text-base font-semibold text-foreground">
          {title}
        </h6>
      )}

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {numSelected > 0 ? (
          <IconAction title={t("common.delete")} onClick={onDelete} className="text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
          </IconAction>
        ) : (
          <>
            {showSearch ? (
              <div className="relative w-full min-w-0 sm:w-56">
                <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("common.search")}
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value || "";
                    setSearchQuery(value);
                    if (onSearch) onSearch(value);
                  }}
                  className="h-9 w-full ps-8"
                />
              </div>
            ) : null}
            {toolbarButtons &&
              Array.isArray(toolbarButtons) &&
              toolbarButtons.map((button) =>
                React.isValidElement(button) ? button : null
              )}
          </>
        )}
      </div>
    </div>
  );
}

EnhancedTableToolbar.propTypes = {
  numSelected: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  onDelete: PropTypes.func,
  onSearch: PropTypes.func,
  searchQuery: PropTypes.string,
  setSearchQuery: PropTypes.func,
  toolbarButtons: PropTypes.array,
  loading: PropTypes.bool,
  showSearch: PropTypes.bool,
};

const ReusableTable = ({
  columns,
  data = [],
  title,
  onEdit,
  onView,
  onDelete,
  onLedger,
  onSearch,
  searchQuery: externalSearchQuery = "",
  enableSelection = false,
  rowActions = true,
  loading = false,
  loadingComponent = null,
  pagination = true,
  page = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  totalCount,
  defaultSort = "",
  defaultSortDirection = "asc",
  toolbarButtons,
  rowsPerPageOptions = [5, 10, 25],
  chipField = null,
  chipOptions = {},
  getRowId = (row) => row.id,
  responsive = false,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  stickyHeader = false,
  showSearch = true,
  embedded = false,
  sx: rootSx,
  tableContainerSx,
}) => {
  const [order, setOrder] = useState(defaultSortDirection);
  const [orderBy, setOrderBy] = useState(defaultSort);
  const [selected, setSelected] = useState([]);
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery);

  useEffect(() => {
    setSearchQuery(externalSearchQuery);
  }, [externalSearchQuery]);
  const [internalPage, setInternalPage] = useState(0);
  const [internalRowsPerPage, setInternalRowsPerPage] = useState(10);
  const { t } = useTranslation();
  const direction = useDirection();
  const tableContainerRef = useRef(null);

  const handleScroll = useCallback(() => {
    if (!tableContainerRef.current || !onLoadMore || !hasMore || isLoadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 5) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, isLoadingMore]);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (container && onLoadMore) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll, onLoadMore]);

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = data.map((n) => getRowId(n));
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event, id) => {
    if (!enableSelection) return;

    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }

    setSelected(newSelected);
  };

  const handleChangePage = (newPage) => {
    if (onPageChange) {
      onPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const handleChangeRowsPerPage = (value) => {
    const newRowsPerPage = parseInt(value, 10);
    if (onRowsPerPageChange) {
      onRowsPerPageChange(newRowsPerPage);
    } else {
      setInternalRowsPerPage(newRowsPerPage);
      setInternalPage(0);
    }
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  const currentPage = onPageChange ? page : internalPage;
  const currentRowsPerPage = onRowsPerPageChange ? rowsPerPage : internalRowsPerPage;

  const handleMultipleDelete = () => {
    if (selected.length > 0 && onDelete) {
      onDelete(selected);
      setSelected([]);
    }
  };

  const getChipForField = (row, field) => {
    if (!chipField || !chipOptions || !row[field]) return null;
    const value = row[field];
    const chipConfig = chipOptions[value] || { color: "default", label: value };
    return (
      <Badge variant="secondary" className="min-w-[80px] justify-center font-medium">
        {chipConfig.label}
      </Badge>
    );
  };

  const cellAlign = direction === "rtl" ? "text-right" : "text-left";

  const totalRows = totalCount !== undefined ? totalCount : data.length;
  const pageStart = totalRows === 0 ? 0 : currentPage * currentRowsPerPage + 1;
  const pageEnd = Math.min((currentPage + 1) * currentRowsPerPage, totalRows);
  const pageCount = Math.max(1, Math.ceil(totalRows / currentRowsPerPage));

  const visibleRows = onPageChange
    ? data
    : stableSort(data, getComparator(order, orderBy)).slice(
        pagination ? currentPage * currentRowsPerPage : 0,
        pagination ? currentPage * currentRowsPerPage + currentRowsPerPage : data.length
      );

  return (
    <div
      className={cn(
        "w-full min-w-0 overflow-hidden bg-card",
        !embedded && "rounded-xl border border-border shadow-soft"
      )}
      style={rootSx}
    >
      <EnhancedTableToolbar
        numSelected={selected.length}
        title={title}
        onDelete={handleMultipleDelete}
        onSearch={onSearch}
        searchQuery={searchQuery}
        setSearchQuery={(value) => {
          const searchValue = value || "";
          setSearchQuery(searchValue);
          if (onSearch) onSearch(searchValue);
        }}
        toolbarButtons={toolbarButtons}
        loading={false}
        showSearch={showSearch}
      />

      <div
        ref={tableContainerRef}
        className="min-w-0 overflow-x-auto border-t border-border"
        style={{ maxHeight: onLoadMore ? 600 : undefined, ...tableContainerSx }}
      >
        <Table
          containerClassName="overflow-visible"
          className={cn(responsive ? "min-w-[480px]" : "min-w-[640px]")}
        >
          <EnhancedTableHead
            numSelected={selected.length}
            order={order}
            orderBy={orderBy}
            onSelectAllClick={handleSelectAllClick}
            onRequestSort={handleRequestSort}
            rowCount={data.length}
            columns={columns}
            enableSelection={enableSelection}
          />
          <TableBody>
            {loading && !loadingComponent ? (
              <TableRow>
                <TableCell colSpan={columns.length + (enableSelection ? 1 : 0)} className="py-10 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : loadingComponent && loading ? (
              loadingComponent
            ) : data.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (enableSelection ? 1 : 0)} className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? t("common.noSearchResults", "No results found")
                      : t("common.noData", "No data available")}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row, index) => {
                const id = getRowId(row);
                const isItemSelected = isSelected(id);
                const labelId = `enhanced-table-checkbox-${index}`;

                return (
                  <TableRow
                    key={id}
                    data-state={isItemSelected ? "selected" : undefined}
                    className="cursor-pointer"
                  >
                    {enableSelection && (
                      <TableCell className="w-10 text-center">
                        <Checkbox
                          aria-labelledby={labelId}
                          checked={isItemSelected}
                          onClick={(event) => handleClick(event, id)}
                        />
                      </TableCell>
                    )}

                    {columns.map((column) => {
                      const value = row[column.id];
                      return (
                        <TableCell key={`${id}-${column.id}`} className={cellAlign}>
                          {column.id === "actions" && rowActions ? (
                            <div className="flex items-center justify-center gap-1">
                              {onLedger && (
                                <IconAction
                                  title={t("customer.ledger", "Ledger")}
                                  className="text-primary hover:bg-primary/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onLedger(id, row);
                                  }}
                                >
                                  <Receipt className="h-4 w-4" />
                                </IconAction>
                              )}
                              {onView && (
                                <IconAction
                                  title={t("common.view")}
                                  className="text-primary hover:bg-primary/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onView(id, row);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </IconAction>
                              )}
                              {onEdit && (
                                <IconAction
                                  title={t("common.edit")}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(id, row);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </IconAction>
                              )}
                              {onDelete && (
                                <IconAction
                                  title={t("common.delete")}
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(id, row);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </IconAction>
                              )}
                            </div>
                          ) : column.format ? (
                            column.format(value, row)
                          ) : chipField === column.id ? (
                            getChipForField(row, chipField)
                          ) : (
                            value
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {onLoadMore && isLoadingMore && (
          <div className="flex justify-center p-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {onLoadMore && !hasMore && data.length > 0 && (
          <div className="flex justify-center p-4">
            <p className="text-sm text-muted-foreground">{t("common.noMoreDataToLoad")}</p>
          </div>
        )}
      </div>

      {responsive && (
        <div className="block px-4 py-3 md:hidden">
          <p className="mb-1 text-sm font-medium text-muted-foreground">{t("common.dataFields")}</p>
          <p className="text-sm text-muted-foreground">{t("common.responsiveTableHint")}</p>
        </div>
      )}

      {pagination && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("common.rowsPerPage")}</span>
            <select
              className="h-8 rounded-md border border-input bg-card px-2 text-sm"
              value={currentRowsPerPage}
              onChange={(e) => handleChangeRowsPerPage(e.target.value)}
            >
              {rowsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              {pageStart}-{pageEnd} {t("common.of")} {totalRows}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === 0}
                onClick={() => handleChangePage(0)}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === 0}
                onClick={() => handleChangePage(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage >= pageCount - 1}
                onClick={() => handleChangePage(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage >= pageCount - 1}
                onClick={() => handleChangePage(pageCount - 1)}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ReusableTable.propTypes = {
  columns: PropTypes.array.isRequired,
  data: PropTypes.array.isRequired,
  title: PropTypes.string,
  onEdit: PropTypes.func,
  onView: PropTypes.func,
  onDelete: PropTypes.func,
  onLedger: PropTypes.func,
  onSearch: PropTypes.func,
  searchQuery: PropTypes.string,
  enableSelection: PropTypes.bool,
  rowActions: PropTypes.bool,
  loading: PropTypes.bool,
  loadingComponent: PropTypes.node,
  pagination: PropTypes.bool,
  page: PropTypes.number,
  rowsPerPage: PropTypes.number,
  onPageChange: PropTypes.func,
  onRowsPerPageChange: PropTypes.func,
  totalCount: PropTypes.number,
  defaultSort: PropTypes.string,
  defaultSortDirection: PropTypes.oneOf(["asc", "desc"]),
  toolbarButtons: PropTypes.array,
  chipField: PropTypes.string,
  chipOptions: PropTypes.object,
  getRowId: PropTypes.func,
  responsive: PropTypes.bool,
  onLoadMore: PropTypes.func,
  hasMore: PropTypes.bool,
  isLoadingMore: PropTypes.bool,
  stickyHeader: PropTypes.bool,
  showSearch: PropTypes.bool,
  embedded: PropTypes.bool,
  sx: PropTypes.object,
  tableContainerSx: PropTypes.object,
};

export default ReusableTable;
