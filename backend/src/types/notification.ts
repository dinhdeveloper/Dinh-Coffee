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
