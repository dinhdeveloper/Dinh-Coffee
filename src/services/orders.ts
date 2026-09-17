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

export type OrderLineItem = {
  id: string;
  title: string;
  price: string;
  quantity: number;
};

export type Order = {
  id: string;
  amount: number;
  status: OrderStatus;
  items: OrderLineItem[];
  createdAt: number;
};

type CheckoutResponse = { data: CheckoutResult };
type OrderResponse = { data: Order };

export function checkoutOrder(items: CheckoutItem[], userId?: string) {
  return apiPost<CheckoutResponse>("/orders", { items, userId }).then(
    (res) => res.data,
  );
}

export function checkoutInStoreOrder(amount: number, userId?: string) {
  return apiPost<CheckoutResponse>("/orders/instore", { amount, userId }).then(
    (res) => res.data,
  );
}

export function fetchOrderStatus(orderId: string) {
  return apiGet<OrderResponse>(`/orders/${orderId}/status`).then(
    (res) => res.data,
  );
}

// Dùng cho zmp-sdk's createOrder() (Checkout SDK) — backend tính lại giá
// từ dữ liệu sản phẩm gốc, tạo sẵn 1 đơn nội bộ (status "pending"), rồi ký
// "mac" (cần private key riêng, không thể tính ở mobile).
export type CreateOrderPayload = {
  orderId: string;
  amount: number;
  desc: string;
  item: Record<string, unknown>[];
  mac: string;
};

type CreateOrderMacResponse = { data: CreateOrderPayload };

export function prepareZaloOrder(items: CheckoutItem[]) {
  return apiPost<CreateOrderMacResponse>("/orders/mac", { items }).then(
    (res) => res.data,
  );
}

// Gọi ngay sau khi createOrder() (Checkout SDK) trả về orderId của Zalo, để
// backend biết đơn nội bộ nào ứng với giao dịch nào — cần cho webhook
// callback đối chiếu kết quả thanh toán sau này.
export function linkCheckoutOrder(orderId: string, checkoutSdkOrderId: string) {
  return apiPost(`/orders/${orderId}/link`, { checkoutSdkOrderId });
}
