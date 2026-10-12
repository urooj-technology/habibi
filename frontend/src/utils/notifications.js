export const NOTIFICATION_TYPE_LABEL = {
  low_stock: "notifications.types.lowStock",
  system: "notifications.types.system",
  sale: "notifications.types.sale",
  purchase: "notifications.types.purchase",
  payment: "notifications.types.payment",
};

export function notificationTimeAgo(iso, t) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return t("notifications.justNow", "Just now");
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return t("notifications.minutesAgo", "{{count}}m ago", { count: min });
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    return t("notifications.hoursAgo", "{{count}}h ago", { count: hr });
  }
  const day = Math.floor(hr / 24);
  return t("notifications.daysAgo", "{{count}}d ago", { count: day });
}

export function formatNotificationDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
