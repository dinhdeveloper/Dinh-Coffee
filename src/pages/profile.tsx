import { useEffect, useState } from "react";
import { Avatar, Box, Icon, Page, Text, useNavigate, useSnackbar } from "zmp-ui";

import {
  getStoredZaloUser,
  logoutZaloProfile,
  requestZaloPhoneNumber,
  requestZaloProfile,
  ZALO_AUTH_CHANGED_EVENT,
  type ZaloAuthUser,
} from "@/services/zalo-auth";
import { fetchUser } from "@/services/users";
import { DeliveryAddress, fetchAddresses, getDefaultAddress } from "@/services/address";

type MenuItem = {
  icon: string;
  bg: string;
  label: string;
  description: string;
  onClick: () => void;
};

function ProfilePage() {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const [user, setUser] = useState<ZaloAuthUser | null>(() =>
    getStoredZaloUser(),
  );
  const [points, setPoints] = useState<number | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingPhone, setIsAddingPhone] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [defaultAddress, setDefaultAddress] = useState<DeliveryAddress | null>(
    null,
  );

  useEffect(() => {
    const syncUser = () => setUser(getStoredZaloUser());

    window.addEventListener(ZALO_AUTH_CHANGED_EVENT, syncUser);

    return () => window.removeEventListener(ZALO_AUTH_CHANGED_EVENT, syncUser);
  }, []);

  useEffect(() => {
    if (!user) {
      setPoints(null);
      setPhone(null);
      return;
    }

    let cancelled = false;

    fetchUser(user.id)
      .then((data) => {
        if (!cancelled) {
          setPoints(data.points);
          setPhone(data.phone ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setPoints(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setDefaultAddress(null);
      return;
    }

    let cancelled = false;

    fetchAddresses(user.id)
      .then((data) => {
        if (!cancelled) setDefaultAddress(getDefaultAddress(data));
      })
      .catch(() => {
        if (!cancelled) setDefaultAddress(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const showMessage = (text: string, type: "success" | "error" | "info") => {
    openSnackbar({
      text,
      type,
      position: "top",
    });
  };

  const handleLogin = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const nextUser = await requestZaloProfile();

      setUser(nextUser);
      showMessage("Đăng nhập Zalo thành công.", "success");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Không đăng nhập được Zalo:", error);

      showMessage(
        "Không thể lấy profile Zalo — kiểm tra console/devtools để biết chi tiết.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPhone = async () => {
    if (!user || isAddingPhone) return;
    setIsAddingPhone(true);

    try {
      const nextPhone = await requestZaloPhoneNumber(user.id);
      setPhone(nextPhone);
      showMessage("Đã cập nhật số điện thoại.", "success");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Không lấy được số điện thoại:", error);
      showMessage("Không thể lấy số điện thoại, vui lòng thử lại.", "error");
    } finally {
      setIsAddingPhone(false);
    }
  };

  const handleLogout = () => {
    logoutZaloProfile();
    setUser(null);
    showMessage("Đã đăng xuất khỏi tài khoản trong app.", "success");
  };

  const comingSoon = () => showMessage("Tính năng sắp ra mắt.", "info");

  const menuItems: MenuItem[] = [
    {
      icon: "🧾",
      bg: "#FFF0F5",
      label: "Đơn hàng của tôi",
      description: "Theo dõi đơn đang giao & lịch sử mua hàng",
      onClick: () => navigate("/orders"),
    },
    {
      icon: "📷",
      bg: "#EAF6EC",
      label: "Thanh toán tại cửa hàng",
      description: "Quét mã QR số tiền và thanh toán bằng ZaloPay",
      onClick: () => navigate("/scan-pay"),
    },
    {
      icon: "📍",
      bg: "#FFF4E8",
      label: "Địa chỉ giao hàng",
      description: defaultAddress
        ? `${defaultAddress.receiver} · ${defaultAddress.detail}`
        : "Quản lý địa chỉ nhận hàng của bạn",
      onClick: () => navigate("/address"),
    },
    {
      icon: "☕",
      bg: "#F3EEFF",
      label: "Về BoomBerry",
      description: "Câu chuyện phía sau từng ly nước",
      onClick: () => navigate("/story"),
    },
    {
      icon: "💬",
      bg: "#F5EFE6",
      label: "Trợ giúp & liên hệ",
      description: "Câu hỏi thường gặp, hỗ trợ đặt hàng",
      onClick: comingSoon,
    },
  ];

  return (
    <Page
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-transparent px-4 py-2 hide-scrollbar"
      style={{
        paddingBottom: "calc(70px + env(safe-area-inset-bottom))",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {/* =========================
          ACCOUNT CARD
      ========================== */}
      <Box
        className="mt-1 flex-none rounded-2xl border border-white/40 bg-white/10 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-all duration-500 ease-out"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(14px)",
        }}
      >
        <Box className="flex items-center gap-3">
          <Avatar
            size={60}
            src={user?.avatar}
            story="default"
            online={Boolean(user)}
          >
            <Icon icon="zi-user" />
          </Avatar>
          <Box className="min-w-0 flex-1">
            <Text.Title className="truncate text-[18px] font-bold text-[#1a1a1a]">
              {user?.name || "Tài khoản Zalo"}
            </Text.Title>
            <Text size="small" className="mt-0.5 truncate text-black/60">
              {user
                ? "Đã đăng nhập bằng Zalo"
                : "Đăng nhập để lưu đơn hàng & ưu đãi của bạn"}
            </Text>

            {user &&
              (phone ? (
                <Text size="small" className="mt-0.5 truncate text-black/60">
                  {phone}
                </Text>
              ) : (
                <button
                  type="button"
                  onClick={handleAddPhone}
                  disabled={isAddingPhone}
                  className="mt-0.5 border-0 bg-transparent p-0 text-left text-sm font-medium text-blue-600 active:opacity-60 disabled:opacity-60"
                >
                  {isAddingPhone ? "Đang lấy số..." : "+ Thêm số điện thoại"}
                </button>
              ))}
          </Box>
        </Box>

        {user && points !== null && (
          <Box className="mt-4 flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 backdrop-blur-xl">
            <Box className="flex items-center gap-2">
              <Text className="text-lg leading-none">⭐</Text>
              <Text size="small" className="font-medium text-black/70">
                Điểm thưởng
              </Text>
            </Box>
            <Text size="small" className="font-bold text-[#1a1a1a]">
              {points.toLocaleString("vi-VN")}
            </Text>
          </Box>
        )}

        {user ? (
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 w-full rounded-full border-0 bg-white/70 py-3 text-sm font-semibold text-red-500 shadow-[0_4px_14px_rgba(0,0,0,0.06)] backdrop-blur-xl transition-transform active:scale-[0.98]"
          >
            Đăng xuất
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoading}
            className="relative mt-4 flex w-full items-center justify-center overflow-hidden rounded-full border-0 bg-[#1a1a1a] py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-80"
          >
            <span
              className="flex items-center gap-2 transition-all duration-300"
              style={{
                opacity: isLoading ? 0 : 1,
                transform: isLoading ? "translateY(-16px)" : "translateY(0)",
              }}
            >
              Đăng nhập với Zalo
            </span>
            <span
              className="absolute inset-0 flex items-center justify-center transition-all duration-300"
              style={{
                opacity: isLoading ? 1 : 0,
                transform: isLoading ? "translateY(0)" : "translateY(16px)",
              }}
            >
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            </span>
          </button>
        )}
      </Box>

      {/* =========================
          MENU
      ========================== */}
      <Box className="mt-5 flex-none">
        {menuItems.map((item, index) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-white/40 bg-white/10 p-3 text-left shadow-[0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl transition-all duration-300 ease-out active:scale-[0.98]"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(14px)",
              transitionDelay: mounted ? `${80 + index * 60}ms` : "0ms",
            }}
          >
            <Box
              className="flex h-11 w-11 flex-none items-center justify-center rounded-xl"
              style={{ backgroundColor: item.bg }}
            >
              <Text className="text-[20px] leading-none">{item.icon}</Text>
            </Box>

            <Box className="min-w-0 flex-1">
              <Text size="small" className="font-bold text-[#2f2f2f]">
                {item.label}
              </Text>
              <Text size="xSmall" className="mt-0.5 line-clamp-1 text-gray-500">
                {item.description}
              </Text>
            </Box>

            <Icon icon="zi-chevron-right" size={18} className="flex-none text-gray-300" />
          </button>
        ))}
      </Box>

      <Text
        size="xxSmall"
        className="mb-2 mt-2 flex-none text-center text-gray-400"
      >
        BoomBerry · Mỗi ngày 1 ly cafe ngon ☕
      </Text>
    </Page>
  );
}

export default ProfilePage;
