import { env } from "@/config/env";

type ZaloPhoneNumberResponse = {
  data?: { number?: string };
  error: number;
  message: string;
};

// Đổi "code" (token trả về từ zmp-sdk's getPhoneNumber()) thành số điện
// thoại thật, theo hướng dẫn chính thức của Zalo:
// https://docs.zaloplatforms.com/docs/MA/api/user/user-information/getPhoneNumber
// Token chỉ dùng được 1 lần và hết hạn sau 2 phút.
export async function resolvePhoneNumber(
  accessToken: string,
  code: string,
): Promise<string> {
  if (!env.zaloAppSecretKey) {
    throw new Error(
      "ZALO_APP_SECRET_KEY chưa được cấu hình — lấy 'Khoá bí mật' của Mini App tại developers.zalo.me",
    );
  }

  const res = await fetch("https://graph.zalo.me/v2.0/me/info", {
    method: "GET",
    headers: {
      access_token: accessToken,
      code,
      secret_key: env.zaloAppSecretKey,
    },
  });

  const result = (await res.json()) as ZaloPhoneNumberResponse;

  if (result.error !== 0 || !result.data?.number) {
    throw new Error(result.message || "Không lấy được số điện thoại từ Zalo");
  }

  return result.data.number;
}
