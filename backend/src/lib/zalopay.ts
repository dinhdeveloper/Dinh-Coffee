import crypto from "crypto";
import { env } from "@/config/env";

function hmacSha256(data: string, key: string) {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

export type ZaloPayOrderItem = {
  id: string;
  title: string;
  quantity: number;
};

export type ZaloPayCreateOrderParams = {
  appTransId: string;
  amount: number;
  description: string;
  items: ZaloPayOrderItem[];
};

export type ZaloPayCreateOrderResult = {
  return_code: number;
  return_message: string;
  sub_return_code?: number;
  sub_return_message?: string;
  order_url?: string;
  zp_trans_token?: string;
  order_token?: string;
  qr_code?: string;
};

// https://github.com/zalopay-samples/quickstart-payment-gateway
export async function createZaloPayOrder(
  params: ZaloPayCreateOrderParams,
): Promise<ZaloPayCreateOrderResult> {
  const appTime = Date.now();
  const appUser = "zmp_user";
  const embedData = JSON.stringify({ redirecturl: env.zalopay.redirectUrl });
  const item = JSON.stringify(params.items);

  const macInput = [
    env.zalopay.appId,
    params.appTransId,
    appUser,
    params.amount,
    appTime,
    embedData,
    item,
  ].join("|");

  const body = new URLSearchParams({
    app_id: String(env.zalopay.appId),
    app_trans_id: params.appTransId,
    app_user: appUser,
    app_time: String(appTime),
    amount: String(params.amount),
    item,
    embed_data: embedData,
    description: params.description,
    bank_code: "",
    callback_url: env.zalopay.callbackUrl,
    mac: hmacSha256(macInput, env.zalopay.key1),
  });

  const res = await fetch(`${env.zalopay.endpoint}create`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  return res.json() as Promise<ZaloPayCreateOrderResult>;
}

export type ZaloPayQueryResult = {
  return_code: number; // 1 = paid, 2 = failed, 3 = processing
  return_message: string;
  amount?: number;
};

export async function queryZaloPayOrder(
  appTransId: string,
): Promise<ZaloPayQueryResult> {
  const macInput = [env.zalopay.appId, appTransId, env.zalopay.key1].join("|");

  const body = new URLSearchParams({
    app_id: String(env.zalopay.appId),
    app_trans_id: appTransId,
    mac: hmacSha256(macInput, env.zalopay.key1),
  });

  const res = await fetch(`${env.zalopay.endpoint}query`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  return res.json() as Promise<ZaloPayQueryResult>;
}

export function verifyZaloPayCallbackMac(dataStr: string, mac: string) {
  return hmacSha256(dataStr, env.zalopay.key2) === mac;
}
