import { Avatar, Box, Icon, Text, useNavigate } from "zmp-ui";
import logo from '@/static/logo.png';

type AppHeaderProps = {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showAvatar?: boolean;
};

function AppHeader({
  title = "BoomBerry",
  subtitle = "Bán câu chuyện cafe mỗi ngày",
  showBack = false,
  showAvatar = true,
}: AppHeaderProps) {
  const navigate = useNavigate();

  return (
    <Box
      className="flex flex-row items-center gap-3 bg-transparent px-4 pb-2 pr-24"
      style={{
        paddingTop: "calc(var(--zaui-safe-area-inset-top, 0px) + 8px)",
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
          src={logo}
        />
      )}

      <Box className="flex min-w-0 flex-col">
        <Text.Title size="normal" className="truncate">
          {title}
        </Text.Title>
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
