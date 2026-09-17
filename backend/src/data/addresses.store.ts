import { prisma } from "@/lib/prisma";

export type Address = {
  id: string;
  userId: string;
  receiver: string;
  phone: string;
  detail: string;
  note?: string;
  isDefault: boolean;
};

function toAddress(row: {
  id: string;
  userId: string;
  receiver: string;
  phone: string;
  detail: string;
  note: string | null;
  isDefault: boolean;
}): Address {
  return {
    id: row.id,
    userId: row.userId,
    receiver: row.receiver,
    phone: row.phone,
    detail: row.detail,
    note: row.note ?? undefined,
    isDefault: row.isDefault,
  };
}

export async function listAddresses(userId: string): Promise<Address[]> {
  const rows = await prisma.address.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return rows.map(toAddress);
}

// Chỉ 1 địa chỉ được là mặc định tại 1 thời điểm — bỏ cờ isDefault ở các địa
// chỉ khác của cùng user trước khi đặt cho địa chỉ mới.
async function clearDefault(userId: string) {
  await prisma.address.updateMany({
    where: { userId, isDefault: true },
    data: { isDefault: false },
  });
}

export async function createAddress(input: {
  userId: string;
  receiver: string;
  phone: string;
  detail: string;
  note?: string;
}): Promise<Address> {
  const existingCount = await prisma.address.count({
    where: { userId: input.userId },
  });
  const isFirst = existingCount === 0;

  const row = await prisma.address.create({
    data: { ...input, isDefault: isFirst },
  });

  return toAddress(row);
}

export async function updateAddress(
  id: string,
  userId: string,
  input: { receiver: string; phone: string; detail: string; note?: string },
): Promise<Address | null> {
  const result = await prisma.address.updateMany({
    where: { id, userId },
    data: input,
  });

  if (result.count === 0) return null;

  const row = await prisma.address.findUnique({ where: { id } });
  return row ? toAddress(row) : null;
}

export async function deleteAddress(id: string, userId: string): Promise<boolean> {
  const address = await prisma.address.findUnique({ where: { id } });
  if (!address || address.userId !== userId) return false;

  await prisma.address.delete({ where: { id } });

  // Nếu vừa xoá địa chỉ mặc định, chọn 1 địa chỉ khác (nếu còn) làm mặc định.
  if (address.isDefault) {
    const next = await prisma.address.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await prisma.address.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  return true;
}

export async function setDefaultAddress(
  id: string,
  userId: string,
): Promise<Address | null> {
  const address = await prisma.address.findUnique({ where: { id } });
  if (!address || address.userId !== userId) return null;

  await clearDefault(userId);
  const row = await prisma.address.update({
    where: { id },
    data: { isDefault: true },
  });

  return toAddress(row);
}
