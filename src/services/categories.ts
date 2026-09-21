import { apiGet } from "@/services/api";

export type Category = {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  imageUrl: string;
  sortOrder: number;
};

type CategoriesResponse = { data: Category[] };

export function fetchCategories() {
  return apiGet<CategoriesResponse>("/categories").then((res) => res.data);
}
