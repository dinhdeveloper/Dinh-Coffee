import { Request, Response } from "express";
import { products } from "@/data/products.data";
import { orders } from "@/data/orders.store";
import { createZaloPayOrder, queryZaloPayOrder } from "@/lib/zalopay";
import { Order, OrderItem } from "@/types/order";

function parsePrice(price: string) {
  return Number(price.replace(/[^\d]/g, ""));
}

function generateAppTransId() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${yy}${mm}${dd}_${random}`;
}

export async function checkout(req: Request, res: Response) {
  const body = req.body as { items?: { id: string; quantity: number }[] };

  if (!body.items || body.items.length === 0) {
    res.status(400).json({ message: "Giỏ hàng đang trống" });
    return;
  }

  const orderItems: OrderItem[] = [];

  for (const line of body.items) {
    const product = products.find((item) => item.id === line.id);
    if (!product || !line.quantity || line.quantity < 1) continue;

    orderItems.push({
      id: product.id,
      title: product.title,
      price: product.price,
      quantity: line.quantity,
    });
  }

  if (orderItems.length === 0) {
    res.status(400).json({ message: "Sản phẩm trong giỏ hàng không hợp lệ" });
    return;
  }

  const amount = orderItems.reduce(
    (sum, item) => sum + parsePrice(item.price) * item.quantity,
    0,
  );

  const appTransId = generateAppTransId();

  try {
    const zpResult = await createZaloPayOrder({
      appTransId,
      amount,
      description: `Thanh toan don hang BoomBerry ${appTransId}`,
      items: orderItems.map((item) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
      })),
    });

    if (zpResult.return_code !== 1 || !zpResult.order_url) {
      res.status(502).json({
        message:
          zpResult.sub_return_message ||
          zpResult.return_message ||
          "Không tạo được đơn thanh toán ZaloPay",
      });
      return;
    }

    const order: Order = {
      id: appTransId,
      items: orderItems,
      amount,
      status: "pending",
      createdAt: Date.now(),
    };

    orders.set(order.id, order);

    res.json({
      data: {
        orderId: order.id,
        orderUrl: zpResult.order_url,
        amount: order.amount,
      },
    });
  } catch (err) {
    res.status(502).json({ message: "Không kết nối được tới ZaloPay" });
  }
}

export async function getOrderStatus(req: Request, res: Response) {
  const order = orders.get(req.params.id);

  if (!order) {
    res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    return;
  }

  if (order.status !== "pending") {
    res.json({ data: order });
    return;
  }

  try {
    const zpResult = await queryZaloPayOrder(order.id);

    if (zpResult.return_code === 1) {
      order.status = "paid";
    } else if (zpResult.return_code === 2) {
      order.status = "failed";
    }
  } catch (err) {
    // giữ nguyên trạng thái pending nếu không gọi được ZaloPay, client sẽ tự thử lại
  }

  res.json({ data: order });
}
