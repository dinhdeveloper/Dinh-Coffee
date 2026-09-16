import { useEffect, useState } from "react";
import { Avatar, Box, Button, Icon, Text, useSnackbar } from "zmp-ui";

import {
  getStoredZaloUser,
  logoutZaloProfile,
  requestZaloProfile,
  ZALO_AUTH_CHANGED_EVENT,
  type ZaloAuthUser,
} from "@/services/zalo-auth";

function ProfilePage() {
  const { openSnackbar } = useSnackbar();
  const [user, setUser] = useState<ZaloAuthUser | null>(() =>
    getStoredZaloUser(),
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const syncUser = () => setUser(getStoredZaloUser());

    window.addEventListener(ZALO_AUTH_CHANGED_EVENT, syncUser);

    return () => window.removeEventListener(ZALO_AUTH_CHANGED_EVENT, syncUser);
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
      // Log full error (stack and message) to console for debugging
      // eslint-disable-next-line no-console
      console.error("Không đăng nhập được Zalo:", error);

      // Show a concise message to user and suggest checking console/device logs
      showMessage(
        "Không thể lấy profile Zalo — kiểm tra console/devtools để biết chi tiết.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logoutZaloProfile();
    setUser(null);
    showMessage("Đã đăng xuất khỏi tài khoản trong app.", "success");
  };

  return (
    <Box className="space-y-4 py-4">
        <Box className="rounded-lg bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
          <Box className="flex items-center gap-3">
            <Avatar
              size={64}
              src={user?.avatar}
              story="default"
              online={Boolean(user)}
            >
              <Icon icon="zi-user" />
            </Avatar>
            <Box className="min-w-0 flex-1">
              <Text.Title className="truncate text-[18px] font-semibold text-[#2f2f2f]">
                {user?.name || "Tài khoản Zalo"}
              </Text.Title>
              <Text className="mt-1 text-[13px] text-[#6f747a]">
                {user?.id || "Đăng nhập để dùng profile Zalo trong BoomBerry."}
              </Text>
            </Box>
          </Box>

          {user ? (
            <Button
              fullWidth
              type="danger"
              onClick={handleLogout}
              className="mt-4"
            >
              Đăng xuất
            </Button>
          ) : (
            <Button
              fullWidth
              type="highlight"
              loading={isLoading}
              onClick={handleLogin}
              className="mt-4"
            >
              Đăng nhập
            </Button>
          )}
        </Box>
      </Box>
  );
}

export default ProfilePage;
