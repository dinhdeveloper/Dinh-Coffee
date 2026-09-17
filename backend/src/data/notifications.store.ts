import { prisma } from "@/lib/prisma";
import { Notification, NotificationType } from "@/types/notification";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();

  if (diff < MINUTE) return "Vừa xong";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} phút trước`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} giờ trước`;
  if (diff < 2 * DAY) return "Hôm qua";
  return `${Math.floor(diff / DAY)} ngày trước`;
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function toNotification(row: {
  id: string;
  type: string;
  title: string;
  message: string;
  unread: boolean;
  createdAt: Date;
}): Notification {
  return {
    id: row.id,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    unread: row.unread,
    time: formatRelativeTime(row.createdAt),
    group: isToday(row.createdAt) ? "Hôm nay" : "Trước đó",
  };
}

// Thông báo hiện cho 1 user = thông báo riêng của họ (userId khớp) + thông
// báo chung/broadcast (userId null, vd. khuyến mãi cho tất cả mọi người).
export async function listNotificationsForUser(
  userId?: string,
): Promise<Notification[]> {
  const rows = await prisma.notification.findMany({
    where: userId ? { OR: [{ userId }, { userId: null }] } : { userId: null },
    orderBy: { createdAt: "desc" },
  });

  return rows.map(toNotification);
}

export async function markNotificationRead(id: string): Promise<Notification | null> {
  const row = await prisma.notification
    .update({ where: { id }, data: { unread: false } })
    .catch(() => null);

  return row ? toNotification(row) : null;
}

export async function markAllNotificationsRead(userId?: string): Promise<void> {
  await prisma.notification.updateMany({
    where: userId ? { OR: [{ userId }, { userId: null }] } : { userId: null },
    data: { unread: false },
  });
}

export async function deleteNotification(id: string): Promise<boolean> {
  const result = await prisma.notification.deleteMany({ where: { id } });
  return result.count > 0;
}

export async function createNotification(input: {
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
}): Promise<Notification> {
  const row = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
    },
  });

  return toNotification(row);
}
