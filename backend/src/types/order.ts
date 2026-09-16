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
};
