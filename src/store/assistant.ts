import { atom } from "jotai";
import type { ProductOptions } from "@/services/customization";

// Lệnh "thêm món" do bot giao cho trang chi tiết sản phẩm: trang đó tự chọn
// từng tuỳ chọn như người thật rồi bấm thêm vào giỏ, xong thì đổi status
// sang "done" để bot làm bước tiếp theo.
export type AssistantIntent = {
  productId: string;
  quantity: number;
  options?: ProductOptions;
  status: "pending" | "done";
};

export const assistantIntentAtom = atom<AssistantIntent | null>(null);
