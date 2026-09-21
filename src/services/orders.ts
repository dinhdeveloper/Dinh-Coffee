import { apiGet, apiPost } from "@/services/api";
import type { DeliveryAddress } from "@/services/address";
import type { ProductOptions } from "@/services/customization";

export type OrderStatus = "pending" | "paid" | "failed" | "cancelled";

// Tiến độ chuẩn bị đơn sau khi đã thanh toán — backend tự tiến 1 bước mỗi
// phút (xem advanceOrderStage trong backend/src/data/orders.store.ts).
export type OrderStage = "confirmed" | "preparing" | "delivering" | "completed";

export type PaymentMethod = "zalopay" | "momo";

export type CheckoutItem = {
  id: string;
  quantity: number;
  options?: ProductOptions;
};

export type CheckoutResult = {
  orderId: string;
  orderUrl: string;
  amount: number;
  discount?: number;
  pointsUsed?: number;
};

export type OrderLineItem = {
  id: string;
  title: string;
  price: string;
  quantity: number;
  optionsLabel?: string;
};

export type Order = {
  id: string;
  subtotal: number;
  discount: number;
  pointsUsed: number;
  amount: number;
  status: OrderStatus;
  stage?: OrderStage;
  items: OrderLineItem[];
  createdAt: number;
  address?: DeliveryAddress;
};

type CheckoutResponse = { data: CheckoutResult };
type OrderResponse = { data: Order };

export function checkoutOrder(
  items: CheckoutItem[],
  userId?: string,
  address?: DeliveryAddress,
  pointsToRedeem?: number,
  paymentMethod: PaymentMethod = "zalopay",
) {
  return apiPost<CheckoutResponse>("/orders", {
    items,
    userId,
    address,
    pointsToRedeem,
    paymentMethod,
  }).then((res) => res.data);
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

// Khách tự huỷ đơn đang chờ thanh toán — backend chỉ chấp nhận khi đơn còn
// "pending", đơn đã "paid"/"failed" sẽ bị từ chối.
export function cancelOrder(orderId: string) {
  return apiPost<OrderResponse>(`/orders/${orderId}/cancel`).then(
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
