// Truy vấn catalog (category/product) dùng chung cho orders.controller
// (tính lại giá khi checkout) và assistant.ts (menu cho AI) — tách riêng để
// không phụ thuộc lẫn nhau vào products.controller.
import { prisma } from "@/lib/prisma";
import { Product, ProductCustomization, ProductSize } from "@/types/product";

export async function getProductById(id: string): Promise<Product | undefined> {
  const row = await prisma.product.findUnique({
    where: { id },
    include: { category: { select: { name: true } } },
  });

  if (!row || !row.isActive) return undefined;

  return {
    id: row.id,
    title: row.title,
    titleEn: row.titleEn,
    price: row.price,
    image: row.image,
    categoryId: row.categoryId,
    category: row.category?.name,
    sizes: row.sizes as unknown as ProductSize[],
    customizations: row.customizations as unknown as ProductCustomization[],
    nutrition: row.nutrition as Record<string, number> | null,
    allergens: row.allergens,
    tags: row.tags,
    rating: row.rating,
    reviewsCount: row.reviewsCount,
    description: row.description,
    isActive: row.isActive,
  };
}

export async function listActiveProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    titleEn: row.titleEn,
    price: row.price,
    image: row.image,
    categoryId: row.categoryId,
    category: row.category?.name,
    sizes: row.sizes as unknown as ProductSize[],
    customizations: row.customizations as unknown as ProductCustomization[],
    nutrition: row.nutrition as Record<string, number> | null,
    allergens: row.allergens,
    tags: row.tags,
    rating: row.rating,
    reviewsCount: row.reviewsCount,
    description: row.description,
    isActive: row.isActive,
  }));
}
