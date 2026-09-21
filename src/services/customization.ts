// Tuỳ chọn món (size, milk, syrup, đá...) — mỗi món tự khai báo size và
// customizations riêng (backend/src/data/catalog-seed-data.ts), không dùng
// chung 1 bộ S/M/L/đường/đá/topping cho mọi món như trước. Các hàm dưới đây
// chỉ dùng để hiển thị UI và ước tính giá tạm thời ở client — giá thật luôn
// do backend tính lại khi tạo đơn (xem backend/src/data/customization-options.ts,
// phải khớp logic ở đây).
import { Product, ProductCustomization, ProductSize } from "@/services/products";

// Giá trị đã chọn cho từng customization, khoá theo ProductCustomization.name.
export type ProductSelections = Record<string, string | string[] | boolean>;

export type ProductOptions = {
  sizeCode: string;
  selections?: ProductSelections;
};

export function findSize(product: Product, sizeCode?: string): ProductSize | undefined {
  if (!product.sizes.length) return undefined;
  return product.sizes.find((size) => size.code === sizeCode) ?? product.sizes[0];
}

export function defaultOptions(product: Product): ProductOptions | undefined {
  if (!product.sizes.length && product.customizations.length === 0) return undefined;

  const selections: ProductSelections = {};
  for (const custom of product.customizations) {
    if (custom.type === "toggle") selections[custom.name] = false;
    else if (custom.type === "multi") selections[custom.name] = [];
    else if (custom.type === "single" && custom.options?.length) {
      selections[custom.name] = custom.options[0];
    }
  }

  return { sizeCode: product.sizes[0]?.code ?? "", selections };
}

export function computeUnitPrice(product: Product, options?: ProductOptions): number {
  const size = findSize(product, options?.sizeCode);
  let price = size?.price ?? product.price;

  for (const custom of product.customizations) {
    const value = options?.selections?.[custom.name];
    if (value === undefined) continue;

    if (custom.type === "toggle" && value === true) {
      price += custom.priceDelta ?? 0;
    } else if (custom.type === "multi" && Array.isArray(value)) {
      price += value.length * (custom.priceDelta ?? 0);
    }
  }

  return price;
}

export function describeOptions(product: Product, options?: ProductOptions): string | undefined {
  if (!options) return undefined;

  const parts: string[] = [];
  const size = findSize(product, options.sizeCode);
  if (size && product.sizes.length > 1) parts.push(size.label);

  for (const custom of product.customizations) {
    const value = options.selections?.[custom.name];
    if (value === undefined) continue;

    if (custom.type === "toggle" && value === true) {
      parts.push(custom.name);
    } else if (custom.type === "multi" && Array.isArray(value) && value.length > 0) {
      parts.push(`${custom.name}: ${value.join(", ")}`);
    } else if (custom.type === "single" && typeof value === "string") {
      parts.push(value);
    }
  }

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

// Id duy nhất cho từng tổ hợp size + tuỳ chọn của cùng 1 sản phẩm — dùng để
// gộp/tách dòng trong giỏ hàng (2 ly cùng loại nhưng khác size phải là 2
// dòng riêng).
export function buildCartLineId(productId: string, options?: ProductOptions): string {
  if (!options) return productId;
  const selectionsKey = JSON.stringify(
    Object.entries(options.selections ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => [key, Array.isArray(value) ? [...value].sort() : value]),
  );
  return [productId, options.sizeCode, selectionsKey].join("::");
}

export function customizationOptionPrice(
  custom: ProductCustomization,
  selected: boolean,
): number {
  return selected ? custom.priceDelta ?? 0 : 0;
}
