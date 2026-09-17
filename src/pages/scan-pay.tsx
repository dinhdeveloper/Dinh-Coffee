import { useEffect, useRef, useState } from "react";
import { events, EventName, openWebview, scanQRCode } from "zmp-sdk";
import { Box, Icon, Page, Text, useNavigate } from "zmp-ui";
import { ApiError } from "@/services/api";
import { checkoutInStoreOrder, fetchOrderStatus } from "@/services/orders";
import { addOrderToHistory } from "@/services/order-history";

type Phase =
  | "scanning"
  | "confirm"
  | "creating"
  | "waiting"
  | "success"
  | "failed"
  | "invalid";

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
        setErrorMessage(
          `Không mở được camera quét mã (${describeError(err)})`,
        );
        setPhase("invalid");
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
      order = await checkoutInStoreOrder(amount);
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
          paddingTop: "calc(var(--zaui-safe-area-inset-top, 0px) + 20px)",
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

      <Box className="mt-8 flex flex-1 flex-col items-center justify-center gap-4 pb-16 text-center">
        {phase === "scanning" && (
          <>
            <Box className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-[#1a1a1a]" />
            </Box>
            <Text className="font-medium text-gray-600">
              Đang mở camera quét mã...
            </Text>
          </>
        )}

        {phase === "invalid" && (
          <>
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
          </>
        )}

        {(phase === "confirm" || phase === "creating") && (
          <>
            <Box className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
              <Icon icon="zi-qrline" size={30} className="text-[#1a1a1a]" />
            </Box>
            <Text size="small" className="text-gray-500">
              Số tiền cần thanh toán
            </Text>
            <Text.Title size="large" className="font-bold text-[#1a1a1a]">
              {formatPrice(amount)}
            </Text.Title>

            {errorMessage && (
              <Text size="small" className="text-red-500">
                {errorMessage}
              </Text>
            )}

            <button
              type="button"
              onClick={handleConfirmPay}
              disabled={phase === "creating"}
              className="mt-2 w-full max-w-xs rounded-full border-0 bg-[#1a1a1a] py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-70"
            >
              {phase === "creating"
                ? "Đang tạo đơn..."
                : "Thanh toán với ZaloPay"}
            </button>
            <button
              type="button"
              onClick={startScan}
              disabled={phase === "creating"}
              className="w-full max-w-xs rounded-full border-0 bg-transparent py-2 text-sm font-medium text-gray-400 active:opacity-60"
            >
              Quét mã khác
            </button>
          </>
        )}

        {phase === "waiting" && (
          <>
            <Box className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-[#1a1a1a]" />
            </Box>
            <Text.Title size="normal" className="font-bold text-[#1a1a1a]">
              Đang chờ xác nhận thanh toán
            </Text.Title>
            <Text size="small" className="text-gray-500">
              Hoàn tất thanh toán trên ZaloPay rồi quay lại đây
            </Text>
          </>
        )}

        {phase === "success" && (
          <>
            <Box className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <Icon icon="zi-check-circle-solid" size={34} className="text-green-500" />
            </Box>
            <Text.Title size="normal" className="font-bold text-[#1a1a1a]">
              Thanh toán thành công!
            </Text.Title>
            <Text size="small" className="text-gray-500">
              Cảm ơn bạn đã ghé BoomBerry
            </Text>
          </>
        )}

        {phase === "failed" && (
          <>
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
          </>
        )}
      </Box>
    </Page>
  );
}

export default ScanPayPage;
