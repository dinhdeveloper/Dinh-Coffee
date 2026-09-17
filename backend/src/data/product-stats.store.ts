import { prisma } from "@/lib/prisma";

export async function incrementPurchaseCount(productId: string, quantity: number) {
  if (!productId || quantity <= 0) return;

  await prisma.productStat.upsert({
    where: { productId },
    create: { productId, purchaseCount: quantity },
    update: { purchaseCount: { increment: quantity } },
  });
}

export async function getPurchaseCounts(
  productIds: string[],
): Promise<Record<string, number>> {
  if (productIds.length === 0) return {};

  const rows = await prisma.productStat.findMany({
    where: { productId: { in: productIds } },
  });

  return Object.fromEntries(rows.map((row) => [row.productId, row.purchaseCount]));
}

export async function getPurchaseCount(productId: string): Promise<number> {
  const row = await prisma.productStat.findUnique({ where: { productId } });
  return row?.purchaseCount ?? 0;
}
