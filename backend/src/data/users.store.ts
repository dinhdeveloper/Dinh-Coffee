import { prisma } from "@/lib/prisma";
import { User } from "@/types/user";

function toUser(row: {
  id: string;
  name: string;
  avatar: string;
  phone: string | null;
  points: number;
  firstLoginAt: Date;
  lastLoginAt: Date;
}): User {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    phone: row.phone ?? undefined,
    points: row.points,
    firstLoginAt: row.firstLoginAt.getTime(),
    lastLoginAt: row.lastLoginAt.getTime(),
  };
}

export async function getUser(id: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? toUser(row) : null;
}

export async function upsertUser(input: {
  id: string;
  name: string;
  avatar: string;
}): Promise<User> {
  const now = new Date();

  const row = await prisma.user.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      name: input.name,
      avatar: input.avatar,
      firstLoginAt: now,
      lastLoginAt: now,
    },
    update: {
      name: input.name,
      avatar: input.avatar,
      lastLoginAt: now,
    },
  });

  return toUser(row);
}

export async function setPhone(userId: string, phone: string): Promise<User> {
  const row = await prisma.user.update({
    where: { id: userId },
    data: { phone },
  });

  return toUser(row);
}

// Dùng bởi markOrderPaid() khi cộng điểm thưởng — cộng dồn nguyên tử ở tầng
// DB (increment) để tránh mất điểm nếu 2 đơn được xác nhận "paid" gần nhau.
export async function addPoints(userId: string, points: number) {
  if (points <= 0) return;

  await prisma.user
    .update({
      where: { id: userId },
      data: { points: { increment: points } },
    })
    .catch(() => {
      // user không tồn tại (vd. id giả) — bỏ qua, không có điểm để cộng
    });
}

// Trừ điểm khi khách đổi điểm lấy giảm giá lúc đặt hàng (checkout()) — điều
// kiện "points >= points" trong where khiến updateMany chỉ trừ khi đủ số dư,
// tránh race condition đặt 2 đơn cùng lúc làm điểm âm. Trả về true nếu trừ
// thành công, false nếu không đủ điểm/không có user.
export async function spendPoints(
  userId: string,
  points: number,
): Promise<boolean> {
  if (points <= 0) return true;

  const result = await prisma.user.updateMany({
    where: { id: userId, points: { gte: points } },
    data: { points: { decrement: points } },
  });

  return result.count > 0;
}
