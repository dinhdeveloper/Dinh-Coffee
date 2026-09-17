import { env } from "@/config/env";
import { users } from "@/data/users.store";
import { Order } from "@/types/order";

export const orders = new Map<string, Order>();

// Dùng chung cho mọi nơi xác nhận đơn đã thanh toán (webhook ZaloPay, webhook
// Checkout SDK, polling getOrderStatus) để tránh cộng điểm trùng lặp nếu
// nhiều nguồn cùng báo "paid" cho 1 đơn.
export function markOrderPaid(order: Order) {
  if (order.status === "paid") return;

  order.status = "paid";

  if (!order.userId) return;

  const user = users.get(order.userId);
  if (!user) return;

  user.points += Math.floor(order.amount / env.pointsPerVnd);
}
