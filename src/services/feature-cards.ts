import { apiGet } from "@/services/api";

// Thẻ nổi bật ở trang chủ — dữ liệu riêng, không phụ thuộc story 24h của cửa hàng.
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

type FeatureCardsResponse = { data: FeatureCard[] };

export function fetchFeatureCards() {
  return apiGet<FeatureCardsResponse>("/feature-cards").then((res) => res.data);
}
