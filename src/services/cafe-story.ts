import { apiGet } from "@/services/api";

export type CafeStory = {
  id: string;
  title: string;
  content: string;
  publishedAt: number;
};

type CafeStoryResponse = { data: CafeStory };

export function fetchCafeStory() {
  return apiGet<CafeStoryResponse>("/cafe-story").then((res) => res.data);
}
