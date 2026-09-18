import { env } from "@/config/env";
import { products } from "@/data/products.data";
import {
  LevelOption,
  NON_CUSTOMIZABLE_CATEGORIES,
  ProductOptions,
  SizeOption,
  TOPPING_INFO,
  ToppingOption,
} from "@/data/customization-options";

export type AssistantMessage = { role: "user" | "assistant"; content: string };
export type AssistantCartLine = {
  title: string;
  quantity: number;
  optionsLabel?: string;
};

// Lệnh trả về cho app tự thực thi trên giao diện (mở trang, chọn size...).
// Giá và tồn tại của món luôn được backend kiểm tra, không tin AI.
export type AssistantAction =
  | { type: "open_product"; productId: string }
  | {
      type: "add_to_cart";
      productId: string;
      title: string;
      quantity: number;
      options?: ProductOptions;
    }
  | { type: "go_to_cart" };

export type AssistantResult = { reply: string; actions: AssistantAction[] };

const MAX_TOOL_ROUNDS = 6;
const SIZES: SizeOption[] = ["S", "M", "L"];
const LEVELS: LevelOption[] = ["100", "70", "50", "30", "0"];
const TOPPINGS = Object.keys(TOPPING_INFO) as ToppingOption[];

const SYSTEM_PROMPT = `Bạn là trợ lý gọi món thân thiện của quán cà phê & trà trong ứng dụng. Luôn trả lời bằng tiếng Việt, xưng "mình" và gọi khách là "bạn", giọng ngắn gọn, vui vẻ, không quá 3 câu mỗi lượt.

Cách làm việc:
- Khi khách nói muốn uống gì, dùng công cụ search_products để tìm món thật trong menu. KHÔNG tự bịa tên món, id hay giá. Khách có thể gõ không dấu hoặc viết tắt ("cf sữa", "tra sua").
- Nếu có nhiều món phù hợp, gợi ý tối đa 3 món và hỏi khách chọn món nào.
- Đồ uống có 3 tuỳ chọn: size (S/M/L, mặc định M), mức đường và mức đá (100/70/50/30/0 %, mặc định 100) và topping (tuỳ chọn). Nếu khách chưa nói size, đường hoặc đá, hãy hỏi lại một câu gọn rồi mới thêm vào giỏ — trừ khi khách bảo "như thường"/"mặc định". Bánh ngọt không có các tuỳ chọn này.
- Khi đã đủ thông tin, gọi add_to_cart. App sẽ tự mở trang món và chọn từng tuỳ chọn như có người thao tác thật.
- Sau khi thêm món, hỏi khách có muốn thêm món khác không. Khi khách muốn thanh toán hoặc xem giỏ, gọi go_to_cart.
- Bạn KHÔNG thể tự thanh toán. Luôn nói rõ khách cần bấm nút đặt hàng/thanh toán để xác nhận cuối cùng.
- Chỉ nói chuyện về việc gọi món và menu của quán; từ chối lịch sự các chủ đề khác.`;

// Khai báo công cụ theo định dạng function calling của Gemini (schema kiểu
// OpenAPI, type viết hoa).
const FUNCTION_DECLARATIONS = [
  {
    name: "search_products",
    description:
      "Tìm món trong menu theo từ khoá và/hoặc danh mục. Bỏ trống cả hai để xem toàn bộ menu.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Từ khoá tên/mô tả món" },
        category: {
          type: "STRING",
          description: "Danh mục, ví dụ: Cà phê, Trà sữa, Trà trái cây, Matcha, Bánh ngọt",
        },
      },
    },
  },
  {
    name: "add_to_cart",
    description:
      "Thêm món vào giỏ hàng trên app kèm tuỳ chọn. Chỉ gọi khi đã biết chính xác món (product_id lấy từ search_products).",
    parameters: {
      type: "OBJECT",
      properties: {
        product_id: { type: "STRING" },
        quantity: { type: "INTEGER", description: "Số lượng, 1-10" },
        size: { type: "STRING", enum: SIZES },
        sugar: { type: "STRING", enum: LEVELS, description: "Mức đường (%)" },
        ice: { type: "STRING", enum: LEVELS, description: "Mức đá (%)" },
        toppings: {
          type: "ARRAY",
          items: { type: "STRING", enum: TOPPINGS },
        },
      },
      required: ["product_id"],
    },
  },
  {
    name: "go_to_cart",
    description: "Mở trang giỏ hàng để khách kiểm tra và bấm thanh toán.",
  },
];

// Bỏ dấu + hạ chữ thường để khớp "ca phe sua" với "Cà phê sữa".
function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

