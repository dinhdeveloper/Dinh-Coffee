import { apiGet } from "@/services/api";

export type Promotion = {
  id: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  image: string | null;
  linkType: "story" | "product" | "category" | "url" | "none";
  linkValue: string | null;
  startAt: number | null;
  endAt: number | null;
  createdAt: number;
};

type PromotionsResponse = { data: Promotion[] };
type PromotionResponse = { data: Promotion };

export function fetchPromotions() {
  return apiGet<PromotionsResponse>("/promotions").then((res) => res.data);
}

export function fetchPromotion(id: string) {
  return apiGet<PromotionResponse>(`/promotions/${id}`).then((res) => res.data);
}
