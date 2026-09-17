import { apiGet } from "@/services/api";

// Story 24h kiểu Instagram/Zalo — chỉ những story chưa hết hạn (expiresAt >
// hiện tại) mới được backend trả về, tự "biến mất" sau 1 ngày.
export type StoreStory = {
  id: string;
  title: string;
  location?: string;
  rating?: number;
  price?: string;
  avatar: string;
  image: string;
  thumbnail?: string;
  productId?: string;
  purchaseCount: number;
  createdAt: number;
  expiresAt: number;
};

type StoriesResponse = { data: StoreStory[] };

export function fetchStories() {
  return apiGet<StoriesResponse>("/stories").then((res) => res.data);
}
