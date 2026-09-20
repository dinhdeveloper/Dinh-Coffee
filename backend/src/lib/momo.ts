import crypto from "crypto";
import { env } from "@/config/env";

// Đơn MoMo dùng id có tiền tố này để getOrderStatus biết phải query cổng nào
// (ZaloPay hay MoMo) mà không cần thêm cột vào database.
export const MOMO_ORDER_PREFIX = "MM";

export function isMomoOrderId(orderId: string) {
  return orderId.startsWith(MOMO_ORDER_PREFIX);
}

function sign(raw: string) {
  return crypto
    .createHmac("sha256", env.momo.secretKey)
    .update(raw)
    .digest("hex");
}

export type MomoCreateOrderParams = {
  orderId: string;
  amount: number;
  orderInfo: string;
};

export type MomoCreateOrderResult = {
  resultCode: number; // 0 = tạo thành công
  message: string;
  payUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
};

// https://developers.momo.vn/v3/docs/payment/api/wallet/onetime
export async function createMomoOrder(
  params: MomoCreateOrderParams,
): Promise<MomoCreateOrderResult> {
  const { partnerCode, accessKey, redirectUrl, ipnUrl } = env.momo;
  const requestId = `${params.orderId}_${Date.now()}`;
  const requestType = "captureWallet";
  const extraData = "";

  // Các trường phải xếp theo thứ tự alphabet khi ký.
  const rawSignature = [
    `accessKey=${accessKey}`,
    `amount=${params.amount}`,
    `extraData=${extraData}`,
    `ipnUrl=${ipnUrl}`,
    `orderId=${params.orderId}`,
    `orderInfo=${params.orderInfo}`,
    `partnerCode=${partnerCode}`,
    `redirectUrl=${redirectUrl}`,
    `requestId=${requestId}`,
    `requestType=${requestType}`,
  ].join("&");

  const res = await fetch(`${env.momo.endpoint}create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      partnerCode,
      requestId,
      amount: params.amount,
      orderId: params.orderId,
      orderInfo: params.orderInfo,
      redirectUrl,
      ipnUrl,
      requestType,
      extraData,
      lang: "vi",
      signature: sign(rawSignature),
    }),
  });

  return res.json() as Promise<MomoCreateOrderResult>;
}

export type MomoQueryResult = {
  resultCode: number; // 0 = đã thanh toán
  message: string;
  amount?: number;
};

export async function queryMomoOrder(orderId: string): Promise<MomoQueryResult> {
  const { partnerCode, accessKey } = env.momo;
  const requestId = `${orderId}_${Date.now()}`;

  const rawSignature = [
    `accessKey=${accessKey}`,
    `orderId=${orderId}`,
    `partnerCode=${partnerCode}`,
    `requestId=${requestId}`,
  ].join("&");

  const res = await fetch(`${env.momo.endpoint}query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      partnerCode,
      requestId,
      orderId,
      lang: "vi",
      signature: sign(rawSignature),
    }),
  });

  return res.json() as Promise<MomoQueryResult>;
}

// Mã kết quả MoMo còn đang xử lý (khách chưa thanh toán xong) — không được
// coi là thất bại, vì polling có thể chạy khi khách vẫn đang ở app MoMo.
// https://developers.momo.vn/v3/docs/payment/api/result-handling/resultcode
const MOMO_PENDING_CODES = [1000, 7000, 7002, 9000];

export function momoResultToStatus(resultCode: number): "paid" | "pending" | "failed" {
  if (resultCode === 0) return "paid";
  if (MOMO_PENDING_CODES.includes(resultCode)) return "pending";
  return "failed";
}

export type MomoIpnBody = {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: number;
  resultCode: number;
  message: string;
  payType: string;
  responseTime: number;
  extraData: string;
  signature: string;
};

export function verifyMomoIpnSignature(body: MomoIpnBody) {
  const rawSignature = [
    `accessKey=${env.momo.accessKey}`,
    `amount=${body.amount}`,
    `extraData=${body.extraData}`,
    `message=${body.message}`,
    `orderId=${body.orderId}`,
    `orderInfo=${body.orderInfo}`,
    `orderType=${body.orderType}`,
    `partnerCode=${body.partnerCode}`,
    `payType=${body.payType}`,
    `requestId=${body.requestId}`,
    `responseTime=${body.responseTime}`,
    `resultCode=${body.resultCode}`,
    `transId=${body.transId}`,
  ].join("&");

  const expected = Buffer.from(sign(rawSignature));
  const actual = Buffer.from(String(body.signature ?? ""));
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
