import { atom } from "jotai";
import type { ProductOptions } from "@/services/customization";

// Lệnh "thêm món" do bot giao cho trang chi tiết sản phẩm: trang đó tự chọn
// từng tuỳ chọn như người thật rồi bấm thêm vào giỏ, xong thì đổi status
// sang "done" để bot làm bước tiếp theo.
export type AssistantIntent = {
  productId: string;
  // Không có khi lệnh sửa món không đổi số lượng.
  quantity?: number;
  options?: ProductOptions;
  // Có khi bot sửa một dòng đã có trong giỏ (trang sản phẩm mở ở chế độ sửa).
  editLineKey?: string;
  status: "pending" | "done";
};

export const assistantIntentAtom = atom<AssistantIntent | null>(null);
