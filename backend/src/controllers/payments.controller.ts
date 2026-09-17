import { Request, Response } from "express";
import {
  findOrderByCheckoutSdkOrderId,
  getOrder,
  markOrderPaid,
  setOrderStatus,
} from "@/data/orders.store";
import { verifyZaloPayCallbackMac } from "@/lib/zalopay";
import { verifyCallbackMac, verifyOverallMac } from "@/lib/zmp-payment";

export async function zaloPayCallback(req: Request, res: Response) {
  const { data, mac } = req.body as { data?: string; mac?: string };

  if (!data || !mac || !verifyZaloPayCallbackMac(data, mac)) {
    res.json({ return_code: -1, return_message: "mac not equal" });
    return;
  }

  try {
    const payload = JSON.parse(data) as { app_trans_id: string };
    const order = await getOrder(payload.app_trans_id);

    if (order) {
      await markOrderPaid(order);
    }

    res.json({ return_code: 1, return_message: "success" });
  } catch (err) {
    res.json({ return_code: 0, return_message: "invalid callback data" });
  }
}

// Webhook server-to-server của Zalo CheckoutSDK, cấu hình ở "Callback URL"
// trong mini.zalo.me/developers > CheckoutSDK > phương thức thanh toán.
// https://docs.zaloplatforms.com/docs/MA/checkoutSdk/webhooks/callback
type ZmpCallbackData = {
  appId: string;
  orderId: string;
  transId: string;
  method: string;
  transTime: number;
  merchantTransId: string;
  amount: number;
  description: string;
  resultCode: number;
  message: string;
  extradata?: string;
};

export async function zmpCheckoutCallback(req: Request, res: Response) {
  const body = req.body as {
    data?: ZmpCallbackData;
    mac?: string;
    overallMac?: string;
  };

  if (
    !body.data ||
    !body.mac ||
    !body.overallMac ||
    !verifyCallbackMac(body.data, body.mac) ||
    !verifyOverallMac(body.data, body.overallMac)
  ) {
    res.json({ returnCode: -1, returnMessage: "invalid mac" });
    return;
  }

  const { data } = body;

  // Đơn nội bộ được liên kết qua bước POST /api/orders/:id/link (mobile gọi
  // ngay sau khi createOrder() trả về orderId của Zalo).
  const order = await findOrderByCheckoutSdkOrderId(data.orderId);

  if (!order) {
    res.json({ returnCode: -1, returnMessage: "order not found" });
    return;
  }

  if (order.status === "paid") {
    res.json({ returnCode: 2, returnMessage: "duplicate" });
    return;
  }

  if (order.amount !== data.amount) {
    res.json({ returnCode: -1, returnMessage: "amount mismatch" });
    return;
  }

  if (data.resultCode === 1) {
    await markOrderPaid(order);
  } else {
    await setOrderStatus(order.id, "failed");
  }

  res.json({ returnCode: 1, returnMessage: "success" });
}
