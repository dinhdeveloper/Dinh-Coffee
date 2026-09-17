import { Request, Response } from "express";
import { products } from "@/data/products.data";
import { getPurchaseCount, getPurchaseCounts } from "@/data/product-stats.store";
import { getReviewSummaries, getReviewSummary } from "@/data/reviews.store";
import { Product } from "@/types/product";

// Gộp số liệu thật (đã bán bao nhiêu, điểm đánh giá trung bình từ Review
// thật) vào sản phẩm tĩnh — nếu sản phẩm chưa có đơn/đánh giá thật nào thì
// vẫn giữ nguyên rating/reviews mặc định khai báo sẵn trong products.data.ts
// để trang không bị trống trơn lúc mới deploy.
async function withLiveStats(product: Product) {
  const [purchaseCount, summary] = await Promise.all([
    getPurchaseCount(product.id),
    getReviewSummary(product.id),
  ]);

  return {
    ...product,
    purchaseCount,
    rating: summary.count > 0 ? summary.average.toFixed(1) : product.rating,
    reviews: summary.count > 0 ? String(summary.count) : product.reviews,
  };
}

export async function listProducts(req: Request, res: Response) {
  const { category, q } = req.query;

  let result = products;

  if (typeof category === "string" && category.trim()) {
    result = result.filter((product) => product.category === category);
  }

  if (typeof q === "string" && q.trim()) {
    const keyword = q.trim().toLowerCase();
    result = result.filter((product) =>
      product.title.toLowerCase().includes(keyword),
    );
  }

  const ids = result.map((product) => product.id);
  const [purchaseCounts, summaries] = await Promise.all([
    getPurchaseCounts(ids),
    getReviewSummaries(ids),
  ]);

  const data = result.map((product) => {
    const summary = summaries[product.id];
    return {
      ...product,
      purchaseCount: purchaseCounts[product.id] ?? 0,
      rating: summary && summary.count > 0 ? summary.average.toFixed(1) : product.rating,
      reviews: summary && summary.count > 0 ? String(summary.count) : product.reviews,
    };
  });

  res.json({ data });
}

export async function getProduct(req: Request, res: Response) {
  const product = products.find((item) => item.id === req.params.id);

  if (!product) {
    res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    return;
  }

  res.json({ data: await withLiveStats(product) });
}
