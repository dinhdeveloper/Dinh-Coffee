import { useEffect, useState } from "react";
import { Box, Icon, Page, Text, useNavigate, useParams, useSnackbar } from "zmp-ui";
import { fetchPromotion, Promotion } from "@/services/promotions";

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function daysLeft(endAt: number) {
  const diff = endAt - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
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
  const { openSnackbar } = useSnackbar();

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

  const handleShare = async () => {
    if (!promotion) return;
    try {
      await navigator.clipboard.writeText(
        `${promotion.title} - ${promotion.subtitle ?? "Ưu đãi từ BoomBerry"}`,
      );
      openSnackbar({ text: "Đã sao chép nội dung ưu đãi.", type: "success", position: "top" });
    } catch {
      openSnackbar({ text: "Không thể sao chép.", type: "error", position: "top" });
    }
  };

  const handleCopyCode = async () => {
    if (!promotion?.code) return;
    try {
      await navigator.clipboard.writeText(promotion.code);
      openSnackbar({ text: "Đã sao chép mã ưu đãi.", type: "success", position: "top" });
    } catch {
      openSnackbar({ text: "Không thể sao chép mã.", type: "error", position: "top" });
    }
  };

  const cta = promotion ? ctaLabel(promotion.linkType) : null;

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
          HERO IMAGE
      ========================== */}
      <Box className="relative -mx-4 h-60 w-[calc(100%+2rem)] flex-none overflow-hidden">
        {promotion?.image ? (
          <img
            src={promotion.image}
            alt={promotion.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <Box className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#006AF5] to-[#8FC1FF] text-5xl">
            🎁
          </Box>
        )}
        <Box className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />

        <button
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
          className="absolute left-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-white/80 text-[#141415] shadow-[0_8px_22px_rgba(0,0,0,0.10)] backdrop-blur-md"
          style={{
            top: "calc(var(--zaui-safe-area-inset-top, 0px) + 12px)",
          }}
        >
          <Icon icon="zi-arrow-left" size={22} />
        </button>

        <button
          type="button"
          aria-label="Chia sẻ"
          onClick={handleShare}
          className="absolute right-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-white/80 text-[#141415] shadow-[0_8px_22px_rgba(0,0,0,0.10)] backdrop-blur-md"
          style={{
            top: "calc(var(--zaui-safe-area-inset-top, 0px) + 12px)",
          }}
        >
          <Icon icon="zi-share" size={19} />
        </button>

        {status === "ready" && promotion && (
          <Box className="absolute inset-x-0 bottom-0 p-5 pr-24">
            <Text
              size="xSmall"
              className="mb-2 w-fit rounded-full bg-white/20 px-2.5 py-1 font-semibold text-white backdrop-blur-md"
            >
              🎉 Ưu đãi đặc biệt từ BoomBerry
            </Text>
            <Text.Title size="large" className="font-bold text-white drop-shadow">
              {promotion.title}
            </Text.Title>
            {promotion.subtitle && (
              <Text className="mt-1 text-white/90">{promotion.subtitle}</Text>
            )}
          </Box>
        )}

        {status === "ready" && promotion?.discountLabel && (
          <Box className="absolute bottom-3 right-4 flex h-20 w-20 flex-none flex-col items-center justify-center rounded-full border-4 border-white bg-[#e6483d] text-center shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
            <Text className="text-base font-extrabold leading-none text-white">
              {promotion.discountLabel}
            </Text>
            <Text size="xSmall" className="mt-0.5 font-semibold text-white/85">
              ƯU ĐÃI
            </Text>
          </Box>
        )}
      </Box>

      {/* =========================
          CONTENT
      ========================== */}
      <Box className="relative z-10 -mt-6 flex-1">
        {status === "loading" && (
          <Box className="flex flex-col gap-2.5 glass-card rounded-2xl p-5">
            {[0, 1, 2, 3].map((i) => (
              <Box key={i} className="skeleton h-4 rounded" />
            ))}
          </Box>
        )}

        {status === "not-found" && (
          <Box className="rounded-3xl border border-white/40 bg-white/15 p-5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.10)] backdrop-blur-xl">
            <Text className="text-3xl">😢</Text>
            <Text className="mt-2 text-sm text-black/60">
              Chương trình khuyến mãi này không còn tồn tại hoặc đã kết thúc.
            </Text>
          </Box>
        )}

        {status === "error" && (
          <Box className="rounded-3xl border border-white/40 bg-white/15 p-5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.10)] backdrop-blur-xl">
            <Text className="text-sm text-black/60">
              Không tải được thông tin khuyến mãi, vui lòng thử lại sau.
            </Text>
          </Box>
        )}

        {status === "ready" && promotion && (
          <>
            {/* Coupon ticket */}
            <Box className="relative flex overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_10px_30px_rgba(20,20,20,0.12)]">
              <Box className="flex w-24 flex-none flex-col items-center justify-center btn-liquid py-4 text-white">
                <Icon icon="zi-star-solid" size={20} className="text-white" />
                <Text className="mt-1 text-lg font-extrabold leading-none">
                  {promotion.discountLabel ?? "HOT"}
                </Text>
              </Box>

              <Box className="flex-1 border-l-2 border-dashed border-gray-200 px-4 py-3.5">
                {promotion.code ? (
                  <>
                    <Text size="xSmall" className="text-gray-400">
                      Mã ưu đãi
                    </Text>
                    <Box className="mt-0.5 flex items-center justify-between gap-2">
                      <Text className="font-mono text-base font-bold tracking-widest text-[#1a1a1a]">
                        {promotion.code}
                      </Text>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="flex items-center gap-1 rounded-full bg-[#e8f1ff] px-2.5 py-1 text-xs font-medium text-[#006AF5] transition-transform active:scale-95"
                      >
                        <Icon icon="zi-copy" size={13} />
                        Sao chép
                      </button>
                    </Box>
                  </>
                ) : (
                  <Text size="small" className="font-semibold text-[#1a1a1a]">
                    Tự động áp dụng khi thanh toán
                  </Text>
                )}

                {promotion.endAt && (
                  <Text size="xSmall" className="mt-1.5 font-medium text-[#e6483d]">
                    {daysLeft(promotion.endAt) > 0
                      ? `⏳ Còn ${daysLeft(promotion.endAt)} ngày · hết hạn ${formatDate(promotion.endAt)}`
                      : "Đã hết hạn"}
                  </Text>
                )}
              </Box>
            </Box>

            {/* Description */}
            <Box className="mt-3.5 glass-card rounded-2xl p-4">
              <Box className="mb-3 flex items-center gap-2.5">
                <Box className="flex h-9 w-9 flex-none items-center justify-center rounded-full btn-liquid text-base text-white">
                  📣
                </Box>
                <Text size="small" className="font-bold text-[#1a1a1a]">
                  Chi tiết ưu đãi
                </Text>
              </Box>

              {promotion.content ? (
                promotion.content.split("\n\n").map((paragraph, index) => (
                  <Text
                    key={index}
                    className={`text-sm leading-6 text-black/75 ${index > 0 ? "mt-3" : ""}`}
                  >
                    {paragraph}
                  </Text>
                ))
              ) : (
                <Text className="text-sm leading-6 text-black/60">
                  Chương trình khuyến mãi đặc biệt từ BoomBerry — đừng bỏ lỡ!
                </Text>
              )}
            </Box>

            {/* How to use */}
            <Box className="mt-3.5 glass-card rounded-2xl p-4">
              <Text size="small" className="mb-3 font-bold text-[#1a1a1a]">
                Cách nhận ưu đãi
              </Text>
              {[
                "Đặt món ngay trong Mini App BoomBerry",
                "Ưu đãi tự động áp dụng khi thanh toán",
                "Tận hưởng thức uống yêu thích với giá tốt hơn",
              ].map((step, index) => (
                <Box key={step} className="mt-2 flex items-start gap-2.5 first:mt-0">
                  <Box className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#006AF5]/10 text-[10px] font-semibold text-[#006AF5]">
                    {index + 1}
                  </Box>
                  <Text size="small" className="text-black/70">
                    {step}
                  </Text>
                </Box>
              ))}
            </Box>

            {cta && (
              <button
                type="button"
                onClick={handleCta}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border-0 btn-liquid py-3.5 text-sm font-medium text-white transition-transform active:scale-[0.98]"
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
