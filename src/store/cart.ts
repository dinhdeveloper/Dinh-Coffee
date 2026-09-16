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

// TODO: seed tạm 1 sản phẩm để test thanh toán ZaloPay trên thiết bị thật —
// xóa dòng seed này khi đã test xong.
const SEEDED_CART_ITEMS: CartItem[] = [
  {
    id: "tra-sua-tran-chau",
    title: "Trà sữa trân châu",
    price: "35.000đ",
    image:
      "https://img.magnific.com/free-photo/composition-with-delicious-thai-tea_23-2148994319.jpg",
    quantity: 1,
  },
];

export const cartItemsAtom = atomWithStorage<CartItem[]>(
  "cart_items",
  SEEDED_CART_ITEMS,
);

export const cartCountAtom = atom((get) =>
  get(cartItemsAtom).reduce((sum, item) => sum + item.quantity, 0),
);

export const cartTotalAtom = atom((get) =>
  get(cartItemsAtom).reduce(
    (sum, item) => sum + parsePrice(item.price) * item.quantity,
    0,
  ),
);
