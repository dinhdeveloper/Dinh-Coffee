import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  zalopay: {
    // Fallback values are ZaloPay's own public sandbox demo credentials
    // (from the official zalopay-samples/quickstart-payment-gateway repo,
    // still active). Replace with your real merchant app_id/key1/key2
    // before going to production.
    appId: process.env.ZALOPAY_APP_ID ?? "15847",
    key1: process.env.ZALOPAY_KEY1 ?? "0U93tRzdWEkMLVNYH90aBu5ca0Psql8T",
    key2: process.env.ZALOPAY_KEY2 ?? "PurTcToVhvUt7vR2jO6He4lh3nfNEiks",
    endpoint: process.env.ZALOPAY_ENDPOINT ?? "https://sb-openapi.zalopay.vn/v2/",
    callbackUrl:
      process.env.ZALOPAY_CALLBACK_URL ??
      `http://localhost:${process.env.PORT ?? 4000}/api/payments/zalopay/callback`,
    redirectUrl: process.env.ZALOPAY_REDIRECT_URL ?? "http://localhost:3000/cart",
  },
  // Private key cấp riêng cho Mini App khi bật tính năng Payment trong
  // trang quản trị Mini App (khác với key1/key2 của ZaloPay ở trên).
  // Dùng để ký "mac" cho zmp-sdk's createOrder() (Checkout SDK).
  zmpPayment: {
    privateKey: process.env.ZMP_PAYMENT_PRIVATE_KEY ?? "",
  },
  // Quy đổi điểm thưởng: số VNĐ tương ứng 1 điểm.
  pointsPerVnd: Number(process.env.POINTS_PER_VND ?? 10000),
  // Giá trị quy đổi khi TIÊU điểm thưởng thành giảm giá — mặc định 100đ/điểm
  // (100 điểm = giảm 10.000đ), tách riêng khỏi tỉ lệ TÍCH điểm ở trên.
  pointsRedeemValueVnd: Number(process.env.POINTS_REDEEM_VALUE_VND ?? 100),
  // "Khoá bí mật của Zalo App" tại developers.zalo.me (KHÁC với key1/key2
  // của ZaloPay và ZMP_PAYMENT_PRIVATE_KEY) — dùng để đổi token của
  // getPhoneNumber() (zmp-sdk) thành số điện thoại thật qua graph.zalo.me.
  zaloAppSecretKey: process.env.ZALO_APP_SECRET_KEY ?? "",
};
