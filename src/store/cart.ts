import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type CartItem = {
  id: string;
  title: string;
  price: string;
  image: string;
  quantity: number;
};

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
