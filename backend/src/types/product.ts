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
  options?: string[]; // "single" | "multi"
  priceDelta?: number; // "toggle": áp dụng khi bật; "multi": áp dụng theo từng lựa chọn
};

export type Product = {
  id: string;
  title: string;
  titleEn?: string | null;
  price: number;
  image: string;
  categoryId: string | null;
  category?: string; // tên tiếng Việt danh mục, gắn thêm ở tầng controller
  sizes: ProductSize[];
  customizations: ProductCustomization[];
  nutrition: Record<string, number> | null;
  allergens: string[];
  tags: string[];
  rating: number;
  reviewsCount: number;
  description: string;
  isActive: boolean;
  purchaseCount?: number;
};

// Lựa chọn khách chọn khi thêm vào giỏ — sizeCode khớp ProductSize.code,
// selections khoá theo ProductCustomization.name.
export type ProductSelections = Record<string, string | string[] | boolean>;

export type ProductOptions = {
  sizeCode: string;
  selections?: ProductSelections;
};
