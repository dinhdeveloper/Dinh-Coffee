import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/api";

export type DeliveryAddress = {
  id: string;
  receiver: string;
  phone: string;
  detail: string;
  note?: string;
  isDefault: boolean;
};

export type AddressInput = {
  receiver: string;
  phone: string;
  detail: string;
  note?: string;
};

type AddressesResponse = { data: DeliveryAddress[] };
type AddressResponse = { data: DeliveryAddress };

function withUserId(path: string, userId: string) {
  return `${path}${path.includes("?") ? "&" : "?"}userId=${encodeURIComponent(userId)}`;
}

export function fetchAddresses(userId: string) {
  return apiGet<AddressesResponse>(withUserId("/addresses", userId)).then(
    (res) => res.data,
  );
}

export function createAddress(userId: string, input: AddressInput) {
  return apiPost<AddressResponse>(
    withUserId("/addresses", userId),
    input,
  ).then((res) => res.data);
}

export function updateAddress(
  userId: string,
  id: string,
  input: AddressInput,
) {
  return apiPatch<AddressResponse>(
    withUserId(`/addresses/${id}`, userId),
    input,
  ).then((res) => res.data);
}

export function deleteAddress(userId: string, id: string) {
  return apiDelete<void>(withUserId(`/addresses/${id}`, userId));
}

export function setDefaultAddress(userId: string, id: string) {
  return apiPatch<AddressResponse>(
    withUserId(`/addresses/${id}/default`, userId),
  ).then((res) => res.data);
}

export function getDefaultAddress(
  addresses: DeliveryAddress[],
): DeliveryAddress | null {
  return addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
}
