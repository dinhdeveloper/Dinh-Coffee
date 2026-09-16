import crypto from "crypto";
import { env } from "@/config/env";

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

  return crypto
    .createHmac("sha256", env.zmpPayment.privateKey)
    .update(dataMac)
    .digest("hex");
}
