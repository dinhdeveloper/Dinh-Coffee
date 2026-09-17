import { Request, Response } from "express";
import {
  deleteNotification as deleteNotificationRow,
  listNotificationsForUser,
  markAllNotificationsRead as markAllRead,
  markNotificationRead as markRead,
} from "@/data/notifications.store";

function getUserId(req: Request): string | undefined {
  const value = req.query.userId;
  return typeof value === "string" && value.trim() ? value : undefined;
}

export async function listNotifications(req: Request, res: Response) {
  const data = await listNotificationsForUser(getUserId(req));
  res.json({ data });
}

export async function markAsRead(req: Request, res: Response) {
  const notification = await markRead(req.params.id);

  if (!notification) {
    res.status(404).json({ message: "Không tìm thấy thông báo" });
    return;
  }

  res.json({ data: notification });
}

export async function markAllAsRead(req: Request, res: Response) {
  await markAllRead(getUserId(req));
  const data = await listNotificationsForUser(getUserId(req));
  res.json({ data });
}

export async function deleteNotification(req: Request, res: Response) {
  const deleted = await deleteNotificationRow(req.params.id);

  if (!deleted) {
    res.status(404).json({ message: "Không tìm thấy thông báo" });
    return;
  }

  res.status(204).send();
}
