import { atom } from "jotai";

// Số thông báo chưa đọc, dùng để hiện chấm đỏ trên icon Thông báo ở
// bottom navigation — được đồng bộ từ trang danh sách thông báo mỗi khi
// tải lại hoặc đánh dấu đã đọc, để chấm đỏ mất ngay không cần chờ fetch lại.
export const unreadNotificationCountAtom = atom(0);
