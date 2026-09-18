import { useEffect, useState } from "react";
import { Box, Icon, Page, Text, useNavigate, useParams } from "zmp-ui";
import { fetchPromotion, Promotion } from "@/services/promotions";

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function ctaLabel(linkType: Promotion["linkType"]) {
  switch (linkType) {
    case "product":
      return "Xem món ngay";
    case "category":
      return "Khám phá danh mục";
    case "story":
      return "Đọc câu chuyện";
    case "url":
      return "Xem chi tiết";
    default:
      return null;
  }
}

function PromotionDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "not-found" | "error">(
    "loading",
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    setStatus("loading");

    fetchPromotion(id)
      .then((data) => {
        if (cancelled) return;
        setPromotion(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus(err?.status === 404 ? "not-found" : "error");
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleCta = () => {
    if (!promotion?.linkValue) return;

    switch (promotion.linkType) {
      case "product":
        navigate(`/product/${promotion.linkValue}`);
        break;
      case "category":
        navigate(`/category/${encodeURIComponent(promotion.linkValue)}`);
        break;
      case "story":
        navigate("/story");
        break;
      case "url":
        window.open(promotion.linkValue, "_blank", "noreferrer");
        break;
      default:
        break;
    }
  };

  const cta = promotion ? ctaLabel(promotion.linkType) : null;

  return (
    <Page
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-transparent hide-scrollbar"
      style={{
        paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {/* =========================
          HERO IMAGE
      ========================== */}
      <Box className="relative h-64 w-full flex-none overflow-hidden">
        {promotion?.image ? (
          <img
            src={promotion.image}
            alt={promotion.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <Box className="h-full w-full bg-gray-100" />
        )}
        <Box className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        <button
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
          className="absolute left-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-white/85 text-[#141415] shadow-[0_8px_22px_rgba(0,0,0,0.10)]"
          style={{
            top: "calc(var(--zaui-safe-area-inset-top, 0px) + 12px)",
          }}
        >
          <Icon icon="zi-arrow-left" size={22} />
        </button>

        {status === "ready" && promotion && (
          <Box className="absolute inset-x-0 bottom-0 p-4">
            <Text.Title size="large" className="font-bold text-white drop-shadow">
              {promotion.title}
            </Text.Title>
            {promotion.subtitle && (
              <Text className="mt-1 text-white/90">{promotion.subtitle}</Text>
            )}
          </Box>
        )}
      </Box>

      {/* =========================
          CONTENT
      ========================== */}
      <Box className="-mt-4 flex-1 rounded-t-3xl bg-white px-4 pb-6 pt-5 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
        {status === "loading" && (
          <Box className="flex flex-col gap-2.5">
            {[0, 1, 2, 3].map((i) => (
              <Box key={i} className="h-4 animate-pulse rounded bg-gray-100" />
            ))}
          </Box>
        )}

        {status === "not-found" && (
          <Text className="text-sm text-gray-500">
            Chương trình khuyến mãi này không còn tồn tại hoặc đã kết thúc.
          </Text>
        )}

        {status === "error" && (
          <Text className="text-sm text-gray-500">
            Không tải được thông tin khuyến mãi, vui lòng thử lại sau.
          </Text>
        )}

        {status === "ready" && promotion && (
          <>
            {(promotion.startAt || promotion.endAt) && (
              <Box className="mb-4 flex w-fit items-center gap-2 rounded-full bg-[#fff4e8] px-3 py-1.5">
                <Icon icon="zi-clock-1" size={15} className="text-[#c9761b]" />
                <Text size="xSmall" className="font-semibold text-[#c9761b]">
                  {promotion.startAt && promotion.endAt
                    ? `Áp dụng ${formatDate(promotion.startAt)} - ${formatDate(promotion.endAt)}`
                    : promotion.endAt
                      ? `Kết thúc ${formatDate(promotion.endAt)}`
                      : `Bắt đầu từ ${formatDate(promotion.startAt as number)}`}
                </Text>
              </Box>
            )}

            {promotion.content ? (
              promotion.content.split("\n\n").map((paragraph, index) => (
                <Text
                  key={index}
                  className={`text-sm leading-6 text-gray-700 ${index > 0 ? "mt-3" : ""}`}
                >
                  {paragraph}
                </Text>
              ))
            ) : (
              <Text className="text-sm leading-6 text-gray-500">
                Chương trình khuyến mãi đặc biệt từ BoomBerry — đừng bỏ lỡ!
              </Text>
            )}

            {cta && (
              <button
                type="button"
                onClick={handleCta}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border-0 bg-[#1a1a1a] py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              >
                {cta}
                <Icon icon="zi-chevron-right" size={16} />
              </button>
            )}
          </>
        )}
      </Box>
    </Page>
  );
}

export default PromotionDetailPage;
