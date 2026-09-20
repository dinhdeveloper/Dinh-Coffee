import { Request, Response } from "express";
import {
  findOrderByCheckoutSdkOrderId,
  getOrder,
  markOrderFailed,
  markOrderPaid,
} from "@/data/orders.store";
import { verifyZaloPayCallbackMac } from "@/lib/zalopay";
import { MomoIpnBody, momoResultToStatus, verifyMomoIpnSignature } from "@/lib/momo";
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
    await markOrderFailed(order);
  }

  res.json({ returnCode: 1, returnMessage: "success" });
}

// IPN (webhook server-to-server) của MoMo. MoMo chỉ cần HTTP 204/200, và sẽ
// gọi lại nhiều lần nếu không nhận được — markOrderPaid/markOrderFailed đã
// idempotent nên gọi lặp không cộng điểm trùng.
// https://developers.momo.vn/v3/docs/payment/api/result-handling/notification
export async function momoIpn(req: Request, res: Response) {
  const body = req.body as MomoIpnBody;

  if (!body?.signature || !verifyMomoIpnSignature(body)) {
    res.status(400).json({ message: "invalid signature" });
    return;
  }

  const order = await getOrder(body.orderId);

  if (order && order.amount === Number(body.amount)) {
    if (body.resultCode === 0) {
      await markOrderPaid(order);
    } else if (momoResultToStatus(body.resultCode) === "failed") {
      await markOrderFailed(order);
    }
  }

  res.status(204).end();
}
