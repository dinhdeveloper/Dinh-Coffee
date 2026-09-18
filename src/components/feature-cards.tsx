import { Box, Swiper, Text } from "zmp-ui";
import { FeatureCard } from "@/services/feature-cards";

function FeatureCards({
  cards,
  loading,
  error,
  onSelect,
}: {
  cards: FeatureCard[];
  loading: boolean;
  error: boolean;
  onSelect: (card: FeatureCard) => void;
}) {
  return (
    <Box className="mt-7 w-full flex-none">
      {loading ? (
        <Box
          className="w-full animate-pulse rounded-3xl bg-gray-200"
          style={{ aspectRatio: "1 / 1" }}
        />
      ) : error ? (
        <Box className="flex flex-col items-center gap-2 rounded-3xl bg-white/50 py-10 text-center">
          <Text size="small" className="text-gray-500">
            Không tải được nội dung nổi bật
          </Text>
        </Box>
      ) : (
        <Swiper autoplay loop className="overflow-hidden rounded-3xl">
          {cards.map((card) => (
            <Swiper.Slide key={card.id}>
              <Box
                onClick={() => onSelect(card)}
                className="relative w-full flex-none cursor-pointer overflow-hidden rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.1)] transition-transform duration-150 active:scale-[0.98]"
                style={{
                  aspectRatio: "1 / 1",
                }}
              >
                {/* Ảnh nền */}
                <img
                  src={card.image}
                  alt={card.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />

                {/* Badge top-left */}
                <Box className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 py-1 pl-1 pr-3 shadow-sm backdrop-blur-sm">
                  <img
                    src={card.avatar}
                    alt=""
                    className="h-6 w-6 rounded-full border-2 border-white object-cover"
                  />

                  <Text size="xSmall" className="font-medium text-[#2f2f2f]">
                    + {card.purchaseCount.toLocaleString("vi-VN")} lượt mua
                  </Text>
                </Box>

                {/* Badge top-right */}
                <Box className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur-sm">
                  <Text size="small">⭐</Text>

                  <Text size="small" className="font-semibold text-[#2f2f2f]">
                    {card.rating}
                  </Text>
                </Box>

                {/* Card thông tin */}
                <Box className="absolute bottom-3 left-3 right-3 flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
                  <img
                    src={card.thumbnail ?? card.image}
                    alt=""
                    className="h-14 w-14 flex-none rounded-xl object-cover"
                  />

                  <Box className="min-w-0 flex-1">
                    <Text.Title
                      size="small"
                      className="truncate text-[#1a1a1a]"
                    >
                      {card.title}
                    </Text.Title>

                    <Box className="mt-0.5 flex items-center gap-1">
                      <Text size="small">⭐</Text>

                      <Text size="xSmall" className="truncate text-gray-500">
                        {(card.reviewCount ?? 0).toLocaleString("vi-VN")} đánh
                        giá
                      </Text>
                    </Box>
                  </Box>

                  <Box className="flex-none rounded-xl border border-gray-200 px-3 py-2">
                    <Text size="small" className="font-semibold text-[#1a1a1a]">
                      {card.price}
                    </Text>
                  </Box>
                </Box>
              </Box>
            </Swiper.Slide>
          ))}
        </Swiper>
      )}
    </Box>
  );
}

export default FeatureCards;
