const ADDRESS_KEY = "boomberry.deliveryAddress";

export type DeliveryAddress = {
  receiver: string;
  phone: string;
  detail: string;
  note?: string;
};

export function getStoredAddress(): DeliveryAddress | null {
  try {
    const raw = localStorage.getItem(ADDRESS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DeliveryAddress;
  } catch {
    return null;
  }
}

export function saveAddress(address: DeliveryAddress) {
  localStorage.setItem(ADDRESS_KEY, JSON.stringify(address));
}
