import { useEffect, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { createPortal } from "react-dom";
import { events, EventName, openWebview } from "zmp-sdk";
import { Box, Icon, Page, Text, useNavigate } from "zmp-ui";
import { CartItem, cartItemsAtom, cartTotalAtom } from "@/store/cart";
import { ApiError } from "@/services/api";
import { checkoutOrder, fetchOrderStatus } from "@/services/orders";
import { addOrderToHistory } from "@/services/order-history";
import { getStoredZaloUser } from "@/services/zalo-auth";
import {
  DeliveryAddress,
  getStoredAddress,
  saveAddress,
} from "@/services/address";

type CheckoutPhase =
  | "idle"
  | "address"
  | "creating"
  | "waiting"
  | "success"
  | "failed";

// Lỗi từ zmp-sdk (vd. openOutApp) không phải Error chuẩn của JS, mà là
// object dạng { code, message, api } — phải đọc riêng, không thì chỉ in
// ra "[object Object]" không có thông tin gì.
function describeError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  if (err && typeof err === "object") {
    const { code, message, api } = err as {
      code?: number;
      message?: string;
      api?: string;
    };
    if (code !== undefined || message !== undefined) {
      return `code=${code ?? "?"} ${message ?? ""} ${api ? `(${api})` : ""}`.trim();
    }
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

function formatPrice(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function parsePrice(price: string) {
  return Number(price.replace(/[^\d]/g, ""));
}

function CartItemCard({
  item,
  index,
  mounted,
  removing,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  item: CartItem;
  index: number;
  mounted: boolean;
  removing: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}) {
  const lineTotal = parsePrice(item.price) * item.quantity;

  return (
    <Box
      className="relative mb-3 flex gap-3 rounded-2xl border border-white/40 bg-white/15 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.07)] backdrop-blur-xl transition-all duration-300 ease-out"
      style={{
        opacity: removing ? 0 : mounted ? 1 : 0,
        transform: removing
          ? "translateX(24px) scale(0.96)"
          : mounted
            ? "translateY(0)"
            : "translateY(12px)",
        maxHeight: removing ? 0 : 200,
        marginBottom: removing ? 0 : undefined,
        paddingTop: removing ? 0 : undefined,
        paddingBottom: removing ? 0 : undefined,
        overflow: "hidden",
        transitionDelay: mounted ? "0ms" : `${index * 60}ms`,
      }}
    >
      <img
        src={item.image}
        alt={item.title}
        className="h-20 w-20 flex-none rounded-xl object-cover shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
      />

      <Box className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <Box className="pr-6">
          <Text
            size="small"
            className="line-clamp-1 font-bold text-[#1a1a1a]"
          >
            {item.title}
          </Text>
          <Text size="xSmall" className="mt-0.5 text-gray-400">
            {item.price} / món
          </Text>
        </Box>

        <Box className="flex items-center justify-between">
          <Box className="flex items-center gap-2.5 rounded-full border border-gray-200 bg-white px-1 py-1">
            <button
              type="button"
              aria-label="Giảm số lượng"
              onClick={onDecrease}
              className="flex h-6 w-6 items-center justify-center rounded-full border-0 bg-gray-100 p-0 text-[#2f2f2f] transition-transform active:scale-90"
            >
              <Text className="font-bold leading-none">−</Text>
            </button>

            <Text className="w-4 text-center text-sm font-semibold text-[#1a1a1a]">
              {item.quantity}
            </Text>

            <button
              type="button"
              aria-label="Tăng số lượng"
              onClick={onIncrease}
              className="flex h-6 w-6 items-center justify-center rounded-full border-0 bg-[#1a1a1a] p-0 text-white transition-transform active:scale-90"
            >
              <Text className="font-bold leading-none">+</Text>
            </button>
          </Box>

          <Text size="small" className="font-bold text-red-500">
            {formatPrice(lineTotal)}
          </Text>
        </Box>
      </Box>

      <button
        type="button"
        aria-label="Xóa"
        onClick={onRemove}
        className="absolute right-2 top-2 flex h-7 w-7 flex-none items-center justify-center rounded-full border-0 bg-black/5 p-0 text-gray-400 transition-transform active:scale-90"
      >
        <Icon icon="zi-delete" size={14} />
      </button>
    </Box>
  );
}

function CartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useAtom(cartItemsAtom);
  const total = useAtomValue(cartTotalAtom);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<CheckoutPhase>("idle");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [address, setAddress] = useState<DeliveryAddress>(
    () =>
      getStoredAddress() ?? { receiver: "", phone: "", detail: "", note: "" },
  );
  const [addressError, setAddressError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    return () => clearTimeout(pollTimer.current);
  }, []);

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const removeItem = (id: string) => {
    setRemovingIds((prev) => [...prev, id]);
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      setRemovingIds((prev) => prev.filter((removingId) => removingId !== id));
    }, 300);
  };

  // ZaloPay Payment Gateway (docs.zalopay.vn): backend tạo đơn qua API
  // /v2/create rồi trả về order_url, mobile mở order_url bằng openWebview()
  // ngay trong Mini App. Khi webview đóng lại (sự kiện WebviewClosed) vẫn
  // chưa chắc đã thanh toán xong, nên phải poll fetchOrderStatus() để biết
  // đơn đã "paid"/"failed" hay chưa.
  const pollOrderStatus = (orderId: string, startedAt: number) => {
    fetchOrderStatus(orderId)
      .then((order) => {
        if (order.status === "paid") {
          setItems([]);
          addOrderToHistory(orderId);
          setPhase("success");
          setTimeout(() => {
            setPhase("idle");
            navigate(`/order/${orderId}`);
          }, 1600);
          return;
        }

        if (order.status === "failed") {
          setPhase("failed");
          return;
        }

        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          setPhase("failed");
          return;
        }

        pollTimer.current = setTimeout(
          () => pollOrderStatus(orderId, startedAt),
          POLL_INTERVAL_MS,
        );
      })
      .catch(() => {
        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          setPhase("failed");
          return;
        }
        pollTimer.current = setTimeout(
          () => pollOrderStatus(orderId, startedAt),
          POLL_INTERVAL_MS,
        );
      });
  };

  const handleOpenAddress = () => {
    setCheckoutError(null);
    setAddressError(null);
    setPhase("address");
  };

  const handleConfirmAddress = () => {
    if (
      !address.receiver.trim() ||
      !address.phone.trim() ||
      !address.detail.trim()
    ) {
      setAddressError("Vui lòng nhập đầy đủ tên, số điện thoại và địa chỉ");
      return;
    }

    saveAddress(address);
    handleCheckout();
  };

  const handleCheckout = async () => {
    setCheckoutError(null);
    setPhase("creating");
    clearTimeout(pollTimer.current);

    let order: Awaited<ReturnType<typeof checkoutOrder>>;
    try {
      order = await checkoutOrder(
        items.map((item) => ({ id: item.id, quantity: item.quantity })),
        getStoredZaloUser()?.id,
        address,
      );
    } catch (err) {
      const detail = describeError(err);
      console.error("[checkout] tạo đơn thất bại:", detail);
      setPhase("address");
      setCheckoutError(
        err instanceof ApiError
          ? err.message
          : `Không kết nối được tới máy chủ (${detail}), vui lòng thử lại`,
      );
      return;
    }

    try {
      // openOutApp bị Zalo chặn quyền (code -1403) trừ khi Mini App được
      // cấp quyền riêng, nên dùng openWebview để mở trang thanh toán
      // ZaloPay ngay trong Mini App thay vì thoát ra app ngoài.
      await openWebview({
        url: order.orderUrl,
        config: { style: "bottomSheet" },
      });
      setPhase("waiting");

      events.once(EventName.WebviewClosed, () => {
        pollOrderStatus(order.orderId, Date.now());
      });
    } catch (err) {
      const detail = describeError(err);
      console.error("[checkout] openWebview thất bại:", detail, order.orderUrl);
      setPhase("address");
      setCheckoutError(
        `Không thể mở giao diện thanh toán (${detail}), vui lòng thử lại`,
      );
    }
  };

  const handleCloseFailed = () => {
    setPhase("idle");
  };

  const handleCancelWaiting = () => {
    clearTimeout(pollTimer.current);
    setPhase("idle");
  };

  return (
    <Page
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-transparent px-4 py-2 hide-scrollbar"
      style={{
        paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {/* =========================
          HEADER
      ========================== */}
      <Box
        className="flex items-center gap-3"
        style={{
          paddingTop: "calc(var(--zaui-safe-area-inset-top, 0px) + 10px)",
        }}
      >
        <button
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-white/80 text-[#141415] shadow-[0_8px_22px_rgba(0,0,0,0.10)]"
        >
          <Icon icon="zi-arrow-left" size={22} />
        </button>

        <Box className="min-w-0 flex-1">
          <Text.Title size="normal" className="truncate font-bold">
            Giỏ hàng
          </Text.Title>
          {items.length > 0 && (
            <Text size="small" className="text-gray-500">
              {items.length} sản phẩm
            </Text>
          )}
        </Box>
      </Box>

      {/* =========================
          EMPTY STATE
      ========================== */}
      {items.length === 0 ? (
        <Box className="flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
          <Box className="flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-white/10 text-3xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl">
            🛒
          </Box>
          <Text className="font-medium text-gray-600">
            Giỏ hàng của bạn đang trống
          </Text>
          <Text size="small" className="text-gray-400">
            Thêm món yêu thích để bắt đầu đặt hàng nhé
          </Text>
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="mt-2 rounded-full border-0 bg-[#1a1a1a] px-5 py-2.5 text-sm font-semibold text-white active:scale-95"
          >
            Khám phá món ngon
          </button>
        </Box>
      ) : (
        <Box className="mt-5 flex-1" style={{ paddingBottom: 96 }}>
          {items.map((item, index) => (
            <CartItemCard
              key={item.id}
              item={item}
              index={index}
              mounted={mounted}
              removing={removingIds.includes(item.id)}
              onIncrease={() => updateQuantity(item.id, 1)}
              onDecrease={() => updateQuantity(item.id, -1)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </Box>
      )}

      {/* =========================
          STICKY CHECKOUT BAR
      ========================== */}
      {items.length > 0 &&
        createPortal(
          <Box
            className="fixed inset-x-0 bottom-0 z-[999] bg-white px-5 pb-5 pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]"
            style={{
              paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
            }}
          >
            {checkoutError && (
              <Text size="small" className="mb-2 text-red-500">
                {checkoutError}
              </Text>
            )}

            <Box className="flex items-center gap-3">
              <Box className="min-w-0 flex-1">
                <Text size="xSmall" className="text-gray-400">
                  Tổng cộng
                </Text>
                <Text.Title size="normal" className="font-bold text-[#1a1a1a]">
                  {formatPrice(total)}
                </Text.Title>
              </Box>

              <button
                type="button"
                onClick={handleOpenAddress}
                disabled={phase === "creating" || phase === "waiting"}
                className="relative flex h-11 flex-none items-center justify-center gap-2 overflow-hidden rounded-full border-0 bg-[#1a1a1a] px-6 text-sm font-semibold text-white transition-transform active:scale-95 disabled:opacity-80"
              >
                <span
                  className="flex items-center gap-2 transition-all duration-300"
                  style={{
                    opacity: phase === "creating" ? 0 : 1,
                    transform:
                      phase === "creating"
                        ? "translateY(-16px)"
                        : "translateY(0)",
                  }}
                >
                  Đặt hàng
                </span>

                <span
                  className="absolute inset-0 flex items-center justify-center gap-2 transition-all duration-300"
                  style={{
                    opacity: phase === "creating" ? 1 : 0,
                    transform:
                      phase === "creating"
                        ? "translateY(0)"
                        : "translateY(16px)",
                  }}
                >
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                </span>
              </button>
            </Box>
          </Box>,
          document.body,
        )}

      {/* =========================
          ADDRESS FORM OVERLAY
      ========================== */}
      {phase === "address" &&
        createPortal(
          <Box className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50">
            <Box
              className="w-full max-w-md rounded-t-3xl bg-white p-5"
              style={{
                paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
              }}
            >
              <Text.Title size="normal" className="font-bold text-[#1a1a1a]">
                Thông tin giao hàng
              </Text.Title>
              <Text size="small" className="mt-1 text-gray-500">
                Nhập địa chỉ nhận hàng trước khi thanh toán
              </Text>

              <Box className="mt-4 flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Họ và tên người nhận"
                  value={address.receiver}
                  onChange={(e) =>
                    setAddress((prev) => ({ ...prev, receiver: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#1a1a1a] outline-none focus:border-[#1a1a1a]"
                />
                <input
                  type="tel"
                  placeholder="Số điện thoại"
                  value={address.phone}
                  onChange={(e) =>
                    setAddress((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#1a1a1a] outline-none focus:border-[#1a1a1a]"
                />
                <input
                  type="text"
                  placeholder="Địa chỉ nhận hàng (số nhà, đường, phường/xã...)"
                  value={address.detail}
                  onChange={(e) =>
                    setAddress((prev) => ({ ...prev, detail: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#1a1a1a] outline-none focus:border-[#1a1a1a]"
                />
                <input
                  type="text"
                  placeholder="Ghi chú (không bắt buộc)"
                  value={address.note}
                  onChange={(e) =>
                    setAddress((prev) => ({ ...prev, note: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#1a1a1a] outline-none focus:border-[#1a1a1a]"
                />
              </Box>

              {(addressError || checkoutError) && (
                <Text size="small" className="mt-3 text-red-500">
                  {addressError || checkoutError}
                </Text>
              )}

              <button
                type="button"
                onClick={handleConfirmAddress}
                className="mt-4 w-full rounded-full border-0 bg-[#1a1a1a] py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              >
                Tiếp tục thanh toán
              </button>
              <button
                type="button"
                onClick={() => setPhase("idle")}
                className="mt-2 w-full rounded-full border-0 bg-transparent py-2.5 text-sm font-medium text-gray-400 active:opacity-60"
              >
                Huỷ
              </button>
            </Box>
          </Box>,
          document.body,
        )}

      {/* =========================
          PAYMENT STATUS OVERLAY
      ========================== */}
      {phase !== "idle" &&
        phase !== "creating" &&
        phase !== "address" &&
        createPortal(
          <Box className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-8">
            <Box className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
              {phase === "waiting" && (
                <>
                  <Box className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
                    <span className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-[#1a1a1a]" />
                  </Box>
                  <Text.Title size="normal" className="mt-4 font-bold text-[#1a1a1a]">
                    Đang chờ xác nhận thanh toán
                  </Text.Title>
                  <Text size="small" className="mt-1 text-gray-500">
                    Hoàn tất thanh toán trên ZaloPay rồi quay lại đây
                  </Text>

                  <button
                    type="button"
                    onClick={handleCancelWaiting}
                    className="mt-5 w-full rounded-full border-0 bg-transparent py-2.5 text-sm font-medium text-gray-400 active:opacity-60"
                  >
                    Đóng
                  </button>
                </>
              )}

              {phase === "success" && (
                <>
                  <Box
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 transition-transform duration-300"
                    style={{ transform: "scale(1)" }}
                  >
                    <Icon icon="zi-check-circle-solid" size={34} className="text-green-500" />
                  </Box>
                  <Text.Title size="normal" className="mt-4 font-bold text-[#1a1a1a]">
                    Thanh toán thành công!
                  </Text.Title>
                  <Text size="small" className="mt-1 text-gray-500">
                    Cảm ơn bạn đã đặt hàng tại BoomBerry
                  </Text>
                </>
              )}

              {phase === "failed" && (
                <>
                  <Box className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                    <Icon icon="zi-close-circle-solid" size={34} className="text-red-500" />
                  </Box>
                  <Text.Title size="normal" className="mt-4 font-bold text-[#1a1a1a]">
                    Thanh toán không thành công
                  </Text.Title>
                  <Text size="small" className="mt-1 text-gray-500">
                    Đơn hàng chưa được thanh toán, bạn có thể thử lại
                  </Text>

                  <button
                    type="button"
                    onClick={handleCheckout}
                    className="mt-5 w-full rounded-full border-0 bg-[#1a1a1a] py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
                  >
                    Thử lại
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseFailed}
                    className="mt-2 w-full rounded-full border-0 bg-transparent py-2.5 text-sm font-medium text-gray-400 active:opacity-60"
                  >
                    Đóng
                  </button>
                </>
              )}
            </Box>
          </Box>,
          document.body,
        )}
    </Page>
  );
}

export default CartPage;
