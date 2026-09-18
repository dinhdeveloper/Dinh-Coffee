import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// Chỉ lưu id sản phẩm — chi tiết sản phẩm luôn fetch lại từ API khi cần hiện
// danh sách, tránh dữ liệu cũ (giá/ảnh đổi) bị kẹt lại trong localStorage.
export const favoriteIdsAtom = atomWithStorage<string[]>(
  "favorite_product_ids",
  [],
);

export const favoriteCountAtom = atom((get) => get(favoriteIdsAtom).length);
