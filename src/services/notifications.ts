import { apiDelete, apiGet, apiPatch } from "@/services/api";

export type NotificationType = "order" | "promo" | "system";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  group: "Hôm nay" | "Trước đó";
  unread: boolean;
};

type NotificationsResponse = { data: Notification[] };
type NotificationResponse = { data: Notification };

export function fetchNotifications() {
  return apiGet<NotificationsResponse>("/notifications").then(
    (res) => res.data,
  );
}

export function markNotificationRead(id: string) {
  return apiPatch<NotificationResponse>(`/notifications/${id}/read`).then(
    (res) => res.data,
  );
}

export function markAllNotificationsRead() {
  return apiPatch<NotificationsResponse>("/notifications/read-all").then(
    (res) => res.data,
  );
}

export function deleteNotificationApi(id: string) {
  return apiDelete<void>(`/notifications/${id}`);
}
