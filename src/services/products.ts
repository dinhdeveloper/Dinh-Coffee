import { apiGet } from "@/services/api";

export type Product = {
  id: string;
  title: string;
  price: string;
  image: string;
  category: string;
  rating: string;
  reviews: string;
  description: string;
  purchaseCount: number;
};

type ProductsResponse = { data: Product[] };
type ProductResponse = { data: Product };

export function fetchProducts(params?: { q?: string; category?: string }) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.category) search.set("category", params.category);
  const query = search.toString();

  return apiGet<ProductsResponse>(
    `/products${query ? `?${query}` : ""}`,
  ).then((res) => res.data);
}

export function fetchProductById(id: string) {
  return apiGet<ProductResponse>(`/products/${id}`).then((res) => res.data);
}
