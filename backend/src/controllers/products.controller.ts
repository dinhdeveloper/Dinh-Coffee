import { Request, Response } from "express";
import { prisma } from "@/lib/prisma";
import { getPurchaseCount, getPurchaseCounts } from "@/data/product-stats.store";
import { getReviewSummaries, getReviewSummary } from "@/data/reviews.store";
import { Product, ProductCustomization, ProductSize } from "@/types/product";

type ProductRow = Awaited<ReturnType<typeof prisma.product.findMany>>[number] & {
  category: { name: string } | null;
};

function toProduct(row: ProductRow): Omit<Product, "purchaseCount"> {
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

// Gộp số liệu thật (đã bán bao nhiêu, điểm đánh giá trung bình từ Review
// thật) vào sản phẩm lấy từ DB — nếu sản phẩm chưa có đơn/đánh giá thật nào
// thì vẫn giữ nguyên rating/reviewsCount mặc định trong DB.
async function withLiveStats(product: Omit<Product, "purchaseCount">): Promise<Product> {
  const [purchaseCount, summary] = await Promise.all([
    getPurchaseCount(product.id),
    getReviewSummary(product.id),
  ]);

  return {
    ...product,
    purchaseCount,
    rating: summary.count > 0 ? summary.average : product.rating,
    reviewsCount: summary.count > 0 ? summary.count : product.reviewsCount,
  };
}

export async function listProducts(req: Request, res: Response) {
  const { category, categoryId, q } = req.query;

  const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(typeof categoryId === "string" && categoryId.trim()
        ? { categoryId }
        : {}),
      ...(typeof category === "string" && category.trim()
        ? { category: { name: category } }
        : {}),
      ...(typeof q === "string" && q.trim()
        ? { title: { contains: q.trim(), mode: "insensitive" } }
        : {}),
    },
    include: { category: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const ids = rows.map((row) => row.id);
  const [purchaseCounts, summaries] = await Promise.all([
    getPurchaseCounts(ids),
    getReviewSummaries(ids),
  ]);

  const data = rows.map((row) => {
    const product = toProduct(row as ProductRow);
    const summary = summaries[product.id];
    return {
      ...product,
      purchaseCount: purchaseCounts[product.id] ?? 0,
      rating: summary && summary.count > 0 ? summary.average : product.rating,
      reviewsCount: summary && summary.count > 0 ? summary.count : product.reviewsCount,
    };
  });

  res.json({ data });
}

export async function getProduct(req: Request, res: Response) {
  const row = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { category: { select: { name: true } } },
  });

  if (!row || !row.isActive) {
    res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    return;
  }

  res.json({ data: await withLiveStats(toProduct(row as ProductRow)) });
}
