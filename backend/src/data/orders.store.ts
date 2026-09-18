import { Prisma } from "@prisma/client";
import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";
import { addPoints } from "@/data/users.store";
import { incrementPurchaseCount } from "@/data/product-stats.store";
import { createNotification } from "@/data/notifications.store";
import { Order, OrderStage } from "@/types/order";

function toOrder(row: {
  id: string;
  userId: string | null;
  amount: number;
  status: string;
  stage: string | null;
  items: Prisma.JsonValue;
  address: Prisma.JsonValue;
  checkoutSdkOrderId: string | null;
  paidAt: Date | null;
  createdAt: Date;
}): Order {
  return {
    id: row.id,
    userId: row.userId ?? undefined,
    amount: row.amount,
    status: row.status as Order["status"],
    stage: (row.stage as OrderStage | null) ?? undefined,
    items: row.items as Order["items"],
    address: (row.address as Order["address"]) ?? undefined,
    checkoutSdkOrderId: row.checkoutSdkOrderId ?? undefined,
    paidAt: row.paidAt ? row.paidAt.getTime() : undefined,
    createdAt: row.createdAt.getTime(),
  };
}

// Tiến độ chuẩn bị đơn sau khi thanh toán — mỗi bước cách nhau 1 phút, tính
// từ paidAt thay vì đếm bằng timer trên server (server có thể sleep/restart
// giữa chừng trên Render free tier), nên chỉ cần biết "đã trôi qua bao lâu"
// là suy ra đúng stage hiện tại, dù vài phút mới có người mở lại đơn để xem.
const STAGE_SEQUENCE: OrderStage[] = [
  "confirmed",
  "preparing",
  "delivering",
  "completed",
];
const STAGE_INTERVAL_MS = 60_000;

const STAGE_NOTIFICATION: Record<
  OrderStage,
  (orderId: string) => { title: string; message: string }
> = {
  confirmed: (orderId) => ({
    title: "Quán đã nhận đơn",
    message: `Đơn #${orderId} đã được quán xác nhận và sẽ sớm được chuẩn bị.`,
  }),
  preparing: (orderId) => ({
    title: "Quán đang chuẩn bị món",
    message: `Đơn #${orderId} đang được pha chế, sắp xong rồi!`,
  }),
  delivering: (orderId) => ({
    title: "Đơn hàng đang được giao",
    message: `Đơn #${orderId} đang trên đường đến bạn.`,
  }),
  completed: (orderId) => ({
    title: "Đơn hàng đã hoàn tất",
    message: `Đơn #${orderId} đã giao thành công, cảm ơn bạn đã ủng hộ!`,
  }),
};

// Gọi mỗi khi đơn được đọc — nếu đã đủ thời gian, tiến đơn sang stage mới
// (có thể nhảy nhiều bước một lúc nếu lâu chưa ai mở lại đơn) và bắn thông
// báo cho từng stage đã đi qua.
async function advanceOrderStage(order: Order): Promise<Order> {
  if (order.status !== "paid" || !order.paidAt || !order.stage) return order;

  const currentIndex = STAGE_SEQUENCE.indexOf(order.stage);
  if (currentIndex === -1 || currentIndex === STAGE_SEQUENCE.length - 1) {
    return order;
  }

  const elapsedSteps = Math.floor(
    (Date.now() - order.paidAt) / STAGE_INTERVAL_MS,
  );
  const targetIndex = Math.min(elapsedSteps, STAGE_SEQUENCE.length - 1);

  if (targetIndex <= currentIndex) return order;

  const newStage = STAGE_SEQUENCE[targetIndex];

  const result = await prisma.order.updateMany({
    where: { id: order.id, stage: order.stage },
    data: { stage: newStage },
  });

  // Đơn đã bị một request khác cập nhật stage trước đó (đọc đồng thời) — giữ
  // nguyên, request kia đã lo việc bắn thông báo.
  if (result.count === 0) return order;

  if (order.userId) {
    for (let i = currentIndex + 1; i <= targetIndex; i++) {
      const content = STAGE_NOTIFICATION[STAGE_SEQUENCE[i]](order.id);
      await createNotification({
        userId: order.userId,
        type: "order",
        orderId: order.id,
        ...content,
      });
    }
  }

  order.stage = newStage;
  return order;
}

export async function getOrder(id: string): Promise<Order | null> {
  const row = await prisma.order.findUnique({ where: { id } });
  if (!row) return null;

  return advanceOrderStage(toOrder(row));
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

  const paidAt = new Date();
  const result = await prisma.order.updateMany({
    where: { id: order.id, status: { not: "paid" } },
    data: { status: "paid", stage: "confirmed", paidAt },
  });

  // Không có row nào được cập nhật nghĩa là đơn đã được đánh dấu "paid" bởi
  // một request khác trước đó (webhook + polling cùng chạy) — không cộng
  // điểm lần 2.
  if (result.count === 0) return;

  order.status = "paid";
  order.stage = "confirmed";
  order.paidAt = paidAt.getTime();

  if (order.userId) {
    await addPoints(order.userId, Math.floor(order.amount / env.pointsPerVnd));
  }

  await Promise.all(
    order.items.map((item) => incrementPurchaseCount(item.id, item.quantity)),
  );

  if (order.userId) {
    await createNotification({
      userId: order.userId,
      type: "order",
      orderId: order.id,
      title: "Đơn hàng đã thanh toán",
      message: `Đơn #${order.id} của bạn đã thanh toán thành công, cảm ơn bạn đã ủng hộ!`,
    });

    const confirmed = STAGE_NOTIFICATION.confirmed(order.id);
    await createNotification({
      userId: order.userId,
      type: "order",
      orderId: order.id,
      ...confirmed,
    });
  }
}
