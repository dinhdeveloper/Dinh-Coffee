import { useEffect, useState } from "react";
import { Box, Icon, Page, Text, useNavigate, useSnackbar } from "zmp-ui";
import { getOrderHistory } from "@/services/order-history";
import { fetchOrderStatus, Order } from "@/services/orders";
import {
  getStoredZaloUser,
  requestZaloProfile,
  ZALO_AUTH_CHANGED_EVENT,
  type ZaloAuthUser,
} from "@/services/zalo-auth";

function formatPrice(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("vi-VN");
}

const STATUS_LABEL: Record<Order["status"], string> = {
  paid: "Đã thanh toán",
  pending: "Đang xử lý",
  failed: "Thất bại",
};

const STATUS_STYLE: Record<Order["status"], string> = {
  paid: "bg-green-50 text-green-600",
  pending: "bg-yellow-50 text-yellow-600",
  failed: "bg-red-50 text-red-500",
};

function OrdersPage() {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const [user, setUser] = useState<ZaloAuthUser | null>(() =>
    getStoredZaloUser(),
  );
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncUser = () => setUser(getStoredZaloUser());
    window.addEventListener(ZALO_AUTH_CHANGED_EVENT, syncUser);
    return () => window.removeEventListener(ZALO_AUTH_CHANGED_EVENT, syncUser);
  }, []);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);

    try {
      const nextUser = await requestZaloProfile();
      setUser(nextUser);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Không đăng nhập được Zalo:", error);
      openSnackbar({
        text: "Không thể đăng nhập — vui lòng thử lại.",
        type: "error",
        position: "top",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const ids = getOrderHistory();

    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    Promise.allSettled(ids.map((id) => fetchOrderStatus(id))).then(
      (results) => {
        if (cancelled) return;

        const fetched = results
          .filter(
            (result): result is PromiseFulfilledResult<Order> =>
              result.status === "fulfilled",
          )
          .map((result) => result.value)
          .sort((a, b) => b.createdAt - a.createdAt);

        setOrders(fetched);
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [user]);

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
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-white/80 text-[#141415] shadow-[0_8px_22px_rgba(0,0,0,0.10)]"
        >
          <Icon icon="zi-arrow-left" size={22} />
        </button>

        <Text.Title size="normal" className="truncate font-bold">
          Đơn hàng của tôi
        </Text.Title>
      </Box>

      {!user ? (
        <Box className="flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
          <Box className="flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-white/10 text-3xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl">
            🔒
          </Box>
          <Text className="font-medium text-gray-600">
            Đăng nhập để xem đơn hàng của bạn
          </Text>
          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="mt-2 rounded-full border-0 bg-[#1a1a1a] px-5 py-2.5 text-sm font-semibold text-white active:scale-95 disabled:opacity-80"
          >
            {isLoggingIn ? "Đang đăng nhập..." : "Đăng nhập với Zalo"}
          </button>
        </Box>
      ) : loading ? (
        <Box className="mt-5 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              className="h-24 w-full animate-pulse rounded-2xl bg-gray-200"
            />
          ))}
        </Box>
      ) : orders.length === 0 ? (
        <Box className="flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
          <Box className="flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-white/10 text-3xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl">
            🧾
          </Box>
          <Text className="font-medium text-gray-600">
            Bạn chưa có đơn hàng nào
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
        <Box className="mt-5 flex flex-col gap-3 pb-6">
          {orders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => navigate(`/order/${order.id}`)}
              className="flex w-full flex-col rounded-2xl bg-white p-4 text-left shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-transform active:scale-[0.98]"
            >
              <Box className="flex items-center justify-between">
                <Text size="small" className="font-bold text-[#1a1a1a]">
                  #{order.id}
                </Text>
                <Text
                  size="xSmall"
                  className={`rounded-full px-2.5 py-1 font-semibold ${STATUS_STYLE[order.status]}`}
                >
                  {STATUS_LABEL[order.status]}
                </Text>
              </Box>

              <Text size="xSmall" className="mt-1 text-gray-400">
                {formatDateTime(order.createdAt)} · {order.items.length} sản phẩm
              </Text>

              <Box className="mt-2 flex items-center justify-between">
                <Text size="small" className="font-bold text-red-500">
                  {formatPrice(order.amount)}
                </Text>
                <Icon icon="zi-chevron-right" size={16} className="text-gray-300" />
              </Box>
            </button>
          ))}
        </Box>
      )}
    </Page>
  );
}

export default OrdersPage;