function searchProducts(query?: string, category?: string) {
  const keywords = normalize(query ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const wantedCategory = category ? normalize(category) : "";

  return products
    .filter((product) => {
      if (wantedCategory && !normalize(product.category).includes(wantedCategory)) {
        return false;
      }
      const haystack = normalize(
        `${product.title} ${product.category} ${product.description}`,
      );
      return keywords.every((word) => haystack.includes(word));
    })
    .map((product) => ({
      id: product.id,
      title: product.title,
      price: product.price,
      category: product.category,
      customizable: !NON_CUSTOMIZABLE_CATEGORIES.includes(product.category),
    }));
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

type ToolOutcome = { content: string; action?: AssistantAction; isError?: boolean };

function runTool(name: string, input: Record<string, unknown>): ToolOutcome {
  if (name === "search_products") {
    const found = searchProducts(
      typeof input.query === "string" ? input.query : undefined,
      typeof input.category === "string" ? input.category : undefined,
    );
    return { content: JSON.stringify(found) };
  }

  if (name === "add_to_cart") {
    const product = products.find((item) => item.id === input.product_id);
    if (!product) {
      return {
        content: "Không có món này trong menu, hãy dùng search_products lại.",
        isError: true,
      };
    }

    const rawQty = Number(input.quantity ?? 1);
    const quantity = Math.min(10, Math.max(1, Number.isFinite(rawQty) ? Math.round(rawQty) : 1));
    const customizable = !NON_CUSTOMIZABLE_CATEGORIES.includes(product.category);

    const options: ProductOptions | undefined = customizable
      ? {
          size: pickEnum(input.size, SIZES, "M"),
          sugar: pickEnum(input.sugar, LEVELS, "100"),
          ice: pickEnum(input.ice, LEVELS, "100"),
          toppings: Array.isArray(input.toppings)
            ? Array.from(
                new Set(
                  input.toppings.filter((item): item is ToppingOption =>
                    TOPPINGS.includes(item as ToppingOption),
                  ),
                ),
              )
            : [],
        }
      : undefined;

    return {
      content: `Đã gửi lệnh thêm ${quantity} ${product.title} vào giỏ, app đang thao tác.`,
      action: {
        type: "add_to_cart",
        productId: product.id,
        title: product.title,
        quantity,
        options,
      },
    };
  }

  if (name === "go_to_cart") {
    return { content: "Đã mở trang giỏ hàng.", action: { type: "go_to_cart" } };
  }

  return { content: `Công cụ ${name} không tồn tại.`, isError: true };
}

type GeminiPart = {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
  [key: string]: unknown;
};
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };
type GeminiResponse = {
  candidates?: { content?: GeminiContent; finishReason?: string }[];
  error?: { message?: string };
};

export class GeminiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(`Gemini ${status}: ${message}`);
    this.status = status;
  }
}

async function callGemini(
  systemInstruction: string,
  contents: GeminiContent[],
): Promise<GeminiContent | undefined> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.gemini.model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.gemini.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
        generationConfig: { maxOutputTokens: 700, temperature: 0.6 },
      }),
    },
  );

  const data = (await res.json().catch(() => ({}))) as GeminiResponse;
  if (!res.ok) {
    throw new GeminiError(res.status, data.error?.message ?? "lỗi không rõ");
  }

  return data.candidates?.[0]?.content;
}

export async function runAssistant(
  history: AssistantMessage[],
  cart: AssistantCartLine[],
): Promise<AssistantResult> {
  const cartSummary =
    cart.length > 0
      ? cart
          .map(
            (line) =>
              `- ${line.quantity} × ${line.title}${line.optionsLabel ? ` (${line.optionsLabel})` : ""}`,
          )
          .join("\n")
      : "(giỏ hàng đang trống)";
  const systemInstruction = `${SYSTEM_PROMPT}\n\nGiỏ hàng hiện tại của khách:\n${cartSummary}`;

  const contents: GeminiContent[] = history.map((message) => ({
    role: message.role === "user" ? "user" : "model",
    parts: [{ text: message.content }],
  }));
  const actions: AssistantAction[] = [];
  let reply = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const content = await callGemini(systemInstruction, contents);
    const parts = content?.parts ?? [];

    reply = parts
      .map((part) => part.text ?? "")
      .join("")
      .trim();

    const calls = parts.filter((part) => part.functionCall);
    if (!content || calls.length === 0) break;

    // Giữ nguyên các part của model (kể cả thoughtSignature) khi gửi lại.
    contents.push({ role: "model", parts });

    const responses: GeminiPart[] = calls.map((part) => {
      const call = part.functionCall!;
      const outcome = runTool(call.name, call.args ?? {});
      if (outcome.action) actions.push(outcome.action);
      return {
        functionResponse: {
          name: call.name,
          response: outcome.isError
            ? { error: outcome.content }
            : { result: outcome.content },
        },
      };
    });
    contents.push({ role: "user", parts: responses });
  }

  return {
    reply: reply || "Mình chưa hiểu ý bạn, bạn nói lại giúp mình nhé?",
    actions,
  };
}
