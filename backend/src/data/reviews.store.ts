import { prisma } from "@/lib/prisma";

export type Review = {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment?: string;
  createdAt: number;
};

function toReview(row: {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}): Review {
  return {
    id: row.id,
    productId: row.productId,
    userId: row.userId,
    userName: row.userName,
    rating: row.rating,
    comment: row.comment ?? undefined,
    createdAt: row.createdAt.getTime(),
  };
}

export async function listReviews(productId: string): Promise<Review[]> {
  const rows = await prisma.review.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
  });

  return rows.map(toReview);
}

export async function getReviewSummary(
  productId: string,
): Promise<{ average: number; count: number }> {
  const aggregate = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: true,
  });

  return {
    average: aggregate._avg.rating ?? 0,
    count: aggregate._count,
  };
}

export async function getReviewSummaries(
  productIds: string[],
): Promise<Record<string, { average: number; count: number }>> {
  if (productIds.length === 0) return {};

  const grouped = await prisma.review.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds } },
    _avg: { rating: true },
    _count: true,
  });

  return Object.fromEntries(
    grouped.map((row) => [
      row.productId,
      { average: row._avg.rating ?? 0, count: row._count },
    ]),
  );
}

export async function createReview(input: {
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment?: string;
}): Promise<Review> {
  const row = await prisma.review.create({
    data: {
      productId: input.productId,
      userId: input.userId,
      userName: input.userName,
      rating: input.rating,
      comment: input.comment,
    },
  });

  return toReview(row);
}
