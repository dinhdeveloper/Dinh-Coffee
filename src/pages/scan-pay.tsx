import { useEffect, useRef, useState } from "react";
import { events, EventName, openWebview, scanQRCode } from "zmp-sdk";
import { Box, Icon, Page, Text, useNavigate } from "zmp-ui";
import { ApiError } from "@/services/api";
import { checkoutInStoreOrder, fetchOrderStatus } from "@/services/orders";
import { addOrderToHistory } from "@/services/order-history";
import { getStoredZaloUser } from "@/services/zalo-auth";

type Phase =
  | "scanning"
  | "closed"
  | "confirm"
  | "creating"
  | "waiting"
  | "success"
  | "failed"
  | "invalid";

type PaymentMethod = {
  id: string;
  label: string;
  description: string;
  badge: string;
  badgeClassName: string;
  active: boolean;
};

// Danh sách phương thức thanh toán hiện có trong hệ sinh thái Zalo Mini App —
// hiện tại chỉ ZaloPay được kích hoạt để xử lý giao dịch thật, các phương
// thức còn lại hiển thị sẵn giao diện nhưng khoá lại (sắp ra mắt).
const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "zalopay",
    label: "ZaloPay",
    description: "Thanh toán qua ví ZaloPay",
    badge: "Z",
    badgeClassName: "bg-gradient-to-br from-[#0068FF] to-[#00C3FF] text-white",
    active: true,
  },
  {
    id: "atm",
    label: "Thẻ ATM nội địa",
    description: "Napas / thẻ ngân hàng nội địa",
    badge: "🏧",
    badgeClassName: "bg-gray-100 text-[#2f2f2f]",
    active: false,
  },
  {
    id: "visa",
    label: "Visa / Mastercard",
    description: "Thẻ tín dụng, ghi nợ quốc tế",
    badge: "💳",
    badgeClassName: "bg-gray-100 text-[#2f2f2f]",
    active: false,
  },
  {
    id: "momo",
    label: "Ví MoMo",
    description: "Thanh toán qua ví MoMo",
    badge: "M",
    badgeClassName: "bg-pink-50 text-pink-500",
    active: false,
  },
  {
    id: "cash",
    label: "Tiền mặt",
    description: "Thanh toán trực tiếp tại quầy",
    badge: "💵",
    badgeClassName: "bg-gray-100 text-[#2f2f2f]",
    active: false,
  },
];

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

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
  }
  return String(err);
}

