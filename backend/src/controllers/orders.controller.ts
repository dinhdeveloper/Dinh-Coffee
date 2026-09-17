import { Request, Response } from "express";
import { env } from "@/config/env";
import { products } from "@/data/products.data";
import { markOrderPaid, orders } from "@/data/orders.store";
import { createZaloPayOrder, queryZaloPayOrder } from "@/lib/zalopay";
import { signCreateOrder } from "@/lib/zmp-payment";
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

function resolveOrderItems(items: { id: string; quantity: number }[] = []) {
  const orderItems: OrderItem[] = [];

  for (const line of items) {
    const product = products.find((item) => item.id === line.id);
    if (!product || !line.quantity || line.quantity < 1) continue;

    orderItems.push({
      id: product.id,
      title: product.title,
      price: product.price,
      quantity: line.quantity,
    });
  }

  const amount = orderItems.reduce(
    (sum, item) => sum + parsePrice(item.price) * item.quantity,
    0,
  );

  return { orderItems, amount };
}

export async function checkout(req: Request, res: Response) {
  const body = req.body as {
    items?: { id: string; quantity: number }[];
    userId?: string;
  };

  if (!body.items || body.items.length === 0) {
    res.status(400).json({ message: "Giỏ hàng đang trống" });
    return;
  }

  const { orderItems, amount } = resolveOrderItems(body.items);

  if (orderItems.length === 0) {
    res.status(400).json({ message: "Sản phẩm trong giỏ hàng không hợp lệ" });
    return;
  }

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
      userId: body.userId,
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

// Thanh toán tại cửa hàng: nhân viên đưa mã QR chứa số tiền cần trả, mobile
// quét mã rồi gọi API này để tạo đơn ZaloPay với đúng số tiền đó — không đi
// qua giỏ hàng/catalog sản phẩm như checkout() ở trên.
export async function checkoutInStore(req: Request, res: Response) {
  const body = req.body as { amount?: number; userId?: string };
  const amount = Math.floor(Number(body.amount));

  if (!amount || amount < 1000) {
    res.status(400).json({ message: "Số tiền thanh toán không hợp lệ" });
    return;
  }

  const appTransId = generateAppTransId();

  try {
    const zpResult = await createZaloPayOrder({
      appTransId,
      amount,
      description: `Thanh toan tai cua hang BoomBerry ${appTransId}`,
      items: [],
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
      items: [
        {
          id: "instore",
          title: "Thanh toán tại cửa hàng",
          price: `${amount.toLocaleString("vi-VN")}đ`,
          quantity: 1,
        },
      ],
      amount,
      status: "pending",
      createdAt: Date.now(),
      userId: body.userId,
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
      markOrderPaid(order);
    } else if (zpResult.return_code === 2) {
      order.status = "failed";
    }
  } catch (err) {
    // giữ nguyên trạng thái pending nếu không gọi được ZaloPay, client sẽ tự thử lại
  }

  res.json({ data: order });
}

// Dùng cho zmp-sdk's createOrder() (Checkout SDK) — mở giao diện thanh toán
// gốc của Zalo (ZaloPay, thẻ liên kết...), giống app mẫu zaui-coffee.
// mac phải được ký ở backend vì cần private key riêng của Mini App.
// Đồng thời tạo sẵn 1 đơn hàng nội bộ (status "pending") để đối chiếu khi
// nhận webhook callback từ Zalo sau này.
export function createOrderMac(req: Request, res: Response) {
  // TODO: khi có private key thật (Zalo Developers > Mini App > Payment),
  // set ZMP_PAYMENT_PRIVATE_KEY trong backend/.env — mac ký ra mới được Zalo
  // chấp nhận cho giao dịch thật. Thiếu key, mac vẫn được ký (bằng key rỗng)
  // để nút "Đặt hàng" chạy được trên môi trường demo/dev, nhưng Zalo sẽ từ
  // chối giao dịch thật do sai chữ ký.
  if (!env.zmpPayment.privateKey) {
    console.warn(
      "[orders] ZMP_PAYMENT_PRIVATE_KEY chưa được cấu hình — mac chỉ dùng được cho demo/dev, không hợp lệ với giao dịch thật.",
    );
  }

  const body = req.body as {
    items?: { id: string; quantity: number }[];
    userId?: string;
  };
  const { orderItems, amount } = resolveOrderItems(body.items);

  if (orderItems.length === 0) {
    res.status(400).json({ message: "Sản phẩm trong giỏ hàng không hợp lệ" });
    return;
  }

  const desc = "Thanh toan don hang BoomBerry";
  const item = orderItems.map((line) => ({
    id: line.id,
    name: line.title,
    price: parsePrice(line.price),
    quantity: line.quantity,
  }));

  const mac = signCreateOrder({ amount, desc, item });

  const order: Order = {
    id: generateAppTransId(),
    items: orderItems,
    amount,
    status: "pending",
    createdAt: Date.now(),
    userId: body.userId,
  };

  orders.set(order.id, order);

  res.json({ data: { orderId: order.id, amount, desc, item, mac } });
}

// Mobile gọi ngay sau khi createOrder() (Checkout SDK) trả về orderId của
// Zalo, để backend biết đơn nội bộ nào ứng với giao dịch nào — vì webhook
// callback ở dưới chỉ biết orderId của Zalo, không biết id đơn của mình.
export function linkCheckoutOrder(req: Request, res: Response) {
  const order = orders.get(req.params.id);

  if (!order) {
    res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    return;
  }

  const { checkoutSdkOrderId } = req.body as { checkoutSdkOrderId?: string };

  if (!checkoutSdkOrderId) {
    res.status(400).json({ message: "Thiếu checkoutSdkOrderId" });
    return;
  }

  order.checkoutSdkOrderId = checkoutSdkOrderId;
  res.json({ data: order });
}
