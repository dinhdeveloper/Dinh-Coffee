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

export function addOrderToHistory(orderId: string) {
  const existing = getOrderHistory().filter((id) => id !== orderId);
  const next = [orderId, ...existing].slice(0, MAX_HISTORY);
  localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(next));
}
