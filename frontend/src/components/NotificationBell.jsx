import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/env";
import {
  NOTIFICATION_TYPE_LABEL,
  notificationTimeAgo,
} from "../utils/notifications";

/**
 * Header bell: polls recent notifications; full inbox is /app/notifications.
 */
export default function NotificationBell({ align = "end" }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;
  const queryClient = useQueryClient();

  const headers = useMemo(
    () => (token ? { Authorization: `Token ${token}` } : {}),
    [token]
  );

  const { data: listData } = useQuery({
    queryKey: ["notifications", "list"],
    enabled: Boolean(token),
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/notifications/?page_size=8`, {
        headers,
      });
      return res.data;
    },
    refetchInterval: 45000,
    refetchOnWindowFocus: true,
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
    refetchOnWindowFocus: true,
  });

  const items = Array.isArray(listData) ? listData : listData?.results || [];
  const unread = Number(countData?.count || 0);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markRead = async (id) => {
    try {
      await axios.post(
        `${API_BASE_URL}/notifications/${id}/mark-read/`,
        {},
        { headers }
      );
      invalidate();
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    try {
      await axios.post(
        `${API_BASE_URL}/notifications/mark-all-read/`,
        {},
        { headers }
      );
      invalidate();
    } catch {
      /* ignore */
    }
  };

  const onItemClick = async (item) => {
    if (!item?.is_read) {
      await markRead(item.id);
    }
    if (item?.link) {
      navigate(item.link);
    } else {
      navigate("/app/notifications");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t("common.notifications", "Notifications")}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 ? (
            <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">
            {t("common.notifications", "Notifications")}
          </DropdownMenuLabel>
          {unread > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                void markAllRead();
              }}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t("notifications.markAllRead", "Mark all read")}
            </Button>
          ) : null}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t("common.noNotifications", "No notifications")}
            </div>
          ) : (
            items.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className="cursor-pointer items-start gap-2 rounded-none px-3 py-2.5 focus:bg-accent"
                onClick={() => void onItemClick(item)}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    item.is_read ? "bg-transparent" : "bg-primary"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm ${
                      item.is_read ? "font-normal" : "font-semibold"
                    }`}
                  >
                    {item.title}
                  </p>
                  {item.message ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {item.message}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t(
                      NOTIFICATION_TYPE_LABEL[item.type] ||
                        "notifications.types.system",
                      item.type
                    )}
                    {" · "}
                    {notificationTimeAgo(item.created_at, t)}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <button
          type="button"
          className="flex w-full items-center justify-center px-3 py-2.5 text-sm font-medium text-primary hover:bg-muted/60"
          onClick={() => navigate("/app/notifications")}
        >
          {t("notifications.viewAll", "View all notifications")}
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
