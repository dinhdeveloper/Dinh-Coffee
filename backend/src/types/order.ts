export type OrderStatus = "pending" | "paid" | "failed";

export type OrderItem = {
  id: string;
  title: string;
  price: string;
  quantity: number;
};

export type Order = {
  id: string;
  items: OrderItem[];
  amount: number;
  status: OrderStatus;
  createdAt: number;
  // orderId do zmp-sdk's createOrder() (Checkout SDK) trả về, dùng để đối
  // chiếu với webhook callback của Zalo (chỉ biết orderId này, không biết id
  // đơn hàng nội bộ của mình).
  checkoutSdkOrderId?: string;
};
