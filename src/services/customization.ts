// Tuỳ chọn món (size, mức đường/đá, topping) — chỉ dùng để hiển thị UI và
// ước tính giá tạm thời ở client. Giá thật luôn do backend tính lại khi tạo
// đơn (xem backend/src/data/customization-options.ts, phải khớp file này).

export type SizeOption = "S" | "M" | "L";
export type LevelOption = "100" | "70" | "50" | "30" | "0";
export type ToppingOption = "tran_chau" | "thach" | "extra_shot" | "kem_cheese";

export type ProductOptions = {
  size?: SizeOption;
  sugar?: LevelOption;
  ice?: LevelOption;
  toppings?: ToppingOption[];
};

export const SIZE_OPTIONS: { value: SizeOption; label: string; surcharge: number }[] = [
  { value: "S", label: "S", surcharge: 0 },
  { value: "M", label: "M", surcharge: 5000 },
  { value: "L", label: "L", surcharge: 10000 },
];

export const LEVEL_OPTIONS: { value: LevelOption; label: string }[] = [
  { value: "100", label: "100%" },
  { value: "70", label: "70%" },
  { value: "50", label: "50%" },
  { value: "30", label: "30%" },
  { value: "0", label: "0%" },
];

export const TOPPING_OPTIONS: { value: ToppingOption; label: string; price: number }[] = [
  { value: "tran_chau", label: "Trân châu đường đen", price: 5000 },
  { value: "thach", label: "Thạch trái cây", price: 5000 },
  { value: "extra_shot", label: "Thêm 1 shot espresso", price: 10000 },
  { value: "kem_cheese", label: "Kem phô mai", price: 10000 },
];

// Món thuộc các danh mục này (bánh, đồ ăn kèm...) không tuỳ biến size/đường/đá.
export const NON_CUSTOMIZABLE_CATEGORIES = ["Bánh ngọt"];

// Chỉ trà sữa mới có topping (cà phê, matcha, trà trái cây... thì không).
export const TOPPING_CATEGORIES = ["Trà sữa"];

export function supportsToppings(category: string): boolean {
  return TOPPING_CATEGORIES.includes(category);
}

export function isCustomizableCategory(category: string): boolean {
  return !NON_CUSTOMIZABLE_CATEGORIES.includes(category);
}

export function computeOptionsSurcharge(options?: ProductOptions): number {
  if (!options) return 0;

  const size = SIZE_OPTIONS.find((item) => item.value === options.size);
  const toppingSum = (options.toppings ?? []).reduce((sum, key) => {
    const topping = TOPPING_OPTIONS.find((item) => item.value === key);
    return sum + (topping?.price ?? 0);
  }, 0);

  return (size?.surcharge ?? 0) + toppingSum;
}

export function describeOptions(options?: ProductOptions): string | undefined {
  if (!options) return undefined;

  const parts: string[] = [];
  if (options.size) parts.push(`Size ${options.size}`);
  if (options.sugar) parts.push(`Đường ${options.sugar}%`);
  if (options.ice) parts.push(`Đá ${options.ice}%`);

  const toppingLabels = (options.toppings ?? [])
    .map((key) => TOPPING_OPTIONS.find((item) => item.value === key)?.label)
    .filter((label): label is string => Boolean(label));
  if (toppingLabels.length > 0) parts.push(toppingLabels.join(", "));

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

// Id duy nhất cho từng tổ hợp tuỳ chọn của cùng 1 sản phẩm — dùng để gộp/tách
// dòng trong giỏ hàng (2 ly cùng loại nhưng khác size phải là 2 dòng riêng).
export function buildCartLineId(productId: string, options?: ProductOptions): string {
  if (!options) return productId;
  const toppingsKey = [...(options.toppings ?? [])].sort().join(",");
  return [productId, options.size, options.sugar, options.ice, toppingsKey].join("::");
}
