import { Request, Response } from "express";
import { env } from "@/config/env";
import { products } from "@/data/products.data";
import {
  createOrder,
  getOrder,
  markOrderCancelled,
  markOrderFailed,
  markOrderPaid,
  setCheckoutSdkOrderId,
} from "@/data/orders.store";
import { addPoints, spendPoints } from "@/data/users.store";
import { createZaloPayOrder, queryZaloPayOrder } from "@/lib/zalopay";
import { signCreateOrder } from "@/lib/zmp-payment";
import {
  computeOptionsSurcharge,
  supportsToppings,
  describeOptions,
  ProductOptions,
} from "@/data/customization-options";
import { OrderItem } from "@/types/order";

// Số tiền tối thiểu ZaloPay chấp nhận cho 1 giao dịch — dùng để giới hạn
// không cho đổi điểm làm đơn còn lại quá ít hoặc bằng 0.
const MIN_PAYABLE_AMOUNT = 1000;

// Trừ điểm thưởng đổi giảm giá — không cho đổi vượt quá số dư điểm của
// khách, cũng không cho giảm nhiều hơn mức khiến đơn còn lại dưới
// MIN_PAYABLE_AMOUNT. Điểm bị trừ ngay khi tạo đơn (status "pending") và
// được hoàn lại nếu đơn thanh toán thất bại (xem markOrderFailed).
async function resolvePointsRedemption(
  userId: string | undefined,
  subtotal: number,
  requestedPoints = 0,
): Promise<{ pointsUsed: number; discount: number }> {
  const points = Math.max(0, Math.floor(requestedPoints));
  if (!userId || points <= 0) return { pointsUsed: 0, discount: 0 };

  const maxByAmount = Math.floor(
    Math.max(0, subtotal - MIN_PAYABLE_AMOUNT) / env.pointsRedeemValueVnd,
  );
  const candidatePoints = Math.min(points, maxByAmount);
  if (candidatePoints <= 0) return { pointsUsed: 0, discount: 0 };

  const spent = await spendPoints(userId, candidatePoints);
  if (!spent) return { pointsUsed: 0, discount: 0 };

  return {
    pointsUsed: candidatePoints,
    discount: candidatePoints * env.pointsRedeemValueVnd,
  };
}

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

function resolveOrderItems(
  items: { id: string; quantity: number; options?: ProductOptions }[] = [],
) {
  const orderItems: OrderItem[] = [];

  for (const line of items) {
    const product = products.find((item) => item.id === line.id);
    if (!product || !line.quantity || line.quantity < 1) continue;

    // Topping chỉ có ở trà sữa — bỏ topping client gửi lên cho món khác.
    const options =
      line.options && !supportsToppings(product.category)
        ? { ...line.options, toppings: [] }
        : line.options;
    const unitPrice = parsePrice(product.price) + computeOptionsSurcharge(options);

    orderItems.push({
      id: product.id,
      title: product.title,
      price: `${unitPrice.toLocaleString("vi-VN")}đ`,
      quantity: line.quantity,
      optionsLabel: describeOptions(options),
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
    items?: { id: string; quantity: number; options?: ProductOptions }[];
    userId?: string;
    address?: { receiver: string; phone: string; detail: string; note?: string };
    pointsToRedeem?: number;
  };

  if (!body.items || body.items.length === 0) {
    res.status(400).json({ message: "Giỏ hàng đang trống" });
    return;
  }

  const { orderItems, amount: subtotal } = resolveOrderItems(body.items);

  if (orderItems.length === 0) {
    res.status(400).json({ message: "Sản phẩm trong giỏ hàng không hợp lệ" });
    return;
  }

  const { pointsUsed, discount } = await resolvePointsRedemption(
    body.userId,
    subtotal,
    body.pointsToRedeem,
  );
  const amount = subtotal - discount;

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
      if (pointsUsed > 0 && body.userId) await addPoints(body.userId, pointsUsed);
      res.status(502).json({
        message:
          zpResult.sub_return_message ||
          zpResult.return_message ||
          "Không tạo được đơn thanh toán ZaloPay",
      });
      return;
    }

    const order = await createOrder({
      id: appTransId,
      items: orderItems,
      subtotal,
      discount,
      pointsUsed,
      amount,
      userId: body.userId,
      address: body.address,
    });

    res.json({
      data: {
        orderId: order.id,
        orderUrl: zpResult.order_url,
        amount: order.amount,
        discount: order.discount,
        pointsUsed: order.pointsUsed,
      },
    });
  } catch (err) {
    if (pointsUsed > 0 && body.userId) await addPoints(body.userId, pointsUsed);
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

    const order = await createOrder({
      id: appTransId,
      items: [
        {
          id: "instore",
          title: "Thanh toán tại cửa hàng",
          price: `${amount.toLocaleString("vi-VN")}đ`,
          quantity: 1,
        },
      ],
      subtotal: amount,
      amount,
      userId: body.userId,
    });

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
  const order = await getOrder(req.params.id);

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
      await markOrderPaid(order);
    } else if (zpResult.return_code === 2) {
      await markOrderFailed(order);
    }
  } catch (err) {
    // giữ nguyên trạng thái pending nếu không gọi được ZaloPay, client sẽ tự thử lại
  }

  res.json({ data: order });
}

// Khách tự huỷ đơn đang chờ thanh toán (đặt nhầm, đổi ý...) — chỉ cho phép
// khi đơn còn "pending", tránh huỷ nhầm đơn đã thanh toán hoặc đã thất bại.
export async function cancelOrder(req: Request, res: Response) {
  const order = await getOrder(req.params.id);

  if (!order) {
    res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    return;
  }

  if (order.status !== "pending") {
    res.status(400).json({
      message: "Đơn hàng không còn ở trạng thái có thể huỷ",
    });
    return;
  }

  await markOrderCancelled(order);
  res.json({ data: order });
}

// Dùng cho zmp-sdk's createOrder() (Checkout SDK) — mở giao diện thanh toán
// gốc của Zalo (ZaloPay, thẻ liên kết...), giống app mẫu zaui-coffee.
// mac phải được ký ở backend vì cần private key riêng của Mini App.
// Đồng thời tạo sẵn 1 đơn hàng nội bộ (status "pending") để đối chiếu khi
// nhận webhook callback từ Zalo sau này.
export async function createOrderMac(req: Request, res: Response) {
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
    items?: { id: string; quantity: number; options?: ProductOptions }[];
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

  const order = await createOrder({
    id: generateAppTransId(),
    items: orderItems,
    subtotal: amount,
    amount,
    userId: body.userId,
  });

  res.json({ data: { orderId: order.id, amount, desc, item, mac } });
}

// Mobile gọi ngay sau khi createOrder() (Checkout SDK) trả về orderId của
// Zalo, để backend biết đơn nội bộ nào ứng với giao dịch nào — vì webhook
// callback ở dưới chỉ biết orderId của Zalo, không biết id đơn của mình.
export async function linkCheckoutOrder(req: Request, res: Response) {
  const { checkoutSdkOrderId } = req.body as { checkoutSdkOrderId?: string };

  if (!checkoutSdkOrderId) {
    res.status(400).json({ message: "Thiếu checkoutSdkOrderId" });
    return;
  }

  const order = await setCheckoutSdkOrderId(req.params.id, checkoutSdkOrderId);

  if (!order) {
    res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    return;
  }

  res.json({ data: order });
}
