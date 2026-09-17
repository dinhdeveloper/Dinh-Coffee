import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Box, Icon, Page, Text } from "zmp-ui";
import {
  deleteNotificationApi,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  Notification as NotifItem,
  NotificationType as NotifType,
} from "@/services/notifications";
import { getStoredZaloUser } from "@/services/zalo-auth";

const typeMeta: Record<NotifType, { icon: string; bg: string; cta: string }> = {
  order: { icon: "☕", bg: "#FFF0F5", cta: "Xem đơn hàng" },
  promo: { icon: "🎁", bg: "#FFF4E8", cta: "Dùng ưu đãi ngay" },
  system: { icon: "🔔", bg: "#F3EEFF", cta: "Đã hiểu" },
};

function NotificationCard({
  item,
  index,
  mounted,
  removing,
  pressed,
  onOpen,
  onDelete,
}: {
  item: NotifItem;
  index: number;
  mounted: boolean;
  removing: boolean;
  pressed: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const meta = typeMeta[item.type];

  return (
    <Box
      onClick={onOpen}
      className={`relative mb-3 flex cursor-pointer items-start gap-3 rounded-2xl border p-3 shadow-[0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl transition-all duration-300 ease-out active:scale-[0.98] ${
        item.unread
          ? "border-white/50 bg-white/20"
          : "border-white/40 bg-white/10"
      }`}
      style={{
        opacity: removing ? 0 : mounted ? 1 : 0,
        transform: removing
          ? "translateX(24px) scale(0.96)"
          : pressed
            ? "translateY(0) scale(0.96)"
            : mounted
              ? "translateY(0)"
              : "translateY(14px)",
        maxHeight: removing ? 0 : 200,
        marginBottom: removing ? 0 : undefined,
        paddingTop: removing ? 0 : undefined,
        paddingBottom: removing ? 0 : undefined,
        overflow: "hidden",
        transitionDelay: mounted ? "0ms" : `${index * 70}ms`,
      }}
    >
      {/* Icon badge */}
      <Box
        className="relative flex h-11 w-11 flex-none items-center justify-center rounded-xl"
        style={{ backgroundColor: meta.bg }}
      >
        <Text className="text-[20px] leading-none">{meta.icon}</Text>

        {item.unread && (
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
        )}
      </Box>

      {/* Content */}
      <Box className="min-w-0 flex-1">
        <Box className="flex items-start justify-between gap-2">
          <Text
            size="small"
            className={`line-clamp-1 ${item.unread ? "font-bold" : "font-semibold"} text-[#2f2f2f]`}
          >
            {item.title}
          </Text>

          <Text size="xSmall" className="flex-none whitespace-nowrap text-gray-400">
            {item.time}
          </Text>
        </Box>

        <Text size="xSmall" className="mt-1 line-clamp-2 text-gray-500">
          {item.message}
        </Text>
      </Box>

      {/* Delete button */}
      <button
        type="button"
        aria-label="Xóa thông báo"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        className="flex h-6 w-6 flex-none items-center justify-center self-center rounded-full border-0 bg-black/5 p-0 text-gray-400 transition-transform active:scale-90"
      >
        <Icon icon="zi-close" size={12} />
      </button>
    </Box>
  );
}

function NotificationPage() {
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchNotifications(getStoredZaloUser()?.id)
      .then((data) => {
        if (!cancelled) setNotifications(data);
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
  }, []);

  useEffect(() => {
    if (loading) return;
    // Wait for the router's own page-slide transition (~400ms) to finish
    // before running the list's reveal animation, so they don't animate
    // transforms at the same time and cause jank.
    const timer = setTimeout(() => setMounted(true), 400);
    return () => clearTimeout(timer);
  }, [loading]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.unread).length,
    [notifications],
  );

  const groups = useMemo(() => {
    const order: NotifItem["group"][] = ["Hôm nay", "Trước đó"];
    return order
      .map((group) => ({
        group,
        items: notifications.filter((item) => item.group === group),
      }))
      .filter((section) => section.items.length > 0);
  }, [notifications]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unread: false } : item)),
    );
    markNotificationRead(id).catch(() => {
      // giữ trạng thái đã đọc trên UI dù API lỗi, tránh làm gián đoạn thao tác
    });
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
    markAllNotificationsRead(getStoredZaloUser()?.id).catch(() => {});
  };

  const deleteNotification = (id: string) => {
    setRemovingIds((prev) => [...prev, id]);
    deleteNotificationApi(id).catch(() => {});

    setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      setRemovingIds((prev) => prev.filter((removingId) => removingId !== id));
    }, 300);
  };

  const openDetail = (id: string) => {
    markAsRead(id);
    setPressedId(id);
    setDetailId(id);

    setTimeout(() => {
      setPressedId(null);
      setSheetOpen(true);
    }, 120);
  };

  const closeDetail = () => {
    setSheetOpen(false);
    setTimeout(() => setDetailId(null), 280);
  };

  const activeNotification = notifications.find((item) => item.id === detailId);

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
          HEADER
      ========================== */}
      <Box className="flex items-center justify-between pt-1">
        <Box>
          <Text.Title size="large" className="font-bold">
            Thông báo
          </Text.Title>
          <Text size="small" className="text-gray-500">
            {unreadCount > 0
              ? `Bạn có ${unreadCount} thông báo mới`
              : "Bạn đã xem hết thông báo"}
          </Text>
        </Box>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="flex-none rounded-full border-0 bg-white/20 px-3 py-1.5 text-xs font-semibold text-[#2f2f2f] shadow-[0_4px_14px_rgba(0,0,0,0.06)] backdrop-blur-xl active:scale-95"
          >
            Đánh dấu đã đọc
          </button>
        )}
      </Box>

      {/* =========================
          LIST
      ========================== */}
      {loading ? (
        <Box className="mt-4 flex-1">
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              className="mb-3 h-[76px] animate-pulse rounded-2xl bg-white/40"
            />
          ))}
        </Box>
      ) : error ? (
        <Box className="flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
          <Text className="font-medium text-gray-600">
            Không tải được thông báo
          </Text>
        </Box>
      ) : notifications.length === 0 ? (
        <Box className="flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
          <Box className="flex h-16 w-16 animate-bounce items-center justify-center rounded-full border border-white/40 bg-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl">
            <Icon icon="zi-notif" size={26} className="text-gray-400" />
          </Box>
          <Text className="font-medium text-gray-600">
            Bạn chưa có thông báo nào
          </Text>
          <Text size="small" className="text-gray-400">
            Thông báo mới sẽ xuất hiện ở đây
          </Text>
        </Box>
      ) : (
        <Box className="mt-4 flex-1">
          {groups.map((section) => (
            <Box key={section.group} className="mb-2">
              <Text
                size="small"
                className="mb-2 px-1 font-semibold text-gray-500"
              >
                {section.group}
              </Text>

              {section.items.map((item, index) => (
                <NotificationCard
                  key={item.id}
                  item={item}
                  index={index}
                  mounted={mounted}
                  removing={removingIds.includes(item.id)}
                  pressed={pressedId === item.id}
                  onOpen={() => openDetail(item.id)}
                  onDelete={() => deleteNotification(item.id)}
                />
              ))}
            </Box>
          ))}
        </Box>
      )}

      {/* =========================
          DETAIL BOTTOM SHEET
          Rendered via portal directly under <body> so it always paints
          above the floating bottom nav, regardless of any
          stacking/containing context created by the route wrapper.
      ========================== */}
      {detailId &&
        activeNotification &&
        createPortal(
          <Box
            className="fixed inset-0 z-[999] flex items-end justify-center"
            onClick={closeDetail}
          >
          {/* Backdrop */}
          <Box
            className="absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out"
            style={{ opacity: sheetOpen ? 1 : 0 }}
          />

          {/* Sheet */}
          <Box
            onClick={(event: React.MouseEvent) => event.stopPropagation()}
            className="relative w-full max-w-md rounded-t-3xl bg-white px-5 pt-3 shadow-[0_-8px_40px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-out"
            style={{
              transform: sheetOpen ? "translateY(0)" : "translateY(100%)",
              paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
            }}
          >
            {/* Drag handle */}
            <Box className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-200" />

            <Box className="flex items-start justify-between gap-3">
              <Box
                className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl transition-transform duration-300"
                style={{
                  backgroundColor: typeMeta[activeNotification.type].bg,
                  transform: sheetOpen ? "scale(1)" : "scale(0.6)",
                }}
              >
                <Text className="text-[26px] leading-none">
                  {typeMeta[activeNotification.type].icon}
                </Text>
              </Box>

              <button
                type="button"
                aria-label="Đóng"
                onClick={closeDetail}
                className="flex h-8 w-8 flex-none items-center justify-center rounded-full border-0 bg-black/5 p-0 text-gray-500 transition-transform active:scale-90"
              >
                <Icon icon="zi-close" size={16} />
              </button>
            </Box>

            <Text.Title size="normal" className="mt-3 font-bold text-[#1a1a1a]">
              {activeNotification.title}
            </Text.Title>

            <Text size="small" className="mt-1 text-gray-400">
              {activeNotification.time}
            </Text>

            <Text className="mt-3 leading-6 text-gray-600">
              {activeNotification.message}
            </Text>

            <button
              type="button"
              onClick={closeDetail}
              className="mt-5 w-full rounded-full border-0 bg-[#1a1a1a] py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
            >
              {typeMeta[activeNotification.type].cta}
            </button>
          </Box>
          </Box>,
          document.body,
        )}
    </Page>
  );
}

export default NotificationPage;
