import { apiPost } from "@/services/api";

export type SyncedUser = {
  id: string;
  name: string;
  avatar: string;
  firstLoginAt: number;
  lastLoginAt: number;
};

type SyncUserResponse = { data: SyncedUser };

export function syncUserToBackend(user: {
  id: string;
  name: string;
  avatar: string;
}) {
  return apiPost<SyncUserResponse>("/users/sync", user).then(
    (res) => res.data,
  );
}
