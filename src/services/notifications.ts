import { apiDelete, apiGet, apiPatch } from "@/services/api";

export type NotificationType = "order" | "promo" | "system";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string;
  time: string;
  group: "Hôm nay" | "Trước đó";
  unread: boolean;
};

type NotificationsResponse = { data: Notification[] };
type NotificationResponse = { data: Notification };

function withUserId(path: string, userId?: string) {
  return userId ? `${path}?userId=${encodeURIComponent(userId)}` : path;
}

export function fetchNotifications(userId?: string) {
  return apiGet<NotificationsResponse>(
    withUserId("/notifications", userId),
  ).then((res) => res.data);
}

export function markNotificationRead(id: string) {
  return apiPatch<NotificationResponse>(`/notifications/${id}/read`).then(
    (res) => res.data,
  );
}

export function markAllNotificationsRead(userId?: string) {
  return apiPatch<NotificationsResponse>(
    withUserId("/notifications/read-all", userId),
  ).then((res) => res.data);
}

export function deleteNotificationApi(id: string) {
  return apiDelete<void>(`/notifications/${id}`);
}
