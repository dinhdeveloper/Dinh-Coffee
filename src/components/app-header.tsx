import { useEffect, useState } from "react";
import { Avatar, Box, Icon, Text, useNavigate } from "zmp-ui";
import logo from '@/static/logo.png';
import {
  getStoredZaloUser,
  ZALO_AUTH_CHANGED_EVENT,
  type ZaloAuthUser,
} from "@/services/zalo-auth";

type AppHeaderProps = {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showAvatar?: boolean;
};

function AppHeader({
  title = "BoomBerry",
  subtitle = "248 Hoàng Hoa Thám, Bình Thạnh",
  showBack = false,
  showAvatar = true,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const [zaloUser, setZaloUser] = useState<ZaloAuthUser | null>(() =>
    getStoredZaloUser(),
  );

  useEffect(() => {
    const handleAuthChange = () => setZaloUser(getStoredZaloUser());
    window.addEventListener(ZALO_AUTH_CHANGED_EVENT, handleAuthChange);
    return () =>
      window.removeEventListener(ZALO_AUTH_CHANGED_EVENT, handleAuthChange);
  }, []);

  return (
    <Box
      className="flex flex-row items-center gap-3 bg-transparent px-4 pb-2 pr-24"
      style={{
        paddingTop: "calc(var(--zaui-safe-area-inset-top, 0px))",
      }}
    >
      {showBack && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-white/80 text-[#141415] shadow-[0_8px_22px_rgba(0,0,0,0.10)]"
        >
          <Icon icon="zi-arrow-left" size={22} />
        </button>
      )}

      {showAvatar && (
        <Avatar
          online
          story="default"
          size={36}
          src={zaloUser?.avatar || logo}
        />
      )}

      <Box className="flex min-w-0 flex-col">
        <button
          type="button"
          onClick={() => navigate("/branches")}
          className="flex min-w-0 items-center gap-1 border-0 bg-transparent p-0 text-left"
        >
          <Text.Title size="normal" className="truncate">
            {title}
          </Text.Title>
          <Icon icon="zi-chevron-right" size={16} className="shrink-0 text-gray-500" />
        </button>
        {subtitle && (
          <Text
            size="small"
            className="truncate text-gray-500 dark:text-gray-300"
          >
            {subtitle}
          </Text>
        )}
      </Box>
    </Box>
  );
}

export default AppHeader;
