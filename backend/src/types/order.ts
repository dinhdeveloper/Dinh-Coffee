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
  // id người dùng Zalo đặt đơn — dùng để cộng điểm thưởng khi đơn "paid".
  // Không bắt buộc vì khách chưa đăng nhập vẫn thanh toán được, chỉ là
  // không được tích điểm.
  userId?: string;
  // orderId do zmp-sdk's createOrder() (Checkout SDK) trả về, dùng để đối
  // chiếu với webhook callback của Zalo (chỉ biết orderId này, không biết id
  // đơn hàng nội bộ của mình).
  checkoutSdkOrderId?: string;
};
