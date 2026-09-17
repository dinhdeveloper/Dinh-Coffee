import { apiGet, apiPost } from "@/services/api";

export type Review = {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment?: string;
  createdAt: number;
};

export type ReviewSummary = { average: number; count: number };

type ReviewsResponse = { data: { reviews: Review[]; summary: ReviewSummary } };
type ReviewResponse = { data: Review };

export function fetchProductReviews(productId: string) {
  return apiGet<ReviewsResponse>(`/products/${productId}/reviews`).then(
    (res) => res.data,
  );
}

export function createProductReview(
  productId: string,
  input: { userId: string; userName: string; rating: number; comment?: string },
) {
  return apiPost<ReviewResponse>(`/products/${productId}/reviews`, input).then(
    (res) => res.data,
  );
}
