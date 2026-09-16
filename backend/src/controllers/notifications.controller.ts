import { Request, Response } from "express";
import { notifications } from "@/data/notifications.data";

export function listNotifications(req: Request, res: Response) {
  res.json({ data: notifications });
}

export function markAsRead(req: Request, res: Response) {
  const notification = notifications.find(
    (item) => item.id === req.params.id,
  );

  if (!notification) {
    res.status(404).json({ message: "Không tìm thấy thông báo" });
    return;
  }

  notification.unread = false;
  res.json({ data: notification });
}

export function markAllAsRead(req: Request, res: Response) {
  notifications.forEach((item) => {
    item.unread = false;
  });

  res.json({ data: notifications });
}

export function deleteNotification(req: Request, res: Response) {
  const index = notifications.findIndex((item) => item.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ message: "Không tìm thấy thông báo" });
    return;
  }

  notifications.splice(index, 1);
  res.status(204).send();
}
