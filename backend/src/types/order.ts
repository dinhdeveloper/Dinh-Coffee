export type OrderStatus = "pending" | "paid" | "failed";

// Tiến độ chuẩn bị đơn sau khi đã thanh toán — tự động tiến 1 bước mỗi phút,
// xem advanceOrderStage trong orders.store.ts.
export type OrderStage = "confirmed" | "preparing" | "delivering" | "completed";

export type OrderItem = {
  id: string;
  title: string;
  price: string;
  quantity: number;
};

export type DeliveryAddress = {
  receiver: string;
  phone: string;
  detail: string;
  note?: string;
};

export type Order = {
  id: string;
  items: OrderItem[];
  amount: number;
  status: OrderStatus;
  stage?: OrderStage;
  paidAt?: number;
  createdAt: number;
  // id người dùng Zalo đặt đơn — dùng để cộng điểm thưởng khi đơn "paid".
  // Không bắt buộc vì khách chưa đăng nhập vẫn thanh toán được, chỉ là
  // không được tích điểm.
  userId?: string;
  address?: DeliveryAddress;
  // orderId do zmp-sdk's createOrder() (Checkout SDK) trả về, dùng để đối
  // chiếu với webhook callback của Zalo (chỉ biết orderId này, không biết id
  // đơn hàng nội bộ của mình).
  checkoutSdkOrderId?: string;
};
