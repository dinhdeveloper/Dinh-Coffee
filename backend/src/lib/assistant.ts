import { env } from "@/config/env";
import { listActiveProducts } from "@/data/catalog.store";
import {
  ProductOptions,
  ProductSelections,
  describeOptions,
  normalizeOptions,
} from "@/data/customization-options";
import { Product } from "@/types/product";

export type AssistantMessage = { role: "user" | "assistant"; content: string };
export type AssistantCartLine = {
  productId?: string;
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
  // Sửa dòng đã có trong giỏ (thường là món vừa thêm): chỉ các trường có mặt
  // mới bị đổi, phần còn lại giữ nguyên. App tự gộp với tuỳ chọn hiện có.
  | {
      type: "update_cart_item";
      productId: string;
      title: string;
      quantity?: number;
      options?: ProductOptions;
    }
  | { type: "go_to_cart" };

export type AssistantResult = { reply: string; actions: AssistantAction[] };

const MAX_TOOL_ROUNDS = 6;

const SYSTEM_PROMPT = `Bạn là trợ lý gọi món thân thiện của quán trong ứng dụng. Luôn trả lời bằng tiếng Việt, xưng "mình" và gọi khách là "bạn", giọng ngắn gọn, vui vẻ, không quá 3 câu mỗi lượt.

Cách làm việc:
- Chỉ được nói về các món có trong MENU bên dưới. KHÔNG tự bịa tên món, id hay giá. Khách có thể gõ không dấu hoặc viết tắt — hãy tự khớp với món gần nhất trong MENU.
- Nếu có nhiều món phù hợp, gợi ý tối đa 3 món và hỏi khách chọn món nào.
- Mỗi món trong MENU liệt kê sẵn "size" (mã|tên|giá) và "tuỳ chọn" (tên|loại|các lựa chọn) riêng của món đó — chỉ dùng đúng mã size và tên/lựa chọn đã liệt kê cho món đó, không suy diễn thêm. Loại "single" chỉ chọn 1 giá trị, "multi" chọn nhiều giá trị (mảng), "toggle" chỉ true/false. Món không có size/tuỳ chọn thì bỏ qua size_code/selections.
- Nếu khách chưa nói rõ size hoặc tuỳ chọn bắt buộc phải biết để tính đúng giá, hỏi lại một câu gọn rồi mới thêm vào giỏ — trừ khi khách bảo "như thường"/"mặc định" (khi đó dùng size đầu tiên trong danh sách và bỏ qua tuỳ chọn).
- selections là 1 chuỗi JSON object, khoá là đúng tên tuỳ chọn của món, giá trị tương ứng loại (single: chuỗi, multi: mảng chuỗi, toggle: true/false). Ví dụ: {"Milk":"Oat","Extra shot":true,"Syrup":["Vanilla"]}.
- Khi đã đủ thông tin, gọi add_to_cart. App sẽ tự mở trang món và chọn từng tuỳ chọn như có người thao tác thật.
- Khi khách muốn đổi món vừa chọn hoặc món đang có trong giỏ (đổi size, đổi tuỳ chọn, đổi số lượng), gọi update_cart_item với product_id lấy từ mục "Giỏ hàng hiện tại" và CHỈ truyền những trường cần đổi. KHÔNG gọi add_to_cart lại cho việc này, nếu không giỏ sẽ có thêm một món mới. Nếu giỏ có nhiều món khả dĩ, ưu tiên món khách vừa nhắc tới/vừa thêm gần nhất; không chắc thì hỏi lại.
- Sau khi thêm món, hỏi khách có muốn thêm món khác không. Khi khách muốn thanh toán hoặc xem giỏ, gọi go_to_cart.
- Bạn KHÔNG thể tự thanh toán. Luôn nói rõ khách cần bấm nút đặt hàng/thanh toán để xác nhận cuối cùng.
- Chỉ nói chuyện về việc gọi món và menu của quán; từ chối lịch sự các chủ đề khác.`;

// Khai báo công cụ theo định dạng function calling của Gemini (schema kiểu
// OpenAPI, type viết hoa). size_code/selections generic để khớp với mọi món
// (mỗi món tự khai báo size/tuỳ chọn riêng trong MENU, xem SYSTEM_PROMPT).
const FUNCTION_DECLARATIONS = [
  {
    name: "add_to_cart",
    description:
      "Thêm món vào giỏ hàng trên app kèm tuỳ chọn. Chỉ gọi khi đã biết chính xác món (product_id lấy từ MENU).",
    parameters: {
      type: "OBJECT",
      properties: {
        product_id: { type: "STRING" },
        quantity: { type: "INTEGER", description: "Số lượng, 1-10" },
        size_code: { type: "STRING", description: "Mã size, lấy đúng trong MENU của món" },
        selections: {
          type: "STRING",
          description: "Chuỗi JSON object các tuỳ chọn đã chọn, khớp tên/loại tuỳ chọn của món",
        },
      },
      required: ["product_id"],
    },
  },
  {
    name: "update_cart_item",
    description:
      "Sửa tuỳ chọn hoặc số lượng của một món ĐÃ CÓ trong giỏ. Chỉ truyền các trường khách muốn đổi.",
    parameters: {
      type: "OBJECT",
      properties: {
        product_id: { type: "STRING", description: "id món trong giỏ hàng" },
        quantity: { type: "INTEGER", description: "Số lượng mới, 1-10" },
        size_code: { type: "STRING", description: "Mã size mới, lấy đúng trong MENU của món" },
        selections: {
          type: "STRING",
          description: "Chuỗi JSON object các tuỳ chọn MỚI (thay thế hoàn toàn tuỳ chọn cũ)",
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

function describeProductForMenu(product: Product): string {
  const sizePart =
    product.sizes.length > 1
      ? ` | size: ${product.sizes
          .map((s) => `${s.code}=${s.label} ${s.price.toLocaleString("vi-VN")}đ`)
          .join(", ")}`
      : "";
  const customPart = product.customizations.length
    ? ` | tuỳ chọn: ${product.customizations
        .map((c) =>
          c.type === "toggle"
            ? `${c.name} (toggle, +${(c.priceDelta ?? 0).toLocaleString("vi-VN")}đ)`
            : `${c.name} (${c.type}: ${c.options?.join("/")})`,
        )
        .join("; ")}`
    : "";
  return `- ${product.id} | ${product.title} | ${product.price.toLocaleString("vi-VN")}đ | ${product.category ?? ""}${sizePart}${customPart}`;
}

function parseSelectionsInput(value: unknown): ProductSelections | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as ProductSelections) : undefined;
  } catch {
    return undefined;
  }
}

type ToolOutcome = {
  content: string;
  action?: AssistantAction;
  // Câu trả lời dự phòng khi model chỉ gọi công cụ mà không kèm lời nhắn.
  fallbackReply?: string;
  isError?: boolean;
};

function runTool(
  products: Product[],
  name: string,
  input: Record<string, unknown>,
): ToolOutcome {
  if (name === "add_to_cart") {
    const product = products.find((item) => item.id === input.product_id);
    if (!product) {
      return {
        content: "Không có món này trong menu, hãy chọn lại đúng id trong MENU.",
        isError: true,
      };
    }

    const rawQty = Number(input.quantity ?? 1);
    const quantity = Math.min(10, Math.max(1, Number.isFinite(rawQty) ? Math.round(rawQty) : 1));
    const options = normalizeOptions(product, {
      sizeCode: typeof input.size_code === "string" ? input.size_code : undefined,
      selections: parseSelectionsInput(input.selections),
    });

    return {
      content: `Đã gửi lệnh thêm ${quantity} ${product.title} vào giỏ, app đang thao tác.`,
      fallbackReply: `Mình đã thêm ${quantity} ${product.title}${
        describeOptions(product, options) ? ` (${describeOptions(product, options)})` : ""
      } vào giỏ rồi nhé. Bạn muốn thêm món khác không?`,
      action: {
        type: "add_to_cart",
        productId: product.id,
        title: product.title,
        quantity,
        options,
      },
    };
  }

  if (name === "update_cart_item") {
    const product = products.find((item) => item.id === input.product_id);
    if (!product) {
      return {
        content: "Không có món này trong menu, hãy dùng đúng id trong giỏ hàng.",
        isError: true,
      };
    }

    const quantity =
      input.quantity === undefined
        ? undefined
        : Math.min(10, Math.max(1, Math.round(Number(input.quantity)) || 1));

    const hasSize = typeof input.size_code === "string" && input.size_code.trim();
    const hasSelections = parseSelectionsInput(input.selections) !== undefined;
    const options =
      hasSize || hasSelections
        ? normalizeOptions(product, {
            sizeCode: typeof input.size_code === "string" ? input.size_code : undefined,
            selections: parseSelectionsInput(input.selections),
          })
        : undefined;

    if (quantity === undefined && !options) {
      return {
        content: "Chưa có thay đổi hợp lệ nào (món này có thể không có size/tuỳ chọn).",
        isError: true,
      };
    }

    return {
      content: `Đã gửi lệnh sửa ${product.title} trong giỏ, app đang thao tác.`,
      fallbackReply: `Mình đã sửa ${product.title} trong giỏ rồi nhé. Bạn muốn chỉnh gì nữa không?`,
      action: {
        type: "update_cart_item",
        productId: product.id,
        title: product.title,
        quantity,
        options,
      },
    };
  }

  if (name === "go_to_cart") {
    return {
      content: "Đã mở trang giỏ hàng.",
      fallbackReply:
        "Mình mở giỏ hàng cho bạn rồi nè. Bạn kiểm tra và bấm đặt hàng để thanh toán nhé!",
      action: { type: "go_to_cart" },
    };
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

async function callGeminiModel(
  model: string,
  systemInstruction: string,
  contents: GeminiContent[],
): Promise<GeminiContent | undefined> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
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

// Hạn mức miễn phí tính riêng theo từng model, nên khi model chính hết quota
// (429) / bị gỡ (404) / quá tải (503) thì thử model dự phòng thay vì báo lỗi.
async function callGemini(
  systemInstruction: string,
  contents: GeminiContent[],
): Promise<GeminiContent | undefined> {
  const models = [env.gemini.model, ...env.gemini.fallbackModels];
  let lastError: unknown;

  for (const model of models) {
    try {
      return await callGeminiModel(model, systemInstruction, contents);
    } catch (err) {
      lastError = err;
      const retryable =
        err instanceof GeminiError && [404, 429, 500, 503].includes(err.status);
      if (!retryable) throw err;
      console.warn(`[assistant] ${model} lỗi, thử model khác: ${err.message}`);
    }
  }

  throw lastError;
}

export async function runAssistant(
  history: AssistantMessage[],
  cart: AssistantCartLine[],
): Promise<AssistantResult> {
  const products = await listActiveProducts();
  const menuText = products.map(describeProductForMenu).join("\n");

  const cartSummary =
    cart.length > 0
      ? cart
          .map(
            (line) =>
              `- ${line.quantity} × ${line.title}${line.productId ? ` [id: ${line.productId}]` : ""}${line.optionsLabel ? ` (${line.optionsLabel})` : ""}`,
          )
          .join("\n")
      : "(giỏ hàng đang trống)";
  const systemInstruction = `${SYSTEM_PROMPT}\n\nMENU (id | tên | giá | danh mục | size | tuỳ chọn):\n${menuText}\n\nGiỏ hàng hiện tại của khách (món cuối danh sách là món thêm gần nhất):\n${cartSummary}`;

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

    let errored = false;
    const fallbackReplies: string[] = [];
    const responses: GeminiPart[] = calls.map((part) => {
      const call = part.functionCall!;
      const outcome = runTool(products, call.name, call.args ?? {});
      if (outcome.action) actions.push(outcome.action);
      if (outcome.fallbackReply) fallbackReplies.push(outcome.fallbackReply);
      errored ||= Boolean(outcome.isError);
      return {
        functionResponse: {
          name: call.name,
          response: outcome.isError
            ? { error: outcome.content }
            : { result: outcome.content },
        },
      };
    });

    // Lệnh thao tác giao diện chạy xong là đủ: không gọi model lần nữa chỉ
    // để nó nói lại (mỗi lần gọi tốn thêm ~1s và 1 lượt hạn mức miễn phí).
    if (!errored) {
      if (!reply) reply = fallbackReplies.join(" ");
      break;
    }

    // Gửi lỗi về cho model để nó tự sửa (vd. sai product_id) rồi thử lại.
    contents.push({ role: "model", parts });
    contents.push({ role: "user", parts: responses });
  }

  return {
    reply: reply || "Mình chưa hiểu ý bạn, bạn nói lại giúp mình nhé?",
    actions,
  };
}

// Chép giọng nói (WAV base64) thành chữ tiếng Việt — dùng cho khách nói với bot.
export async function transcribeAudio(
  audioBase64: string,
  mimeType: string,
): Promise<string> {
  const models = [env.gemini.model, ...env.gemini.fallbackModels];
  let lastError: unknown;

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.gemini.apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: "Chép lại chính xác lời nói tiếng Việt trong đoạn âm thanh này (khách đang gọi món cà phê/trà/bánh). Chỉ trả về đúng lời đã nói, không giải thích, không thêm dấu ngoặc. Nếu không có tiếng nói rõ ràng thì trả về chuỗi rỗng.",
                  },
                  { inlineData: { mimeType, data: audioBase64 } },
                ],
              },
            ],
            generationConfig: { maxOutputTokens: 200, temperature: 0 },
          }),
        },
      );

      const data = (await res.json().catch(() => ({}))) as GeminiResponse;
      if (!res.ok) {
        throw new GeminiError(res.status, data.error?.message ?? "lỗi không rõ");
      }

      return (data.candidates?.[0]?.content?.parts ?? [])
        .map((part) => part.text ?? "")
        .join("")
        .trim();
    } catch (err) {
      lastError = err;
      const retryable =
        err instanceof GeminiError && [404, 429, 500, 503].includes(err.status);
      if (!retryable) throw err;
      console.warn(`[assistant] ${model} lỗi khi chép giọng nói: ${err.message}`);
    }
  }

  throw lastError;
}
