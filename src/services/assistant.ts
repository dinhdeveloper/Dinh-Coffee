import { apiPost } from "@/services/api";
import type { ProductOptions } from "@/services/customization";

export type AssistantMessage = { role: "user" | "assistant"; content: string };

export type AssistantAction =
  | { type: "open_product"; productId: string }
  | {
      type: "add_to_cart";
      productId: string;
      title: string;
      quantity: number;
      options?: ProductOptions;
    }
  | {
      type: "update_cart_item";
      productId: string;
      title: string;
      quantity?: number;
      options?: ProductOptions;
    }
  | { type: "go_to_cart" };

export type AssistantResponse = { reply: string; actions: AssistantAction[] };

export function sendAssistantMessage(payload: {
  messages: AssistantMessage[];
  cart: { productId: string; title: string; quantity: number; optionsLabel?: string }[];
}) {
  return apiPost<AssistantResponse>("/assistant/chat", payload);
}
