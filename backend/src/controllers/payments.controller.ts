import { Request, Response } from "express";
import { orders } from "@/data/orders.store";
import { verifyZaloPayCallbackMac } from "@/lib/zalopay";

export function zaloPayCallback(req: Request, res: Response) {
  const { data, mac } = req.body as { data?: string; mac?: string };

  if (!data || !mac || !verifyZaloPayCallbackMac(data, mac)) {
    res.json({ return_code: -1, return_message: "mac not equal" });
    return;
  }

  try {
    const payload = JSON.parse(data) as { app_trans_id: string };
    const order = orders.get(payload.app_trans_id);

    if (order) {
      order.status = "paid";
    }

    res.json({ return_code: 1, return_message: "success" });
  } catch (err) {
    res.json({ return_code: 0, return_message: "invalid callback data" });
  }
}
