import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Box, Icon, Page, Text, useNavigate, useParams, useSnackbar } from "zmp-ui";
import { cancelOrder, fetchOrderStatus, Order, OrderStage } from "@/services/orders";

function formatPrice(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function parsePrice(price: string) {
  return Number(price.replace(/[^\d]/g, ""));
}

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("vi-VN");
}

const STATUS_LABEL: Record<Order["status"], string> = {
  paid: "Thanh toán thành công",
  pending: "Đang chờ thanh toán",
  failed: "Thanh toán thất bại",
  cancelled: "Đã huỷ",
};

const STATUS_STYLE: Record<Order["status"], string> = {
  paid: "bg-green-50 text-green-600",
  pending: "bg-yellow-50 text-yellow-600",
  failed: "bg-red-50 text-red-500",
  cancelled: "bg-gray-100 text-gray-500",
};

const STATUS_VISUAL: Record<Order["status"], { bg: string; icon: string; color: string }> = {
  paid: { bg: "bg-green-50", icon: "zi-check-circle-solid", color: "text-green-500" },
  pending: { bg: "bg-yellow-50", icon: "zi-clock-1", color: "text-yellow-500" },
  failed: { bg: "bg-red-50", icon: "zi-close-circle-solid", color: "text-red-500" },
  cancelled: { bg: "bg-gray-100", icon: "zi-close-circle", color: "text-gray-400" },
};

const STAGE_SEQUENCE: OrderStage[] = [
  "confirmed",
  "preparing",
  "delivering",
  "completed",
];

const STAGE_META: Record<OrderStage, { label: string; icon: string }> = {
  confirmed: { label: "Quán đã nhận đơn", icon: "zi-check-circle" },
  preparing: { label: "Quán đang làm món", icon: "zi-clock-1" },
  delivering: { label: "Đang giao hàng", icon: "zi-location" },
  completed: { label: "Hoàn tất", icon: "zi-check-circle-solid" },
};

// Tự cập nhật lại trang mỗi 1 phút khi đơn đang trong quá trình chuẩn bị,
// để khớp với nhịp tiến độ 1 phút/bước mà backend tính (advanceOrderStage).
const STAGE_POLL_INTERVAL_MS = 60_000;

function OrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { openSnackbar } = useSnackbar();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    setLoading(true);
    setError(false);

    fetchOrderStatus(id)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Đơn đã thanh toán nhưng chưa "completed" — quán vẫn đang xử lý, tự
  // refetch mỗi phút để cập nhật tình trạng (quán nhận đơn → làm món →
  // giao hàng → hoàn tất) mà không cần người dùng bấm làm mới thủ công.
  useEffect(() => {
    clearInterval(pollTimer.current);

    if (!id || !order || order.status !== "paid" || order.stage === "completed") {
      return;
    }

    pollTimer.current = setInterval(() => {
      fetchOrderStatus(id)
        .then(setOrder)
        .catch(() => {});
    }, STAGE_POLL_INTERVAL_MS);

    return () => clearInterval(pollTimer.current);
  }, [id, order]);

  const handleCancelOrder = async () => {
    if (!id || cancelling) return;
    setCancelling(true);

    try {
      const updated = await cancelOrder(id);
      setOrder(updated);
      setShowCancelConfirm(false);
      openSnackbar({
        text: "Đã huỷ đơn hàng",
        type: "success",
        position: "top",
      });
    } catch {
      openSnackbar({
        text: "Không huỷ được đơn hàng, vui lòng thử lại",
        type: "error",
        position: "top",
      });
    } finally {
      setCancelling(false);
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
          paddingTop: "calc(var(--zaui-safe-area-inset-top, 0px))",
        }}
      >
        <button
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate("/home")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-white/80 text-[#141415] shadow-[0_8px_22px_rgba(0,0,0,0.10)]"
        >
          <Icon icon="zi-arrow-left" size={22} />
        </button>

        <Text.Title size="normal" className="truncate font-bold">
          Chi tiết đơn hàng
        </Text.Title>
      </Box>

      {loading ? (
        <Box className="mt-6 h-52 w-full animate-pulse rounded-3xl bg-gray-200" />
      ) : error || !order ? (
        <Box className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <Text className="font-medium text-gray-600">
            Không tải được thông tin đơn hàng
          </Text>
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="mt-2 rounded-full border-0 bg-[#1a1a1a] px-5 py-2.5 text-sm font-semibold text-white active:scale-95"
          >
            Về trang chủ
          </button>
        </Box>
      ) : (
        <>
          <Box className="mt-5 flex-none rounded-3xl bg-white p-5 text-center shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            <Box
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${STATUS_VISUAL[order.status].bg}`}
            >
              <Icon
                icon={STATUS_VISUAL[order.status].icon as any}
                size={34}
                className={STATUS_VISUAL[order.status].color}
              />
            </Box>

            <Text.Title size="normal" className="mt-3 font-bold text-[#1a1a1a]">
              {STATUS_LABEL[order.status]}
            </Text.Title>
            <Text.Title size="large" className="mt-1 font-bold text-[#1a1a1a]">
              {formatPrice(order.amount)}
            </Text.Title>

            {order.status === "pending" && (
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="mt-4 w-full rounded-full border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-500 transition-transform active:scale-[0.98]"
              >
                Huỷ đơn hàng
              </button>
            )}
          </Box>

          {/* =========================
              FULFILLMENT STAGE TRACKER
          ========================== */}
          {order.status === "paid" && order.stage && (
            <Box className="mt-4 flex-none rounded-3xl bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
              <Text size="small" className="font-bold text-[#1a1a1a]">
                Tình trạng đơn hàng
              </Text>

              <Box className="mt-4 flex flex-col">
                {STAGE_SEQUENCE.map((stage, index) => {
                  const currentIndex = STAGE_SEQUENCE.indexOf(order.stage!);
                  const isDone = index < currentIndex;
                  const isCurrent = index === currentIndex;
                  const isLast = index === STAGE_SEQUENCE.length - 1;
                  const meta = STAGE_META[stage];

                  return (
                    <Box key={stage} className="flex items-start gap-3">
                      <Box className="flex flex-none flex-col items-center">
                        <Box
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            isDone || isCurrent
                              ? "bg-[#1a1a1a] text-white"
                              : "bg-gray-100 text-gray-300"
                          }`}
                        >
                          <Icon icon={meta.icon as any} size={16} />
                        </Box>
                        {!isLast && (
                          <Box
                            className={`my-0.5 h-8 w-0.5 ${
                              isDone ? "bg-[#1a1a1a]" : "bg-gray-100"
                            }`}
                          />
                        )}
                      </Box>

                      <Box className={isLast ? "" : "pb-6"}>
                        <Text
                          size="small"
                          className={
                            isDone || isCurrent
                              ? "mt-1 font-bold text-[#1a1a1a]"
                              : "mt-1 font-medium text-gray-400"
                          }
                        >
                          {meta.label}
                        </Text>
                        {isCurrent && !isLast && (
                          <Text size="xSmall" className="mt-0.5 text-gray-400">
                            Đang cập nhật, vui lòng chờ trong giây lát...
                          </Text>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* =========================
              TRANSACTION INFO
          ========================== */}
          <Box className="mt-4 flex-none rounded-3xl bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <Text size="small" className="font-bold text-[#1a1a1a]">
              Thông tin giao dịch
            </Text>

            <Box className="mt-3 flex items-center justify-between">
              <Text size="small" className="text-gray-500">
                Mã đơn hàng
              </Text>
              <Text size="small" className="font-semibold text-[#1a1a1a]">
                {order.id}
              </Text>
            </Box>

            <Box className="mt-2 flex items-center justify-between">
              <Text size="small" className="text-gray-500">
                Thời gian
              </Text>
              <Text size="small" className="font-semibold text-[#1a1a1a]">
                {formatDateTime(order.createdAt)}
              </Text>
            </Box>

            <Box className="mt-2 flex items-center justify-between">
              <Text size="small" className="text-gray-500">
                Phương thức
              </Text>
              <Text size="small" className="font-semibold text-[#1a1a1a]">
                ZaloPay
              </Text>
            </Box>

            {order.discount > 0 && (
              <>
                <Box className="mt-2 flex items-center justify-between">
                  <Text size="small" className="text-gray-500">
                    Tạm tính
                  </Text>
                  <Text size="small" className="font-semibold text-[#1a1a1a]">
                    {formatPrice(order.subtotal)}
                  </Text>
                </Box>

                <Box className="mt-2 flex items-center justify-between">
                  <Text size="small" className="text-gray-500">
                    Giảm giá ({order.pointsUsed.toLocaleString("vi-VN")} điểm)
                  </Text>
                  <Text size="small" className="font-semibold text-red-500">
                    -{formatPrice(order.discount)}
                  </Text>
                </Box>
              </>
            )}

            <Box className="mt-2 flex items-center justify-between">
              <Text size="small" className="text-gray-500">
                Trạng thái
              </Text>
              <Text
                size="xSmall"
                className={`rounded-full px-2.5 py-1 font-semibold ${STATUS_STYLE[order.status]}`}
              >
                {STATUS_LABEL[order.status]}
              </Text>
            </Box>
          </Box>

          {order.address && (
            <Box className="mt-4 flex-none rounded-3xl bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
              <Text size="small" className="font-bold text-[#1a1a1a]">
                Giao đến
              </Text>

              <Text size="small" className="mt-2 font-semibold text-[#1a1a1a]">
                {order.address.receiver} · {order.address.phone}
              </Text>
              <Text size="small" className="mt-0.5 text-gray-500">
                {order.address.detail}
              </Text>
              {order.address.note && (
                <Text size="xSmall" className="mt-1 text-gray-400">
                  Ghi chú: {order.address.note}
                </Text>
              )}
            </Box>
          )}

          {/* =========================
              ITEMS
          ========================== */}
          <Box className="mt-4 flex-none rounded-3xl bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <Text size="small" className="font-bold text-[#1a1a1a]">
              Sản phẩm ({order.items.length})
            </Text>

            {order.items.map((item, index) => (
              <Box
                key={`${item.id}-${index}`}
                className="mt-3 flex items-center justify-between gap-3"
              >
                <Box className="min-w-0 flex-1">
                  <Text size="small" className="line-clamp-1 font-medium text-[#2f2f2f]">
                    {item.title}
                  </Text>
                  <Text size="xSmall" className="text-gray-400">
                    {item.price} × {item.quantity}
                  </Text>
                  {item.optionsLabel && (
                    <Text size="xSmall" className="text-gray-400">
                      {item.optionsLabel}
                    </Text>
                  )}
                </Box>
                <Text size="small" className="flex-none font-bold text-[#1a1a1a]">
                  {formatPrice(parsePrice(item.price) * item.quantity)}
                </Text>
              </Box>
            ))}
          </Box>
        </>
      )}

      {/* =========================
          CANCEL CONFIRM OVERLAY
      ========================== */}
      {showCancelConfirm &&
        createPortal(
          <Box className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-8">
            <Box className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
              <Box className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <Icon icon="zi-close-circle" size={34} className="text-red-500" />
              </Box>
              <Text.Title size="normal" className="mt-4 font-bold text-[#1a1a1a]">
                Huỷ đơn hàng này?
              </Text.Title>
              <Text size="small" className="mt-1 text-gray-500">
                Đơn chưa thanh toán sẽ được huỷ, điểm thưởng đã dùng (nếu có) sẽ
                được hoàn lại ngay.
              </Text>

              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="mt-5 w-full rounded-full border-0 bg-red-500 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-80"
              >
                {cancelling ? "Đang huỷ..." : "Huỷ đơn"}
              </button>

              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelling}
                className="mt-2 w-full rounded-full border-0 bg-transparent py-2.5 text-sm font-medium text-gray-400 active:opacity-60"
              >
                Đóng
              </button>
            </Box>
          </Box>,
          document.body,
        )}
    </Page>
  );
}

export default OrderDetailPage;
