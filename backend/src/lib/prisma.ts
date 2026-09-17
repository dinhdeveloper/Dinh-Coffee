import { PrismaClient } from "@prisma/client";

// tsx watch / nodemon reload module trong dev có thể tạo nhiều PrismaClient
// nếu không cache lại trên global — mỗi client giữ 1 connection pool riêng.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
