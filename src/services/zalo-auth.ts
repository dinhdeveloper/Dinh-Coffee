import { getAccessToken, getPhoneNumber, getSetting, getUserInfo, type UserInfo } from "zmp-sdk";
import { syncUserToBackend, updatePhoneOnBackend } from "@/services/users";

export const ZALO_AUTH_CHANGED_EVENT = "boomberry:zalo-auth-changed";
const ZALO_USER_KEY = "boomberry.zaloUser";

export type ZaloAuthUser = Pick<UserInfo, "id" | "name" | "avatar">;

export const getStoredZaloUser = (): ZaloAuthUser | null => {
  const value = localStorage.getItem(ZALO_USER_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as ZaloAuthUser;
  } catch (error) {
    localStorage.removeItem(ZALO_USER_KEY);
    return null;
  }
};

const isLocalhost = () => {
  try {
    const host = window.location.hostname;
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.startsWith("192.") ||
      host.endsWith(".local")
    );
  } catch (e) {
    return false;
  }
};

const isRunningInZaloMini = () => {
  // Best-effort detection: zAppID or APP_ID usually present inside Zalo Mini environment
  // Fall back to checking known Zalo user agent fragments if needed
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (typeof window.zAppID !== "undefined" && window.zAppID) return true;
    if (typeof window.APP_ID !== "undefined" && window.APP_ID) return true;
    if (navigator.userAgent && /Zalo|ZaloMini|ZaloWebView/i.test(navigator.userAgent)) return true;
  } catch (e) {
    // ignore
  }
  return false;
};

const isAuthRequiredError = (error: unknown) => {
  const code = (error as { code?: number } | undefined)?.code;
  return code === -1401;
};

export const requestZaloProfile = async (): Promise<ZaloAuthUser> => {
  try {
    // Chỉ hiện popup xin quyền nếu người dùng chưa từng cấp quyền userInfo,
    // tránh việc Zalo hỏi lại xác nhận mỗi lần bấm đăng nhập.
    let alreadyGranted = false;
    try {
      const { authSetting } = await getSetting();
      alreadyGranted = authSetting["scope.userInfo"] === true;
    } catch (settingError) {
      // eslint-disable-next-line no-console
      console.error("getSetting error:", settingError);
    }

    let userInfo: UserInfo;
    try {
      ({ userInfo } = await getUserInfo({
        avatarType: "large",
        autoRequestPermission: !alreadyGranted,
      }));
    } catch (silentError) {
      // Phiên đăng nhập Zalo có thể đã hết hạn dù trước đó đã cấp quyền
      // (lỗi -1401 "User Authentication Required") — thử lại một lần với
      // autoRequestPermission để Zalo mở lại luồng xác thực thay vì bỏ cuộc.
      if (alreadyGranted && isAuthRequiredError(silentError)) {
        ({ userInfo } = await getUserInfo({
          avatarType: "large",
          autoRequestPermission: true,
        }));
      } else {
        throw silentError;
      }
    }

    const user = {
      id: userInfo.id,
      name: userInfo.name,
      avatar: userInfo.avatar,
    };

    localStorage.setItem(ZALO_USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event(ZALO_AUTH_CHANGED_EVENT));

    syncUserToBackend(user).catch((syncError) => {
      // eslint-disable-next-line no-console
      console.error("syncUserToBackend error:", syncError);
    });

    return user;
  } catch (error) {
    // Log full error for debugging (stack, message)
    // Consumer can inspect console logs when debugging on device/emulator
    // eslint-disable-next-line no-console
    console.error("requestZaloProfile error:", error);

    // If running on localhost (dev environment) and not inside Zalo Mini, return a mocked user
    if (!isRunningInZaloMini() && isLocalhost()) {
      // eslint-disable-next-line no-console
      console.info("requestZaloProfile: not running inside Zalo Mini, returning mocked user for localhost development");
      const mockUser: ZaloAuthUser = {
        id: "mock-user-id",
        name: "Local Dev User",
        avatar: "https://via.placeholder.com/96",
      };
      localStorage.setItem(ZALO_USER_KEY, JSON.stringify(mockUser));
      window.dispatchEvent(new Event(ZALO_AUTH_CHANGED_EVENT));

      syncUserToBackend(mockUser).catch((syncError) => {
        // eslint-disable-next-line no-console
        console.error("syncUserToBackend error:", syncError);
      });

      return mockUser;
    }

    // Provide additional diagnostic hint before rethrowing
    const hint = !isRunningInZaloMini()
      ? "The Zalo SDK appears unavailable — ensure the app is running inside Zalo Mini or use the dev fallback."
      : "Zalo SDK returned an error while running inside Zalo Mini. Check permissions/scopes and remote console logs.";

    // eslint-disable-next-line no-console
    console.error("requestZaloProfile diagnostic hint:", hint);

    // Rethrow so callers can handle/display friendly messages
    throw error;
  }
};

// Xin số điện thoại người dùng (permission popup riêng, khác userInfo) và
// đổi token trả về thành số điện thoại thật ở backend (cần secret key, xem
// backend/src/lib/zalo-graph.ts). Trả về số điện thoại nếu thành công.
export const requestZaloPhoneNumber = async (userId: string): Promise<string> => {
  const [{ token: code }, accessToken] = await Promise.all([
    getPhoneNumber(),
    getAccessToken(),
  ]);

  if (!code) {
    throw new Error("Không lấy được token số điện thoại từ Zalo");
  }

  const user = await updatePhoneOnBackend(userId, accessToken, code);

  if (!user.phone) {
    throw new Error("Không lấy được số điện thoại");
  }

  return user.phone;
};

export const logoutZaloProfile = () => {
  localStorage.removeItem(ZALO_USER_KEY);
  window.dispatchEvent(new Event(ZALO_AUTH_CHANGED_EVENT));
};
