import { prisma } from "@/lib/prisma";
import { getReviewSummaries } from "@/data/reviews.store";

export type FeatureCard = {
  id: string;
  title: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  price?: string;
  avatar: string;
  image: string;
  thumbnail?: string;
  productId?: string;
  purchaseCount: number;
};

export async function listFeatureCards(): Promise<FeatureCard[]> {
  const rows = await prisma.featureCard.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  const productIds = rows
    .map((row) => row.productId)
    .filter((id): id is string => Boolean(id));
  const summaries = await getReviewSummaries(productIds);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    location: row.location ?? undefined,
    rating: row.rating ?? undefined,
    reviewCount: row.productId ? summaries[row.productId]?.count : undefined,
    price: row.price ?? undefined,
    avatar: row.avatar,
    image: row.image,
    thumbnail: row.thumbnail ?? undefined,
    productId: row.productId ?? undefined,
    purchaseCount: row.purchaseCount,
  }));
}
