import { Box, Icon, Page, Text, useNavigate, useSnackbar } from "zmp-ui";

const SUPPORT_PHONE = "0975469232";
const SUPPORT_PHONE_DISPLAY = "0975 469 232";

const BRANCHES = [
  {
    name: "BoomBerry - Hoàng Hoa Thám",
    address: "248 Hoàng Hoa Thám, Bình Thạnh, TP.HCM",
    hours: "7:00 - 22:00",
    phone: SUPPORT_PHONE,
    isMain: true,
    cover:
      "https://img.magnific.com/free-photo/composition-with-delicious-thai-tea_23-2148994319.jpg",
  },
];

function BranchesPage() {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      openSnackbar({ text: "Đã sao chép địa chỉ.", type: "success", position: "top" });
    } catch {
      openSnackbar({ text: "Không thể sao chép địa chỉ.", type: "error", position: "top" });
    }
  };

  return (
    <Page
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-transparent px-4 py-2 hide-scrollbar"
      style={{
        paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {/* =========================
          HEADER
      ========================== */}
      <Box
        className="flex items-center gap-3"
        style={{
          paddingTop: "calc(var(--zaui-safe-area-inset-top, 0px))",
        }}
      >
        <button
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-white/80 text-[#141415] shadow-[0_8px_22px_rgba(0,0,0,0.10)]"
        >
          <Icon icon="zi-arrow-left" size={22} />
        </button>

        <Text.Title size="normal" className="truncate font-bold">
          Chi nhánh cửa hàng
        </Text.Title>
      </Box>

      {/* =========================
          BRANCH LIST
      ========================== */}
      <Box className="mt-5 flex-none">
        {BRANCHES.map((branch) => {
          const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
            branch.address,
          )}`;

          return (
            <Box
              key={branch.address}
              className="mb-4 overflow-hidden rounded-3xl border border-white/40 bg-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.10)] backdrop-blur-xl"
            >
              {/* Cover image */}
              <Box className="relative h-36 w-full">
                <img
                  src={branch.cover}
                  alt={branch.name}
                  className="h-full w-full object-cover"
                />
                <Box className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                {branch.isMain && (
                  <Text
                    size="xSmall"
                    className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 font-semibold text-[#1a1a1a] shadow-sm"
                  >
                    ⭐ Chi nhánh chính
                  </Text>
                )}
                <Box className="absolute inset-x-0 bottom-0 p-3.5">
                  <Text.Title size="small" className="font-bold text-white drop-shadow">
                    {branch.name}
                  </Text.Title>
                </Box>
              </Box>

              {/* Info */}
              <Box className="p-4">
                <Box className="flex items-start gap-2.5">
                  <Icon icon="zi-location" size={18} className="mt-0.5 flex-none text-gray-500" />
                  <Text size="small" className="text-gray-700">
                    {branch.address}
                  </Text>
                </Box>

                <Box className="mt-2.5 flex items-center gap-2.5">
                  <Icon icon="zi-clock-1" size={18} className="flex-none text-gray-500" />
                  <Text size="small" className="text-gray-700">
                    Mở cửa: <span className="font-semibold text-[#1a1a1a]">{branch.hours}</span>
                  </Text>
                </Box>

                <Box className="mt-2.5 flex items-center gap-2.5">
                  <Icon icon="zi-call" size={18} className="flex-none text-gray-500" />
                  <Text size="small" className="text-gray-700">
                    {SUPPORT_PHONE_DISPLAY}
                  </Text>
                </Box>

                {/* Actions */}
                <Box className="mt-4 flex gap-2">
                  <a
                    href={`tel:${branch.phone}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border-0 bg-[#1a1a1a] py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
                  >
                    <Icon icon="zi-call" size={15} />
                    Gọi
                  </a>
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white py-2.5 text-sm font-semibold text-[#1a1a1a] transition-transform active:scale-[0.98]"
                  >
                    <Icon icon="zi-location" size={15} />
                    Chỉ đường
                  </a>
                  <button
                    type="button"
                    aria-label="Sao chép địa chỉ"
                    onClick={() => handleCopyAddress(branch.address)}
                    className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full border border-gray-200 bg-white text-[#1a1a1a] transition-transform active:scale-[0.98]"
                  >
                    <Icon icon="zi-copy" size={16} />
                  </button>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Page>
  );
}

export default BranchesPage;
