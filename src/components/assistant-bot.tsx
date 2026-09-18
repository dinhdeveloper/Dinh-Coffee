import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAtomValue, useStore } from "jotai";
import { useLocation, useNavigate } from "zmp-ui";
import {
  AssistantAction,
  AssistantMessage,
  sendAssistantMessage,
} from "@/services/assistant";
import { ApiError } from "@/services/api";
import { assistantIntentAtom } from "@/store/assistant";
import { cartItemsAtom } from "@/store/cart";

const BOT_SIZE = 56;
const EDGE_GAP = 12;
const DRAG_THRESHOLD = 6;
const POSITION_KEY = "assistant_bot_position";
const GREETED_KEY = "assistant_greeted";

const GREETING = "Chào bạn! 👋 Hôm nay bạn muốn uống gì nè?";
const QUICK_PICKS = [
  { label: "☕ Cà phê", text: "Mình muốn uống cà phê" },
  { label: "🧋 Trà sữa", text: "Mình muốn uống trà sữa" },
  { label: "🍓 Trà trái cây", text: "Mình muốn uống trà trái cây" },
  { label: "🍵 Matcha", text: "Mình muốn uống matcha" },
  { label: "🍰 Bánh ngọt", text: "Mình muốn ăn bánh ngọt" },
];

type Position = { x: number; y: number };

function clampPosition({ x, y }: Position): Position {
  return {
    x: Math.min(Math.max(EDGE_GAP, x), window.innerWidth - BOT_SIZE - EDGE_GAP),
    y: Math.min(
      Math.max(EDGE_GAP, y),
      window.innerHeight - BOT_SIZE - EDGE_GAP,
    ),
  };
}

// Mặc định nằm góc phải-dưới, cao hơn thanh điều hướng dưới cùng.
function defaultPosition(): Position {
  return clampPosition({
    x: window.innerWidth - BOT_SIZE - EDGE_GAP,
    y: window.innerHeight - BOT_SIZE - 96,
  });
}

