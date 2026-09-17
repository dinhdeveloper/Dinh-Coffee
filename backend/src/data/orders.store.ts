import { Prisma } from "@prisma/client";
import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";
import { addPoints } from "@/data/users.store";
import { Order } from "@/types/order";

function toOrder(row: {
  id: string;
  userId: string | null;
  amount: number;
  status: string;
  items: Prisma.JsonValue;
  address: Prisma.JsonValue;
  checkoutSdkOrderId: string | null;
  createdAt: Date;
}): Order {
  return {
    id: row.id,
    userId: row.userId ?? undefined,
    amount: row.amount,
    status: row.status as Order["status"],
    items: row.items as Order["items"],
    address: (row.address as Order["address"]) ?? undefined,
    checkoutSdkOrderId: row.checkoutSdkOrderId ?? undefined,
    createdAt: row.createdAt.getTime(),
  };
}

export async function getOrder(id: string): Promise<Order | null> {
  const row = await prisma.order.findUnique({ where: { id } });
  return row ? toOrder(row) : null;
}

export async function findOrderByCheckoutSdkOrderId(
  checkoutSdkOrderId: string,
): Promise<Order | null> {
  const row = await prisma.order.findFirst({ where: { checkoutSdkOrderId } });
  return row ? toOrder(row) : null;
}

export async function createOrder(input: {
  id: string;
  userId?: string;
  amount: number;
  items: Order["items"];
  address?: Order["address"];
}): Promise<Order> {
  const row = await prisma.order.create({
    data: {
      id: input.id,
      userId: input.userId,
      amount: input.amount,
      status: "pending",
      items: input.items as unknown as Prisma.InputJsonValue,
      address: (input.address ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
    },
  });

  return toOrder(row);
}

export async function setCheckoutSdkOrderId(
  id: string,
  checkoutSdkOrderId: string,
): Promise<Order | null> {
  const row = await prisma.order
    .update({ where: { id }, data: { checkoutSdkOrderId } })
    .catch(() => null);

  return row ? toOrder(row) : null;
}

export async function setOrderStatus(id: string, status: Order["status"]) {
  await prisma.order.update({ where: { id }, data: { status } });
}

// Dùng chung cho mọi nơi xác nhận đơn đã thanh toán (webhook ZaloPay, webhook
// Checkout SDK, polling getOrderStatus) để tránh cộng điểm trùng lặp nếu
// nhiều nguồn cùng báo "paid" cho 1 đơn — updateMany chỉ khớp (và cộng điểm)
// đúng 1 lần vì điều kiện where loại trừ đơn đã "paid" từ trước.
export async function markOrderPaid(order: Order) {
  if (order.status === "paid") return;

  const result = await prisma.order.updateMany({
    where: { id: order.id, status: { not: "paid" } },
    data: { status: "paid" },
  });

  // Không có row nào được cập nhật nghĩa là đơn đã được đánh dấu "paid" bởi
  // một request khác trước đó (webhook + polling cùng chạy) — không cộng
  // điểm lần 2.
  if (result.count === 0) return;

  order.status = "paid";

  if (order.userId) {
    await addPoints(order.userId, Math.floor(order.amount / env.pointsPerVnd));
  }
}
