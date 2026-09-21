// Tính giá món theo size + tuỳ chọn RIÊNG của từng món (khác món khác size/
// tuỳ chọn khác nhau, không dùng chung 1 bộ S/M/L/đường/đá/topping như
// trước) — dùng cho checkout()/createOrderMac() để backend tự tính lại giá,
// không tin giá client gửi lên. Phải khớp với src/services/customization.ts
// ở frontend (chỉ dùng để hiển thị giá tạm thời trước khi gọi API).
import { Product, ProductOptions, ProductSelections } from "@/types/product";

export type { ProductOptions, ProductSelections };

export function findSize(product: Product, sizeCode?: string) {
  if (!product.sizes.length) return undefined;
  return (
    product.sizes.find((size) => size.code === sizeCode) ?? product.sizes[0]
  );
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
      const validCount = value.filter((v) => custom.options?.includes(v)).length;
      price += validCount * (custom.priceDelta ?? 0);
    }
    // "single": lựa chọn không có phụ phí trong dữ liệu hiện tại.
  }

  return price;
}

export function normalizeOptions(
  product: Product,
  raw?: { sizeCode?: string; selections?: ProductSelections },
): ProductOptions | undefined {
  if (!product.sizes.length && product.customizations.length === 0) return undefined;

  const size = findSize(product, raw?.sizeCode);
  const selections: ProductSelections = {};

  for (const custom of product.customizations) {
    const value = raw?.selections?.[custom.name];
    if (value === undefined) continue;

    if (custom.type === "toggle") {
      selections[custom.name] = value === true;
    } else if (custom.type === "multi" && Array.isArray(value)) {
      selections[custom.name] = value.filter(
        (v): v is string => typeof v === "string" && (custom.options?.includes(v) ?? false),
      );
    } else if (custom.type === "single" && typeof value === "string") {
      if (custom.options?.includes(value)) selections[custom.name] = value;
    }
  }

  return { sizeCode: size?.code ?? "", selections };
}

export function describeOptions(
  product: Product,
  options?: ProductOptions,
): string | undefined {
  if (!options) return undefined;

  const parts: string[] = [];
  const size = findSize(product, options.sizeCode);
  if (size) parts.push(size.label);

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
