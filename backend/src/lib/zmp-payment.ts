import crypto from "crypto";
import { env } from "@/config/env";

function hmac(data: string) {
  return crypto
    .createHmac("sha256", env.zmpPayment.privateKey)
    .update(data)
    .digest("hex");
}

// https://docs.zaloplatforms.com/docs/MA/checkoutSdk/apis/createOrder
// Dữ liệu ký mac: sắp xếp key theo bảng chữ cái, nối "key=value" bằng "&",
// giá trị dạng object/array phải JSON.stringify trước khi nối chuỗi.
export function signCreateOrder(params: {
  amount: number;
  desc: string;
  item: unknown[];
  extradata?: unknown;
  method?: unknown;
}) {
  const payload: Record<string, string> = {
    amount: String(params.amount),
    desc: params.desc,
    item: JSON.stringify(params.item),
  };

  if (params.extradata !== undefined) {
    payload.extradata =
      typeof params.extradata === "object"
        ? JSON.stringify(params.extradata)
        : String(params.extradata);
  }

  if (params.method !== undefined) {
    payload.method =
      typeof params.method === "object"
        ? JSON.stringify(params.method)
        : String(params.method);
  }

  const dataMac = Object.keys(payload)
    .sort()
    .map((key) => `${key}=${payload[key]}`)
    .join("&");

  return hmac(dataMac);
}

// https://docs.zaloplatforms.com/docs/MA/checkoutSdk/webhooks/callback
// "mac": thứ tự field CỐ ĐỊNH (không sort), khác với "overallMac".
export function verifyCallbackMac(
  data: Record<string, unknown>,
  mac: string,
) {
  const dataForMac = [
    `appId=${data.appId}`,
    `amount=${data.amount}`,
    `description=${data.description}`,
    `orderId=${data.orderId}`,
    `message=${data.message}`,
    `resultCode=${data.resultCode}`,
    `transId=${data.transId}`,
  ].join("&");

  return hmac(dataForMac) === mac;
}

// "overallMac": sort toàn bộ key trong "data" theo bảng chữ cái rồi ký,
// giống thuật toán của createOrder's mac.
export function verifyOverallMac(
  data: Record<string, unknown>,
  overallMac: string,
) {
  const dataOverallMac = Object.keys(data)
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join("&");

  return hmac(dataOverallMac) === overallMac;
}
