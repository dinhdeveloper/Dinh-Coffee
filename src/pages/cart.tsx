import { useEffect, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { createPortal } from "react-dom";
import { events, EventName, openWebview } from "zmp-sdk";
import { Box, Icon, Page, Text, useNavigate } from "zmp-ui";
import { CartItem, cartItemsAtom, cartLineKey, cartTotalAtom } from "@/store/cart";
import { ApiError } from "@/services/api";
import {
  checkoutOrder,
  fetchOrderStatus,
  type PaymentMethod,
} from "@/services/orders";
import { addOrderToHistory, announceOrderPaid } from "@/services/order-history";
import { fetchUser } from "@/services/users";
import {
  getStoredZaloUser,
  requestZaloProfile,
  ZALO_AUTH_CHANGED_EVENT,
} from "@/services/zalo-auth";
import {
  AddressInput,
  DeliveryAddress,
  createAddress,
  fetchAddresses,
  getDefaultAddress,
  setDefaultAddress,
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

// Phải khớp với env.pointsRedeemValueVnd / MIN_PAYABLE_AMOUNT ở backend
// (backend/src/controllers/orders.controller.ts) — chỉ dùng để ước tính mức
// giảm giá hiển thị trước cho người dùng, số tiền thật vẫn do backend tính
// và validate lại khi tạo đơn.
const POINTS_REDEEM_VALUE_VND = 100;
const MIN_PAYABLE_AMOUNT = 1000;

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
  onOpenDetail,
}: {
  item: CartItem;
  index: number;
  mounted: boolean;
  removing: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  onOpenDetail: () => void;
}) {
  const lineTotal = parsePrice(item.price) * item.quantity;

  return (
    <Box
      onClick={onOpenDetail}
      className="relative mb-3 flex cursor-pointer gap-3 rounded-2xl border border-white/40 bg-white/15 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.07)] backdrop-blur-xl transition-all duration-300 ease-out"
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
          {item.optionsLabel && (
            <Text size="xSmall" className="mt-0.5 line-clamp-1 text-gray-400">
              {item.optionsLabel}
            </Text>
          )}
        </Box>

        <Box className="flex items-center justify-between">
          <Box className="flex items-center gap-2.5 rounded-full border border-gray-200 bg-white px-1 py-1">
            <button
              type="button"
              aria-label="Giảm số lượng"
              onClick={(e) => {
                e.stopPropagation();
                onDecrease();
              }}
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
              onClick={(e) => {
                e.stopPropagation();
                onIncrease();
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full border-0 btn-liquid p-0 text-white transition-transform active:scale-90"
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
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
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
  const [addressMode, setAddressMode] = useState<"login" | "list" | "form">(
    "login",
  );
  const [addressLoading, setAddressLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [chosenAddressId, setChosenAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<AddressInput>({
    receiver: "",
    phone: "",
    detail: "",
    note: "",
  });
  const [checkoutAddress, setCheckoutAddress] = useState<DeliveryAddress | null>(
    null,
  );
  const [addressError, setAddressError] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("zalopay");
  const pollTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    return () => clearTimeout(pollTimer.current);
  }, []);

  useEffect(() => {
    const loadPoints = () => {
      const user = getStoredZaloUser();
      if (!user) {
        setUserPoints(null);
        return;
      }
      fetchUser(user.id)
        .then((data) => setUserPoints(data.points))
        .catch(() => setUserPoints(null));
    };

    loadPoints();
    window.addEventListener(ZALO_AUTH_CHANGED_EVENT, loadPoints);
    return () => window.removeEventListener(ZALO_AUTH_CHANGED_EVENT, loadPoints);
  }, []);

  const maxRedeemablePoints = userPoints
    ? Math.max(
        0,
        Math.min(
          userPoints,
          Math.floor((total - MIN_PAYABLE_AMOUNT) / POINTS_REDEEM_VALUE_VND),
        ),
      )
    : 0;
  const pointsToRedeem = usePoints ? maxRedeemablePoints : 0;
  const discount = pointsToRedeem * POINTS_REDEEM_VALUE_VND;
  const payableTotal = total - discount;

  const updateQuantity = (lineKey: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) =>
        cartLineKey(item) === lineKey
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const removeItem = (lineKey: string) => {
    setRemovingIds((prev) => [...prev, lineKey]);
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => cartLineKey(item) !== lineKey));
      setRemovingIds((prev) => prev.filter((removingId) => removingId !== lineKey));
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
          announceOrderPaid(orderId);
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

  const loadAddresses = async (userId: string) => {
    setAddressLoading(true);
    try {
      const list = await fetchAddresses(userId);
      setAddresses(list);
      setChosenAddressId(getDefaultAddress(list)?.id ?? null);
      setAddressForm({ receiver: "", phone: "", detail: "", note: "" });
      setAddressMode(list.length === 0 ? "form" : "list");
    } catch {
      setAddressError("Không tải được danh sách địa chỉ, vui lòng thử lại");
    } finally {
      setAddressLoading(false);
    }
  };

  const handleOpenAddress = () => {
    setCheckoutError(null);
    setAddressError(null);
    setPhase("address");

    const user = getStoredZaloUser();
    if (!user) {
      setAddressMode("login");
      return;
    }

    loadAddresses(user.id);
  };

  const handleLoginForAddress = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setAddressError(null);

    try {
      const user = await requestZaloProfile();
      await loadAddresses(user.id);
    } catch {
      setAddressError("Không thể đăng nhập, vui lòng thử lại");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleUseChosenAddress = async () => {
    const user = getStoredZaloUser();
    const chosen = addresses.find((a) => a.id === chosenAddressId);
    if (!user || !chosen) {
      setAddressError("Vui lòng chọn một địa chỉ");
      return;
    }

    if (!chosen.isDefault) {
      setDefaultAddress(user.id, chosen.id).catch(() => {});
    }

    handleCheckout(chosen);
  };

  const handleSaveNewAddress = async () => {
    const user = getStoredZaloUser();
    if (!user) {
      setAddressMode("login");
      return;
    }

    if (
      !addressForm.receiver.trim() ||
      !addressForm.phone.trim() ||
      !addressForm.detail.trim()
    ) {
      setAddressError("Vui lòng nhập đầy đủ tên, số điện thoại và địa chỉ");
      return;
    }

    try {
      const created = await createAddress(user.id, addressForm);

      // Chuyển về chế độ danh sách với địa chỉ vừa tạo được chọn sẵn — nếu
      // bước thanh toán bên dưới thất bại và người dùng bấm thử lại, sẽ dùng
      // lại đúng địa chỉ này (qua handleUseChosenAddress) thay vì tạo trùng.
      setAddresses((prev) => [...prev, created]);
      setChosenAddressId(created.id);
      setAddressMode("list");

      handleCheckout(created);
    } catch {
      setAddressError("Không lưu được địa chỉ, vui lòng thử lại");
    }
  };

  const handleCheckout = async (addressOverride?: DeliveryAddress) => {
    const address = addressOverride ?? checkoutAddress;
    if (!address) return;

    setCheckoutAddress(address);
    setCheckoutError(null);
    setPhase("creating");
    clearTimeout(pollTimer.current);

    let order: Awaited<ReturnType<typeof checkoutOrder>>;
    try {
      order = await checkoutOrder(
        items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          options: item.options,
        })),
        getStoredZaloUser()?.id,
        address,
        pointsToRedeem,
        paymentMethod,
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
      // (ZaloPay/MoMo) ngay trong Mini App thay vì thoát ra app ngoài.
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
          paddingTop: "calc(var(--zaui-safe-area-inset-top, 0px))",
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
            className="mt-2 rounded-full border-0 btn-liquid px-5 py-2.5 text-sm font-medium text-white active:scale-95"
          >
            Khám phá món ngon
          </button>
        </Box>
      ) : (
        <Box className="mt-5 flex-1" style={{ paddingBottom: 96 }}>
          {items.map((item, index) => {
            const lineKey = cartLineKey(item);
            return (
              <CartItemCard
                key={lineKey}
                item={item}
                index={index}
                mounted={mounted}
                removing={removingIds.includes(lineKey)}
                onIncrease={() => updateQuantity(lineKey, 1)}
                onDecrease={() => updateQuantity(lineKey, -1)}
                onRemove={() => removeItem(lineKey)}
                onOpenDetail={() =>
                  navigate(
                    `/product/${item.id}?line=${encodeURIComponent(lineKey)}`,
                  )
                }
              />
            );
          })}
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
            {maxRedeemablePoints > 0 && (
              <button
                type="button"
                onClick={() => setUsePoints((prev) => !prev)}
                className="mb-3 flex w-full items-center justify-between gap-2 rounded-2xl bg-[#FFF4E8] px-3.5 py-2.5 text-left transition-colors active:opacity-80"
              >
                <Box className="flex min-w-0 items-center gap-2">
                  <Text className="text-base leading-none">⭐</Text>
                  <Box className="min-w-0">
                    <Text size="small" className="font-semibold text-[#2f2f2f]">
                      Dùng {maxRedeemablePoints.toLocaleString("vi-VN")} điểm
                      thưởng
                    </Text>
                    <Text size="xSmall" className="text-gray-500">
                      Giảm {formatPrice(maxRedeemablePoints * POINTS_REDEEM_VALUE_VND)}
                      {" · "}
                      còn {(userPoints ?? 0).toLocaleString("vi-VN")} điểm
                    </Text>
                  </Box>
                </Box>

                <span
                  className={`flex h-6 w-11 flex-none items-center rounded-full p-0.5 transition-colors ${
                    usePoints ? "btn-liquid" : "bg-gray-300"
                  }`}
                >
                  <span
                    className="h-5 w-5 rounded-full bg-white shadow-sm transition-transform"
                    style={{
                      transform: usePoints ? "translateX(20px)" : "translateX(0)",
                    }}
                  />
                </span>
              </button>
            )}

            <Box className="mb-3 flex gap-2">
              {(
                [
                  { value: "zalopay", label: "ZaloPay" },
                  { value: "momo", label: "MoMo" },
                ] as const
              ).map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={`flex h-10 flex-1 items-center justify-center rounded-full border text-sm font-medium transition-colors active:opacity-80 ${
                    paymentMethod === method.value
                      ? "border-transparent btn-liquid text-white"
                      : "border-gray-200 bg-white text-[#2f2f2f]"
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </Box>

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
                {discount > 0 && (
                  <Text size="xSmall" className="text-gray-400 line-through">
                    {formatPrice(total)}
                  </Text>
                )}
                <Text.Title size="normal" className="font-bold text-[#1a1a1a]">
                  {formatPrice(payableTotal)}
                </Text.Title>
              </Box>

              <button
                type="button"
                onClick={handleOpenAddress}
                disabled={phase === "creating" || phase === "waiting"}
                className="relative flex h-11 flex-none items-center justify-center gap-2 overflow-hidden rounded-full border-0 btn-liquid px-6 text-sm font-medium text-white transition-transform active:scale-95 disabled:opacity-80"
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
          ADDRESS OVERLAY — chọn từ danh sách hoặc thêm mới
      ========================== */}
      {phase === "address" &&
        createPortal(
          <Box className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50">
            <Box
              className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5"
              style={{
                paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
              }}
            >
              {addressMode === "login" ? (
                <Box className="flex flex-col items-center gap-3 py-6 text-center">
                  <Box className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                    <Icon icon="zi-location" size={26} className="text-gray-400" />
                  </Box>
                  <Text.Title size="normal" className="font-bold text-[#1a1a1a]">
                    Đăng nhập để chọn địa chỉ
                  </Text.Title>
                  <Text size="small" className="text-gray-500">
                    Địa chỉ giao hàng được lưu theo tài khoản Zalo của bạn
                  </Text>

                  {addressError && (
                    <Text size="small" className="text-red-500">
                      {addressError}
                    </Text>
                  )}

                  <button
                    type="button"
                    onClick={handleLoginForAddress}
                    disabled={isLoggingIn}
                    className="mt-2 w-full rounded-full border-0 btn-liquid py-3 text-sm font-medium text-white active:scale-95 disabled:opacity-80"
                  >
                    {isLoggingIn ? "Đang đăng nhập..." : "Đăng nhập với Zalo"}
                  </button>
                </Box>
              ) : addressLoading ? (
                <Box className="flex flex-col items-center gap-3 py-10">
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-[#006AF5]" />
                  <Text size="small" className="text-gray-400">
                    Đang tải địa chỉ...
                  </Text>
                </Box>
              ) : addressMode === "list" ? (
                <>
                  <Text.Title size="normal" className="font-bold text-[#1a1a1a]">
                    Chọn địa chỉ giao hàng
                  </Text.Title>

                  <Box className="mt-4 flex flex-col gap-2.5">
                    {addresses.map((item) => {
                      const isSelected = item.id === chosenAddressId;
                      return (
                        <Box
                          key={item.id}
                          onClick={() => setChosenAddressId(item.id)}
                          className={`cursor-pointer rounded-2xl border p-3 transition-colors ${
                            isSelected
                              ? "border-[#006AF5] bg-white shadow-[0_8px_20px_rgba(0,0,0,0.08)]"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <Box className="flex items-start gap-3">
                            <Box
                              className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${
                                isSelected
                                  ? "border-[#006AF5] btn-liquid"
                                  : "border-gray-300"
                              }`}
                            >
                              {isSelected && (
                                <Icon icon="zi-check" size={12} className="text-white" />
                              )}
                            </Box>
                            <Box className="min-w-0 flex-1">
                              <Text size="small" className="font-bold text-[#1a1a1a]">
                                {item.receiver} · {item.phone}
                              </Text>
                              <Text size="small" className="mt-0.5 text-gray-500">
                                {item.detail}
                              </Text>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>

                  <button
                    type="button"
                    onClick={() => {
                      setAddressError(null);
                      setAddressForm({ receiver: "", phone: "", detail: "", note: "" });
                      setAddressMode("form");
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-gray-300 bg-transparent py-3 text-sm font-medium text-gray-500 active:opacity-60"
                  >
                    <Icon icon="zi-plus" size={16} />
                    Thêm địa chỉ mới
                  </button>

                  {(addressError || checkoutError) && (
                    <Text size="small" className="mt-3 text-red-500">
                      {addressError || checkoutError}
                    </Text>
                  )}

                  <button
                    type="button"
                    onClick={handleUseChosenAddress}
                    className="mt-4 w-full rounded-full border-0 btn-liquid py-3 text-sm font-medium text-white transition-transform active:scale-[0.98]"
                  >
                    Dùng địa chỉ này
                  </button>
                </>
              ) : (
                <>
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
                      value={addressForm.receiver}
                      onChange={(e) =>
                        setAddressForm((prev) => ({ ...prev, receiver: e.target.value }))
                      }
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#1a1a1a] outline-none focus:border-[#006AF5]"
                    />
                    <input
                      type="tel"
                      placeholder="Số điện thoại"
                      value={addressForm.phone}
                      onChange={(e) =>
                        setAddressForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#1a1a1a] outline-none focus:border-[#006AF5]"
                    />
                    <input
                      type="text"
                      placeholder="Địa chỉ nhận hàng (số nhà, đường, phường/xã...)"
                      value={addressForm.detail}
                      onChange={(e) =>
                        setAddressForm((prev) => ({ ...prev, detail: e.target.value }))
                      }
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#1a1a1a] outline-none focus:border-[#006AF5]"
                    />
                    <input
                      type="text"
                      placeholder="Ghi chú (không bắt buộc)"
                      value={addressForm.note}
                      onChange={(e) =>
                        setAddressForm((prev) => ({ ...prev, note: e.target.value }))
                      }
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#1a1a1a] outline-none focus:border-[#006AF5]"
                    />
                  </Box>

                  {(addressError || checkoutError) && (
                    <Text size="small" className="mt-3 text-red-500">
                      {addressError || checkoutError}
                    </Text>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveNewAddress}
                    className="mt-4 w-full rounded-full border-0 btn-liquid py-3 text-sm font-medium text-white transition-transform active:scale-[0.98]"
                  >
                    Tiếp tục thanh toán
                  </button>

                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddressError(null);
                        setAddressMode("list");
                      }}
                      className="mt-2 w-full rounded-full border-0 bg-transparent py-2.5 text-sm font-medium text-gray-500 active:opacity-60"
                    >
                      Quay lại danh sách địa chỉ
                    </button>
                  )}
                </>
              )}

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
                    <span className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-[#006AF5]" />
                  </Box>
                  <Text.Title size="normal" className="mt-4 font-bold text-[#1a1a1a]">
                    Đang chờ xác nhận thanh toán
                  </Text.Title>
                  <Text size="small" className="mt-1 text-gray-500">
                    Hoàn tất thanh toán trên {paymentMethod === "momo" ? "MoMo" : "ZaloPay"} rồi quay lại đây
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
                    onClick={() => handleCheckout()}
                    className="mt-5 w-full rounded-full border-0 btn-liquid py-3 text-sm font-medium text-white transition-transform active:scale-[0.98]"
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
