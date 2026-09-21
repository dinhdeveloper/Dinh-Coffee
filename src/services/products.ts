import { apiGet } from "@/services/api";

export type ProductSize = {
  code: string;
  label: string;
  volumeMl: number | null;
  price: number;
};

export type CustomizationType = "single" | "multi" | "toggle";

export type ProductCustomization = {
  name: string;
  type: CustomizationType;
  options?: string[];
  priceDelta?: number;
};

export type Product = {
  id: string;
  title: string;
  titleEn?: string | null;
  price: number;
  image: string;
  categoryId: string | null;
  category?: string;
  sizes: ProductSize[];
  customizations: ProductCustomization[];
  nutrition: Record<string, number> | null;
  allergens: string[];
  tags: string[];
  rating: number;
  reviewsCount: number;
  description: string;
  isActive: boolean;
  purchaseCount: number;
};

type ProductsResponse = { data: Product[] };
type ProductResponse = { data: Product };

export function fetchProducts(params?: { q?: string; categoryId?: string; category?: string }) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.categoryId) search.set("categoryId", params.categoryId);
  if (params?.category) search.set("category", params.category);
  const query = search.toString();

  return apiGet<ProductsResponse>(
    `/products${query ? `?${query}` : ""}`,
  ).then((res) => res.data);
}

export function fetchProductById(id: string) {
  return apiGet<ProductResponse>(`/products/${id}`).then((res) => res.data);
}

export function formatPrice(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}
