const ORDER_HISTORY_KEY = "boomberry.orderHistory";
const MAX_HISTORY = 50;

export function getOrderHistory(): string[] {
  try {
    const raw = localStorage.getItem(ORDER_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Bot trợ lý lắng nghe sự kiện này để đọc to tiến độ của các đơn vừa thanh toán.
export const ORDER_PAID_EVENT = "boomberry:order-paid";

export function announceOrderPaid(orderId: string) {
  window.dispatchEvent(new CustomEvent(ORDER_PAID_EVENT, { detail: orderId }));
}

export function addOrderToHistory(orderId: string) {
  const existing = getOrderHistory().filter((id) => id !== orderId);
  const next = [orderId, ...existing].slice(0, MAX_HISTORY);
  localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(next));
}
