import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Bell,
  Package,
  ShoppingCart,
  Truck,
  Wallet,
  Info,
  CheckCheck,
  Loader2,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "../../../context/AuthContext";
import { API_BASE_URL } from "../../../config/env";
import PageHeader from "../../../components/PageHeader";
import { InlineAlert } from "../../../components/AlertMessage";
import {
  PageShell,
  ListCard,
  ListToolbar,
  FilterField,
} from "../../../components/ListPage";
import {
  NOTIFICATION_TYPE_LABEL,
  notificationTimeAgo,
  formatNotificationDate,
} from "../../../utils/notifications";

const TYPE_ICON = {
  low_stock: Package,
  sale: ShoppingCart,
  purchase: Truck,
  payment: Wallet,
  system: Info,
};

const FILTERS = [
  { id: "all", labelKey: "notifications.filterAll", fallback: "All" },
  { id: "unread", labelKey: "notifications.filterUnread", fallback: "Unread" },
  { id: "low_stock", labelKey: "notifications.types.lowStock", fallback: "Low stock" },
  { id: "sale", labelKey: "notifications.types.sale", fallback: "Sale" },
  { id: "purchase", labelKey: "notifications.types.purchase", fallback: "Purchase" },
  { id: "payment", labelKey: "notifications.types.payment", fallback: "Payment" },
  { id: "system", labelKey: "notifications.types.system", fallback: "System" },
];

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const headers = useMemo(
    () => (token ? { Authorization: `Token ${token}` } : {}),
    [token]
  );

  const listUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", "25");
    if (filter === "unread") {
      params.set("unread", "1");
    } else if (filter !== "all") {
      params.set("type", filter);
    }
    return `${API_BASE_URL}/notifications/?${params.toString()}`;
  }, [filter, page]);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["notifications", "page", filter, page],
    enabled: Boolean(token),
    queryFn: async () => {
      const res = await axios.get(listUrl, { headers });
      return res.data;
    },
  });

  const { data: countData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    enabled: Boolean(token),
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/notifications/unread-count/`, {
        headers,
      });
      return res.data;
    },
    refetchInterval: 45000,
  });

  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [filter]);

  useEffect(() => {
    if (!data) return;
    const rows = Array.isArray(data) ? data : data.results || [];
    const next = Boolean(data?.next);
    setHasMore(next);
    setItems((prev) => (page === 1 ? rows : [...prev, ...rows]));
  }, [data, page]);

  const unread = Number(countData?.count || 0);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  const markRead = async (id) => {
    try {
      await axios.post(
        `${API_BASE_URL}/notifications/${id}/mark-read/`,
        {},
        { headers }
      );
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      invalidate();
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await axios.post(
        `${API_BASE_URL}/notifications/mark-all-read/`,
        {},
        { headers }
      );
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      invalidate();
    } catch {
      /* ignore */
    } finally {
      setMarkingAll(false);
    }
  };

  const onOpen = async (item) => {
    if (!item?.is_read) {
      await markRead(item.id);
    }
    if (item?.link) {
      navigate(item.link);
    }
  };

  const loadingFirst = isLoading && page === 1;

  return (
    <PageShell>
      <PageHeader
        title={t("notifications.title", "Notifications")}
        subtitle={t(
          "notifications.subtitle",
          "Stock alerts and system messages for your account"
        )}
        breadcrumbs={[
          { link: "/app/dashboard", label: "navigation.dashboard" },
          { label: "notifications.title" },
        ]}
        actions={[
          <Button
            key="mark-all"
            variant="outline"
            disabled={markingAll || unread === 0}
            onClick={() => void markAllRead()}
            className="gap-1.5"
          >
            {markingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            {t("notifications.markAllRead", "Mark all read")}
            {unread > 0 ? (
              <span className="ms-1 rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                {unread}
              </span>
            ) : null}
          </Button>,
        ]}
      />

      {isError ? (
        <InlineAlert
          severity="error"
          title={t("common.error")}
          message={error?.message || t("common.errorOccurred")}
        />
      ) : null}

      <ListCard>
        <ListToolbar>
          <FilterField
            label={t("notifications.filter", "Filter")}
            className="sm:col-span-2 xl:col-span-3"
          >
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => {
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={`h-8 rounded-md border px-3 text-xs font-medium transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {t(f.labelKey, f.fallback)}
                  </button>
                );
              })}
            </div>
          </FilterField>
        </ListToolbar>

        <div className="divide-y divide-border">
          {loadingFirst ? (
            <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.loading", "Loading…")}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("notifications.emptyTitle", "No notifications")}
                </p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {t(
                    "notifications.emptyHint",
                    "Low stock and other alerts will appear here when they happen."
                  )}
                </p>
              </div>
            </div>
          ) : (
            items.map((item) => {
              const Icon = TYPE_ICON[item.type] || Bell;
              const unreadItem = !item.is_read;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void onOpen(item)}
                  className={`group flex w-full items-start gap-3 px-4 py-3.5 text-start transition-colors hover:bg-muted/50 ${
                    unreadItem ? "bg-primary/[0.03]" : ""
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      unreadItem
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        className={`text-sm ${
                          unreadItem
                            ? "font-semibold text-foreground"
                            : "font-medium text-foreground/90"
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t(
                          NOTIFICATION_TYPE_LABEL[item.type] ||
                            "notifications.types.system",
                          item.type
                        )}
                      </span>
                      {unreadItem ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      ) : null}
                    </span>
                    {item.message ? (
                      <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                        {item.message}
                      </span>
                    ) : null}
                    <span className="mt-1.5 block text-xs text-muted-foreground">
                      {notificationTimeAgo(item.created_at, t)}
                      <span className="mx-1.5 opacity-40">·</span>
                      {formatNotificationDate(item.created_at)}
                    </span>
                  </span>

                  <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              );
            })
          )}
        </div>

        {hasMore ? (
          <div className="flex justify-center border-t border-border px-4 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() => setPage((p) => p + 1)}
              className="gap-1.5"
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {t("common.loadMore", "Load more")}
            </Button>
          </div>
        ) : null}
      </ListCard>
    </PageShell>
  );
}
