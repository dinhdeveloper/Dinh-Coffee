// Tuỳ chọn món (size, mức đường/đá, topping) — dùng chung cho checkout() và
// createOrderMac() để backend tự tính lại giá, không tin giá client gửi lên.
// Đồng thời phải khớp với src/services/customization.ts ở frontend (chỉ dùng
// để hiển thị giá tạm thời trước khi gọi API).

export type SizeOption = "S" | "M" | "L";
export type LevelOption = "100" | "70" | "50" | "30" | "0";
export type ToppingOption = "tran_chau" | "thach" | "extra_shot" | "kem_cheese";

export type ProductOptions = {
  size?: SizeOption;
  sugar?: LevelOption;
  ice?: LevelOption;
  toppings?: ToppingOption[];
};

export const SIZE_SURCHARGE: Record<SizeOption, number> = {
  S: 0,
  M: 5000,
  L: 10000,
};

export const TOPPING_INFO: Record<ToppingOption, { label: string; price: number }> = {
  tran_chau: { label: "Trân châu đường đen", price: 5000 },
  thach: { label: "Thạch trái cây", price: 5000 },
  extra_shot: { label: "Thêm 1 shot espresso", price: 10000 },
  kem_cheese: { label: "Kem phô mai", price: 10000 },
};

// Món thuộc các danh mục này (bánh, đồ ăn kèm...) không tuỳ biến size/đường/đá.
export const NON_CUSTOMIZABLE_CATEGORIES = ["Bánh ngọt"];

export function computeOptionsSurcharge(options?: ProductOptions): number {
  if (!options) return 0;

  const sizeFee = options.size ? SIZE_SURCHARGE[options.size] ?? 0 : 0;
  const toppingFee = (options.toppings ?? []).reduce(
    (sum, key) => sum + (TOPPING_INFO[key]?.price ?? 0),
    0,
  );

  return sizeFee + toppingFee;
}

export function describeOptions(options?: ProductOptions): string | undefined {
  if (!options) return undefined;

  const parts: string[] = [];
  if (options.size) parts.push(`Size ${options.size}`);
  if (options.sugar) parts.push(`Đường ${options.sugar}%`);
  if (options.ice) parts.push(`Đá ${options.ice}%`);

  const toppingLabels = (options.toppings ?? [])
    .map((key) => TOPPING_INFO[key]?.label)
    .filter((label): label is string => Boolean(label));
  if (toppingLabels.length > 0) parts.push(toppingLabels.join(", "));

  return parts.length > 0 ? parts.join(" · ") : undefined;
}
