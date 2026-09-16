# BoomBerry Backend

API cho mini app BoomBerry, dùng Node.js + Express + TypeScript.

## Chạy dự án

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Server mặc định chạy tại `http://localhost:4000`.

## Cấu trúc

```
src/
  config/       # đọc biến môi trường
  controllers/  # xử lý logic cho từng route
  data/         # dữ liệu mock (thay bằng database khi cần)
  middlewares/  # error handler, 404 handler
  routes/       # khai báo endpoint
  types/        # type dùng chung
  app.ts        # khởi tạo express app
  index.ts      # entry point
```

## API

### Products

| Method | Endpoint             | Mô tả                                  |
| ------ | --------------------- | --------------------------------------- |
| GET    | `/api/products`       | Danh sách sản phẩm (query: `q`, `category`) |
| GET    | `/api/products/:id`   | Chi tiết 1 sản phẩm                     |

### Notifications

| Method | Endpoint                        | Mô tả                     |
| ------ | -------------------------------- | -------------------------- |
| GET    | `/api/notifications`             | Danh sách thông báo        |
| PATCH  | `/api/notifications/:id/read`    | Đánh dấu 1 thông báo đã đọc |
| PATCH  | `/api/notifications/read-all`    | Đánh dấu tất cả đã đọc      |
| DELETE | `/api/notifications/:id`         | Xóa 1 thông báo             |

### Properties (cửa hàng nổi bật)

| Method | Endpoint              | Mô tả              |
| ------ | ---------------------- | ------------------- |
| GET    | `/api/properties`      | Danh sách cửa hàng   |
| GET    | `/api/properties/:id`  | Chi tiết 1 cửa hàng  |

### Orders & thanh toán ZaloPay

| Method | Endpoint                  | Mô tả                                                        |
| ------ | -------------------------- | -------------------------------------------------------------- |
| POST   | `/api/orders`               | Tạo đơn + tạo yêu cầu thanh toán ZaloPay, trả về `orderUrl`     |
| GET    | `/api/orders/:id/status`    | Kiểm tra trạng thái đơn (tự query ZaloPay nếu còn `pending`)    |
| POST   | `/api/payments/zalopay/callback` | ZaloPay gọi vào khi thanh toán thành công (cần URL public) |

### Users

| Method | Endpoint          | Mô tả                                    |
| ------ | ------------------ | ------------------------------------------ |
| POST   | `/api/users/sync`  | Lưu/cập nhật thông tin user sau khi đăng nhập Zalo |
| GET    | `/api/users/:id`   | Lấy thông tin 1 user                        |

## Scripts

- `npm run dev` — chạy dev server (auto reload)
- `npm run build` — build ra `dist/`
- `npm start` — chạy bản build
- `npm run typecheck` — kiểm tra kiểu dữ liệu

## Deploy lên Render (free tier)

Repo đã có sẵn [`render.yaml`](../render.yaml) ở thư mục gốc để Render tự nhận cấu hình (Blueprint).

1. Đẩy code lên GitHub (tạo repo mới trên github.com, rồi):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <URL_repo_github_cua_ban>
   git push -u origin main
   ```
2. Vào [render.com](https://render.com) → đăng nhập bằng GitHub → **New +** → **Blueprint** → chọn repo vừa push. Render tự đọc `render.yaml` và tạo web service `boomberry-backend` (root directory `backend/`).
3. Đợi build/deploy xong, Render cấp cho bạn 1 URL dạng `https://boomberry-backend.onrender.com`.
4. Cập nhật lại 2 biến môi trường trên dashboard Render cho đúng URL thật vừa được cấp:
   - `ZALOPAY_CALLBACK_URL` = `https://<ten-service>.onrender.com/api/payments/zalopay/callback`
   - `ZALOPAY_REDIRECT_URL` = URL trang `/cart` của mini app (hoặc để nguyên nếu chưa deploy mobile)
5. Ở phía mobile, đổi `VITE_API_BASE_URL` trong `.env` (root repo) thành `https://<ten-service>.onrender.com/api` rồi build lại app.

Lưu ý: free tier của Render sẽ "ngủ" sau ~15 phút không có request, lần gọi đầu tiên sau đó sẽ chậm hơn (cold start ~30-50s) — đủ dùng để test, nhưng nếu cần phản hồi nhanh ổn định thì nên nâng lên gói trả phí.
