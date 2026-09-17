import { Request, Response } from "express";
import { createReview, getReviewSummary, listReviews } from "@/data/reviews.store";

export async function getProductReviews(req: Request, res: Response) {
  const productId = req.params.id;

  const [reviews, summary] = await Promise.all([
    listReviews(productId),
    getReviewSummary(productId),
  ]);

  res.json({ data: { reviews, summary } });
}

export async function postProductReview(req: Request, res: Response) {
  const productId = req.params.id;
  const body = req.body as {
    userId?: string;
    userName?: string;
    rating?: number;
    comment?: string;
  };

  if (!body.userId || !body.userName) {
    res.status(400).json({ message: "Vui lòng đăng nhập Zalo để đánh giá" });
    return;
  }

  const rating = Math.round(Number(body.rating));
  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ message: "Số sao đánh giá phải từ 1 đến 5" });
    return;
  }

  const review = await createReview({
    productId,
    userId: body.userId,
    userName: body.userName,
    rating,
    comment: body.comment?.trim() || undefined,
  });

  res.json({ data: review });
}