function formatPrice(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

// Mã QR do cửa hàng phát hành chứa số tiền cần thanh toán — chỉ lấy phần
// chữ số trong nội dung quét được (vd. "50000", "Thanh toan 50000d"...).
function parseAmountFromQr(content: string): number | null {
  const digits = content.replace(/[^\d]/g, "");
  if (!digits) return null;
  const amount = Number(digits);
  return amount >= 1000 ? amount : null;
}

function ScanPayPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("scanning");
  const [amount, setAmount] = useState(0);
  const [methodId, setMethodId] = useState("zalopay");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => clearTimeout(pollTimer.current);
  }, []);

  const startScan = () => {
    setPhase("scanning");
    setErrorMessage(null);

    scanQRCode()
      .then(({ content }) => {
        const parsed = parseAmountFromQr(content);

        if (!parsed) {
          setPhase("invalid");
          return;
        }

        setAmount(parsed);
        setPhase("confirm");
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("scanQRCode error/cancel:", describeError(err));
        setPhase("closed");
      });
  };

  useEffect(() => {
    startScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pollOrderStatus = (orderId: string, startedAt: number) => {
    fetchOrderStatus(orderId)
      .then((order) => {
        if (order.status === "paid") {
          addOrderToHistory(orderId);
          setPhase("success");
          setTimeout(() => navigate(`/order/${orderId}`), 1600);
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

  const handleConfirmPay = async () => {
    setErrorMessage(null);
    setPhase("creating");

    let order: Awaited<ReturnType<typeof checkoutInStoreOrder>>;
    try {
      order = await checkoutInStoreOrder(amount, getStoredZaloUser()?.id);
    } catch (err) {
      setPhase("confirm");
      setErrorMessage(
        err instanceof ApiError
          ? err.message
          : `Không kết nối được tới máy chủ (${describeError(err)})`,
      );
      return;
    }

    try {
      await openWebview({
        url: order.orderUrl,
        config: { style: "bottomSheet" },
      });
      setPhase("waiting");

      events.once(EventName.WebviewClosed, () => {
        pollOrderStatus(order.orderId, Date.now());
      });
    } catch (err) {
      setPhase("confirm");
      setErrorMessage(
        `Không thể mở giao diện thanh toán (${describeError(err)})`,
      );
    }
  };

  return (
    <Page
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-transparent px-4 py-2 hide-scrollbar"
      style={{
        paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
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

        <Text.Title size="normal" className="truncate font-bold">
          Thanh toán tại cửa hàng
        </Text.Title>
      </Box>

      {/* =========================
          SCANNING
      ========================== */}
      {phase === "scanning" && (
        <Box className="mt-8 flex flex-1 flex-col items-center justify-center gap-5 pb-16 text-center">
          <Box className="relative flex h-56 w-56 items-center justify-center">
            <Box className="absolute inset-0 rounded-3xl border-2 border-dashed border-gray-300" />
            <Box className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-[#1a1a1a]" />
            <Box className="absolute -right-1 -top-1 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-[#1a1a1a]" />
            <Box className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-[#1a1a1a]" />
            <Box className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-[#1a1a1a]" />
            <Icon icon="zi-qrline" size={64} className="text-gray-300" />
          </Box>
          <Box className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[#1a1a1a]" />
            <Text className="font-medium text-gray-600">
              Đang mở camera quét mã...
            </Text>
          </Box>
        </Box>
      )}

      {/* =========================
          CAMERA CLOSED (người dùng tự đóng, không phải lỗi)
      ========================== */}
      {phase === "closed" && (
        <Box className="mt-8 flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
          <Box className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Icon icon="zi-qrline" size={30} className="text-gray-400" />
          </Box>
          <Text.Title size="normal" className="font-bold text-[#1a1a1a]">
            Camera đã đóng
          </Text.Title>
          <Text size="small" className="text-gray-500">
            Mở lại camera để quét mã thanh toán
          </Text>
          <button
            type="button"
            onClick={startScan}
            className="mt-2 rounded-full border-0 bg-[#1a1a1a] px-6 py-3 text-sm font-semibold text-white active:scale-95"
          >
            Mở camera thanh toán
          </button>
        </Box>
      )}

      {/* =========================
          INVALID / ERROR
      ========================== */}
      {phase === "invalid" && (
        <Box className="mt-8 flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
          <Box className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <Icon icon="zi-close-circle-solid" size={34} className="text-red-500" />
          </Box>
          <Text.Title size="normal" className="font-bold text-[#1a1a1a]">
            Không đọc được mã
          </Text.Title>
          <Text size="small" className="text-gray-500">
            {errorMessage ||
              "Mã QR không chứa số tiền hợp lệ, vui lòng thử lại"}
          </Text>
          <button
            type="button"
            onClick={startScan}
            className="mt-2 rounded-full border-0 bg-[#1a1a1a] px-6 py-3 text-sm font-semibold text-white active:scale-95"
          >
            Quét lại
          </button>
        </Box>
      )}

      {/* =========================
          CONFIRM + PAYMENT METHOD
      ========================== */}
      {(phase === "confirm" || phase === "creating") && (
        <Box className="mt-5 flex-1 pb-6">
          <Box className="rounded-3xl bg-gradient-to-br from-[#1a1a1a] to-[#3a3a3a] p-5 text-center text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
            <Text size="small" className="text-white/60">
              Số tiền cần thanh toán
            </Text>
            <Text.Title size="large" className="mt-1 font-bold text-white">
              {formatPrice(amount)}
            </Text.Title>

            <button
              type="button"
              onClick={startScan}
              disabled={phase === "creating"}
              className="mx-auto mt-3 flex items-center gap-1 rounded-full border-0 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 active:opacity-70"
            >
              <Icon icon="zi-qrline" size={14} />
              Quét mã khác
            </button>
          </Box>

          <Text size="small" className="mb-2 mt-5 font-bold text-[#1a1a1a]">
            Phương thức thanh toán
          </Text>

          <Box className="flex flex-col gap-2.5">
            {PAYMENT_METHODS.map((method) => {
              const isSelected = methodId === method.id;

              return (
                <button
                  key={method.id}
                  type="button"
                  disabled={!method.active || phase === "creating"}
                  onClick={() => setMethodId(method.id)}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-150 ${
                    method.active
                      ? isSelected
                        ? "border-[#1a1a1a] bg-white shadow-[0_8px_20px_rgba(0,0,0,0.08)]"
                        : "border-transparent bg-white shadow-[0_4px_14px_rgba(0,0,0,0.05)] active:scale-[0.98]"
                      : "border-transparent bg-white/60 opacity-60"
                  }`}
                >
                  <Box
                    className={`flex h-10 w-10 flex-none items-center justify-center rounded-full text-base font-bold ${method.badgeClassName}`}
                  >
                    {method.badge}
                  </Box>

                  <Box className="min-w-0 flex-1">
                    <Text size="small" className="font-bold text-[#1a1a1a]">
                      {method.label}
                    </Text>
                    <Text size="xSmall" className="mt-0.5 text-gray-400">
                      {method.description}
                    </Text>
                  </Box>

                  {method.active ? (
                    <Box
                      className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${
                        isSelected
                          ? "border-[#1a1a1a] bg-[#1a1a1a]"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <Icon icon="zi-check" size={12} className="text-white" />
                      )}
                    </Box>
                  ) : (
                    <Box className="flex flex-none items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
                      <Icon icon="zi-lock" size={11} className="text-gray-400" />
                      <Text size="xxSmall" className="font-medium text-gray-400">
                        Sắp ra mắt
                      </Text>
                    </Box>
                  )}
                </button>
              );
            })}
          </Box>

          {errorMessage && (
            <Text size="small" className="mt-3 text-center text-red-500">
              {errorMessage}
            </Text>
          )}

          <button
            type="button"
            onClick={handleConfirmPay}
            disabled={phase === "creating"}
            className="relative mt-5 flex h-12 w-full items-center justify-center overflow-hidden rounded-full border-0 bg-[#1a1a1a] text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-80"
          >
            <span
              className="flex items-center gap-2 transition-all duration-300"
              style={{
                opacity: phase === "creating" ? 0 : 1,
                transform:
                  phase === "creating" ? "translateY(-16px)" : "translateY(0)",
              }}
            >
              Thanh toán {formatPrice(amount)}
            </span>
            <span
              className="absolute inset-0 flex items-center justify-center transition-all duration-300"
              style={{
                opacity: phase === "creating" ? 1 : 0,
                transform:
                  phase === "creating" ? "translateY(0)" : "translateY(16px)",
              }}
            >
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            </span>
          </button>
        </Box>
      )}

      {/* =========================
          WAITING
      ========================== */}
      {phase === "waiting" && (
        <Box className="mt-8 flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
          <Box className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-[#1a1a1a]" />
          </Box>
          <Text.Title size="normal" className="font-bold text-[#1a1a1a]">
            Đang chờ xác nhận thanh toán
          </Text.Title>
          <Text size="small" className="text-gray-500">
            Hoàn tất thanh toán trên ZaloPay rồi quay lại đây
          </Text>
        </Box>
      )}

      {/* =========================
          SUCCESS
      ========================== */}
      {phase === "success" && (
        <Box className="mt-8 flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
          <Box className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <Icon icon="zi-check-circle-solid" size={34} className="text-green-500" />
          </Box>
          <Text.Title size="normal" className="font-bold text-[#1a1a1a]">
            Thanh toán thành công!
          </Text.Title>
          <Text size="small" className="text-gray-500">
            Cảm ơn bạn đã ghé BoomBerry
          </Text>
        </Box>
      )}

      {/* =========================
          FAILED
      ========================== */}
      {phase === "failed" && (
        <Box className="mt-8 flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
          <Box className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <Icon icon="zi-close-circle-solid" size={34} className="text-red-500" />
          </Box>
          <Text.Title size="normal" className="font-bold text-[#1a1a1a]">
            Thanh toán không thành công
          </Text.Title>
          <button
            type="button"
            onClick={handleConfirmPay}
            className="mt-2 rounded-full border-0 bg-[#1a1a1a] px-6 py-3 text-sm font-semibold text-white active:scale-95"
          >
            Thử lại
          </button>
        </Box>
      )}
    </Page>
  );
}

export default ScanPayPage;
