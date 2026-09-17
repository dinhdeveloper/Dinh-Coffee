# Lệnh hay dùng (backend)

Chạy tất cả lệnh dưới đây từ thư mục `backend/`:

```bash
cd /Users/DinhTC/Documents/DinhTC/ZaloMini/dinhtc/backend
```

## Xem dữ liệu trong DB (giao diện web)

```bash
npx prisma studio
```

Mở trình duyệt tại `http://localhost:5555`, xem/sửa trực tiếp mọi bảng (users, orders, addresses, notifications, cafe_stories, store_stories, reviews, product_stats...). Dùng `DATABASE_URL` trong `backend/.env` — mặc định là DB thật trên Render, không phải DB giả lập.

## Đổ dữ liệu mẫu ban đầu (seed)

```bash
npm run db:seed
```

Chỉ thêm dữ liệu nếu bảng đang trống (an toàn, không ghi đè/xoá dữ liệu thật đã có). Cần chạy lại nếu muốn làm mới story 24h (`store_stories`) sau khi đã hết hạn.

## Đồng bộ schema Prisma lên DB thật

```bash
npx prisma db push
```

Áp dụng thay đổi trong `prisma/schema.prisma` (thêm bảng/cột mới) lên DB thật. Bản deploy trên Render tự chạy lệnh này mỗi lần khởi động (xem script `start` trong `package.json`), nên bình thường không cần chạy tay — chỉ cần khi muốn đồng bộ ngay từ máy local trước khi deploy.

## Sinh lại Prisma Client (sau khi đổi schema)

```bash
npx prisma generate
```

## Chạy server dev (auto reload)

```bash
npm run dev
```

Chạy tại `http://localhost:4000`.

## Kiểm tra kiểu dữ liệu (TypeScript)

```bash
npm run typecheck
```

## Build & chạy bản production

```bash
npm run build
npm start
```
