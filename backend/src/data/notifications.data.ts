import { Notification } from "@/types/notification";

export const notifications: Notification[] = [
  {
    id: "n1",
    type: "order",
    title: "Đơn hàng đã xác nhận",
    message: "Đơn #DH1023 của bạn đã được xác nhận và đang pha chế.",
    time: "5 phút trước",
    group: "Hôm nay",
    unread: true,
  },
  {
    id: "n2",
    type: "promo",
    title: "Ưu đãi hôm nay",
    message: "Giảm 20% cho tất cả trà trái cây, chỉ áp dụng hôm nay!",
    time: "1 giờ trước",
    group: "Hôm nay",
    unread: true,
  },
  {
    id: "n3",
    type: "order",
    title: "Đơn hàng đang giao",
    message: "Shipper đang trên đường giao trà sữa trân châu đến bạn.",
    time: "3 giờ trước",
    group: "Hôm nay",
    unread: false,
  },
  {
    id: "n4",
    type: "system",
    title: "Tích điểm thành công",
    message: "Bạn vừa nhận thêm 15 điểm thưởng từ đơn hàng gần nhất.",
    time: "Hôm qua",
    group: "Trước đó",
    unread: false,
  },
  {
    id: "n5",
    type: "system",
    title: "Chào mừng bạn!",
    message: "Cảm ơn bạn đã tham gia BoomBerry, khám phá ưu đãi thành viên ngay.",
    time: "2 ngày trước",
    group: "Trước đó",
    unread: false,
  },
];
