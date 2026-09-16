import { apiGet, apiPost } from "@/services/api";

export type OrderStatus = "pending" | "paid" | "failed";

export type CheckoutItem = {
  id: string;
  quantity: number;
};

export type CheckoutResult = {
  orderId: string;
  orderUrl: string;
  amount: number;
};

export type Order = {
  id: string;
  amount: number;
  status: OrderStatus;
};

type CheckoutResponse = { data: CheckoutResult };
type OrderResponse = { data: Order };

export function checkoutOrder(items: CheckoutItem[]) {
  return apiPost<CheckoutResponse>("/orders", { items }).then(
    (res) => res.data,
  );
}

export function fetchOrderStatus(orderId: string) {
  return apiGet<OrderResponse>(`/orders/${orderId}/status`).then(
    (res) => res.data,
  );
}
