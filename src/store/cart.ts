import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { ProductOptions } from "@/services/customization";

export type CartItem = {
  id: string;
  // Id duy nhất cho từng tổ hợp tuỳ chọn (size/tuỳ chọn) của cùng 1 sản
  // phẩm — dùng để cộng dồn/xoá đúng dòng thay vì gộp nhầm các dòng có tuỳ
  // chọn khác nhau. Item cũ lưu từ trước khi có tính năng này sẽ không có
  // field này, nên mọi nơi thao tác theo dòng cần fallback về `id`.
  lineId?: string;
  title: string;
  price: string;
  image: string;
  quantity: number;
  options?: ProductOptions;
  optionsLabel?: string;
};

export function cartLineKey(item: CartItem): string {
  return item.lineId ?? item.id;
}

function parsePrice(price: string) {
  return Number(price.replace(/[^\d]/g, ""));
}

export const cartItemsAtom = atomWithStorage<CartItem[]>("cart_items", []);

export const cartCountAtom = atom((get) =>
  get(cartItemsAtom).reduce((sum, item) => sum + item.quantity, 0),
);

export const cartTotalAtom = atom((get) =>
  get(cartItemsAtom).reduce(
    (sum, item) => sum + parsePrice(item.price) * item.quantity,
    0,
  ),
);
