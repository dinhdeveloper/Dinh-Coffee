# Checklist thanh toán ZaloPay

## Đã xong (sandbox, test thành công trên máy thật)

- [x] Backend tạo đơn qua ZaloPay Payment Gateway (`POST /api/orders` → `lib/zalopay.ts` → `sb-openapi.zalopay.vn/v2/create`)
- [x] Mobile mở trang thanh toán bằng `openWebview({ style: "bottomSheet" })` (`src/pages/cart.tsx`)
- [x] Lắng nghe sự kiện `WebviewClosed` → gọi `fetchOrderStatus()` poll trạng thái đơn (`GET /api/orders/:id/status`, tự query ZaloPay nếu còn "pending")
- [x] `embed_data.redirecturl` trỏ về `https://zalo.me/s/<APP_ID>/` → ZaloPay tự đóng bottom sheet và quay về Mini App sau khi thanh toán xong (không cần đóng 2 lần)
- [x] Domain `dinh-coffee.onrender.com` đã whitelist trong Zalo Developers
- [x] Test thành công trên iPhone thật, thanh toán sandbox ZaloPay

## Cần làm trước khi lên thật (tiền thật)

- [ ] **Đăng ký merchant ZaloPay thật** tại [Merchant Portal](https://mc.zalopay.vn) (KYC/hồ sơ doanh nghiệp) để lấy `app_id`, `key1`, `key2` thật
- [ ] Cập nhật 3 biến trên **Render Dashboard** (service `dinh-coffee` → Environment), KHÔNG sửa trong code:
  - `ZALOPAY_APP_ID`
  - `ZALOPAY_KEY1`
  - `ZALOPAY_KEY2`
- [ ] Đổi `ZALOPAY_ENDPOINT` từ sandbox `https://sb-openapi.zalopay.vn/v2/` sang production `https://openapi.zalopay.vn/v2/`
- [ ] Cấu hình **Callback URL** thật (`ZALOPAY_CALLBACK_URL`) trên Merchant Portal của ZaloPay, trỏ về `https://dinh-coffee.onrender.com/api/payments/zalopay/callback` — test nhận webhook thật (hiện tại app hoạt động được là nhờ polling chủ động, chưa xác nhận webhook đã từng nhận thành công)
- [ ] Xác nhận lại `ZALOPAY_REDIRECT_URL` vẫn đúng nếu Mini App đổi `APP_ID` hoặc domain publish

## Hạ tầng / độ tin cậy

- [ ] Thay `backend/src/data/orders.store.ts` (đang lưu trong RAM, mất hết khi restart server) bằng database thật (Postgres/MongoDB...)
- [ ] Nâng cấp Render lên gói trả phí hoặc thêm uptime-ping để tránh cold start (~30-50s) làm timeout lần thanh toán đầu tiên
- [ ] Giới hạn lại `CORS_ORIGIN` (đang để `*`) về đúng domain Mini App khi lên production
- [ ] Rà lại toàn bộ `.env`/biến môi trường, đảm bảo không commit key thật vào git

## UX / xử lý lỗi

- [ ] Ẩn bớt chi tiết lỗi kỹ thuật (`describeError` hiện in nguyên `code`/`message` từ SDK ra màn hình) — chỉ nên hiện cho môi trường dev/debug, sản phẩm thật nên hiện thông báo thân thiện hơn
- [ ] Test các trường hợp: người dùng huỷ thanh toán giữa chừng, mất mạng khi đang chờ, hết thời gian chờ poll (5 phút), đặt hàng trùng lặp
- [ ] Test trên cả Android lẫn iOS (hiện mới test iOS)

## Dọn dẹp (tuỳ chọn)

- [ ] Quyết định giữ hay xoá luồng Checkout SDK cũ chưa dùng (`ZMP_PAYMENT_PRIVATE_KEY`, `POST /orders/mac`, `POST /orders/:id/link`, `src/services/orders.ts: prepareZaloOrder/linkCheckoutOrder`) — nếu chắc chắn không dùng thì xoá cho gọn code
- [ ] Nếu sau này thật sự cần `openOutApp` (mở hẳn app ZaloPay ngoài thay vì webview), phải xin cấp quyền API này với Zalo (hiện đang bị chặn: `code -1403`)
