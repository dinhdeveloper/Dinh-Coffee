import { apiGet } from "@/services/api";

export type Property = {
  id: string;
  productId: string;
  title: string;
  location: string;
  rating: string;
  price: string;
  joiningPercent: string;
  image: string;
  thumbnail: string;
  avatars: string[];
};

type PropertiesResponse = { data: Property[] };

export function fetchProperties() {
  return apiGet<PropertiesResponse>("/properties").then((res) => res.data);
}