function loadPosition(): Position {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Position;
      if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
        return clampPosition(parsed);
      }
    }
  } catch {
    // localStorage có thể bị chặn — dùng vị trí mặc định.
  }
  return defaultPosition();
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function BotFace() {
  return (
    <svg viewBox="0 0 48 48" width="34" height="34" aria-hidden="true">
      <line
        x1="24"
        y1="14"
        x2="24"
        y2="8"
        stroke="#a78bfa"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="7" r="2.6" fill="#a78bfa" />
      <rect
        x="9"
        y="14"
        width="30"
        height="24"
        rx="10"
        fill="#fff"
        stroke="#a78bfa"
        strokeWidth="2"
      />
      <circle cx="18.5" cy="25" r="2.7" fill="#5b3fb8" />
      <circle cx="29.5" cy="25" r="2.7" fill="#5b3fb8" />
      <path
        d="M19 31.5q5 4 10 0"
        stroke="#5b3fb8"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AssistantBot() {
  const navigate = useNavigate();
  const location = useLocation();
  const store = useStore();
  const cartItems = useAtomValue(cartItemsAtom);

  const [position, setPosition] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [running, setRunning] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    origin: Position;
    moved: boolean;
  } | null>(null);
  const cancelRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPosition(loadPosition());
    const handleResize = () =>
      setPosition((prev) => (prev ? clampPosition(prev) : prev));
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Mới vào app (trang chủ) thì bot chủ động hỏi hôm nay uống gì — mỗi phiên 1 lần.
  useEffect(() => {
    let greeted = false;
    try {
      greeted = sessionStorage.getItem(GREETED_KEY) === "1";
    } catch {
      // bỏ qua
    }
    if (greeted || !location.pathname.startsWith("/home")) return;

    const timer = setTimeout(() => {
      setOpen(true);
      try {
        sessionStorage.setItem(GREETED_KEY, "1");
      } catch {
        // bỏ qua
      }
    }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending, open]);

  useEffect(() => {
    if (!bubble || running) return;
    const timer = setTimeout(() => setBubble(null), 7000);
    return () => clearTimeout(timer);
  }, [bubble, running]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!position) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origin: position,
      moved: false,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

    if (!drag.moved) {
      drag.moved = true;
      setDragging(true);
    }
    setPosition(
      clampPosition({ x: drag.origin.x + dx, y: drag.origin.y + dy }),
    );
  };

  const handlePointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    if (!drag.moved) {
      setOpen((prev) => !prev);
      setBubble(null);
      return;
    }

    setDragging(false);
    // Thả ra thì hít vào cạnh trái/phải gần nhất.
    setPosition((prev) => {
      if (!prev) return prev;
      const snapped = clampPosition({
        x:
          prev.x + BOT_SIZE / 2 < window.innerWidth / 2
            ? EDGE_GAP
            : window.innerWidth - BOT_SIZE - EDGE_GAP,
        y: prev.y,
      });
      try {
        localStorage.setItem(POSITION_KEY, JSON.stringify(snapped));
      } catch {
        // bỏ qua
      }
      return snapped;
    });
  };

  const waitForIntent = useCallback(
    (timeoutMs: number) =>
      new Promise<void>((resolve) => {
        const finished = () =>
          store.get(assistantIntentAtom)?.status !== "pending";
        if (finished()) return resolve();

        const unsubscribe = store.sub(assistantIntentAtom, () => {
          if (!finished()) return;
          unsubscribe();
          clearTimeout(timer);
          resolve();
        });
        const timer = setTimeout(() => {
          unsubscribe();
          resolve();
        }, timeoutMs);
      }),
    [store],
  );

  // Thực thi lần lượt các lệnh AI trả về, có độ trễ để nhìn như người thật thao tác.
  const runActions = async (actions: AssistantAction[]) => {
    cancelRef.current = false;
    setRunning(true);
    setBubble("Đang thao tác giúp bạn…");

    try {
      for (const action of actions) {
        if (cancelRef.current) break;

        if (action.type === "open_product") {
          navigate(`/product/${action.productId}`);
          await wait(900);
        } else if (action.type === "add_to_cart") {
          store.set(assistantIntentAtom, {
            productId: action.productId,
            quantity: action.quantity,
            options: action.options,
            status: "pending",
          });
          navigate(`/product/${action.productId}`);
          await waitForIntent(20000);
        } else if (action.type === "go_to_cart") {
          navigate("/cart");
          await wait(700);
        }
      }
    } finally {
      store.set(assistantIntentAtom, null);
      setRunning(false);
    }
  };

  const handleStop = () => {
    cancelRef.current = true;
    store.set(assistantIntentAtom, null);
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending || running) return;

    const nextMessages: AssistantMessage[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const { reply, actions } = await sendAssistantMessage({
        messages: nextMessages,
        cart: cartItems.map((item) => ({
          title: item.title,
          quantity: item.quantity,
          optionsLabel: item.optionsLabel,
        })),
      });

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setSending(false);

      if (actions.length > 0) {
        // Thu panel lại để người dùng thấy app tự thao tác.
        setOpen(false);
        await wait(400);
        await runActions(actions);
      }
      setBubble(reply);
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 503
          ? "Trợ lý AI chưa được bật, bạn thử lại sau nhé."
          : err instanceof ApiError && err.status === 429
            ? "Bạn nhắn nhanh quá, đợi mình chút nhé."
            : "Mình bị mất kết nối rồi, bạn thử lại giúp mình nhé.";
      setMessages((prev) => [...prev, { role: "assistant", content: message }]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(input);
  };

  if (!position) return null;

  const onRight = position.x + BOT_SIZE / 2 > window.innerWidth / 2;

  return (
    <>
      {open && (
        <div
          className="glass-card fixed z-[1001] flex flex-col overflow-hidden rounded-3xl"
          style={{
            left: "50%",
            transform: "translateX(-50%)",
            bottom: "calc(env(safe-area-inset-bottom) + 12px)",
            width: "min(calc(100vw - 16px), 420px)",
            height: "min(68vh, 560px)",
            background: "rgba(255,255,255,0.96)",
          }}
        >
          <div className="flex flex-none items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3eeff]">
                <BotFace />
              </span>
              <div>
                <div className="text-sm font-semibold text-[#2f2f2f]">
                  Trợ lý gọi món
                </div>
                <div className="text-xs text-gray-400">
                  Hỏi mình bất cứ món nào
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-label="Đóng"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full border-0 bg-gray-100 p-0 text-lg leading-none text-gray-500"
            >
              ×
            </button>
          </div>

          <div
            ref={listRef}
            className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-2"
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-5 ${
                  message.role === "user"
                    ? "self-end bg-[#a78bfa] text-white"
                    : "self-start border border-gray-100 bg-white text-[#2f2f2f]"
                }`}
              >
                {message.content}
              </div>
            ))}

            {sending && (
              <div className="self-start rounded-2xl border border-gray-100 bg-white px-3.5 py-2 text-sm text-gray-400">
                Đang nghĩ…
              </div>
            )}

            {messages.length === 1 && !sending && (
              <div className="mt-1 flex flex-wrap gap-2">
                {QUICK_PICKS.map((pick) => (
                  <button
                    key={pick.label}
                    type="button"
                    onClick={() => void send(pick.text)}
                    className="rounded-full border border-[#a78bfa] bg-white px-3 py-1.5 text-sm font-medium text-[#2f2f2f] active:scale-95"
                  >
                    {pick.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-none items-center gap-2 border-t border-gray-100 px-3 py-2.5"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Nhắn cho mình nhé…"
              disabled={sending || running}
              className="min-w-0 flex-1 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-base outline-none focus:border-[#a78bfa]"
            />
            <button
              type="submit"
              aria-label="Gửi"
              disabled={!input.trim() || sending || running}
              className="flex h-10 w-10 flex-none items-center justify-center rounded-full border-0 bg-[#a78bfa] p-0 text-white disabled:opacity-40"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {!open && bubble && (
        <div
          className="glass-card fixed z-[1000] max-w-[240px] rounded-2xl px-3.5 py-2.5 text-sm leading-5 text-[#2f2f2f]"
          style={{
            bottom: window.innerHeight - position.y + 8,
            ...(onRight
              ? { right: window.innerWidth - position.x - BOT_SIZE }
              : { left: position.x }),
            background: "rgba(255,255,255,0.96)",
          }}
          onClick={() => {
            if (!running) {
              setBubble(null);
              setOpen(true);
            }
          }}
        >
          <div className="line-clamp-4 whitespace-pre-wrap">{bubble}</div>
          {running && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleStop();
              }}
              className="mt-1.5 rounded-full border border-gray-200 bg-white px-3 py-0.5 text-xs font-medium text-gray-500"
            >
              Dừng
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        aria-label="Trợ lý gọi món"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="glass-card fixed z-[1000] flex items-center justify-center rounded-full p-0"
        style={{
          left: position.x,
          top: position.y,
          width: BOT_SIZE,
          height: BOT_SIZE,
          touchAction: "none",
          cursor: dragging ? "grabbing" : "grab",
          transition: dragging
            ? "none"
            : "left 220ms ease, top 220ms ease, transform 150ms ease",
          transform: dragging ? "scale(1.08)" : undefined,
          background: "rgba(255,255,255,0.95)",
        }}
      >
        <span
          className={
            running || sending ? "assistant-bot-busy" : "assistant-bot-float"
          }
        >
          <BotFace />
        </span>
      </button>
    </>
  );
}

export default AssistantBot;
