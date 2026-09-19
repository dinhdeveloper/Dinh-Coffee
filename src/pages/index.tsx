import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { Page, Text, Swiper, Box, Icon, useNavigate } from "zmp-ui";
import { fetchProducts, Product } from "@/services/products";
import { fetchStories, StoreStory } from "@/services/stories";
import { fetchFeatureCards, FeatureCard } from "@/services/feature-cards";
import { fetchPromotions, Promotion } from "@/services/promotions";
import { cartCountAtom } from "@/store/cart";
import StoreStories from "@/components/store-stories";
import FeatureCards from "@/components/feature-cards";
import ProductCard from "@/components/product-card";
import { ProductCardSkeletonList } from "@/components/product-card-skeleton";
import {
  getStoredZaloUser,
  ZALO_AUTH_CHANGED_EVENT,
  type ZaloAuthUser,
} from "@/services/zalo-auth";

function HomePage() {
  const navigate = useNavigate();
  const cartCount = useAtomValue(cartCountAtom);

  const [zaloUser, setZaloUser] = useState<ZaloAuthUser | null>(() =>
    getStoredZaloUser(),
  );

  useEffect(() => {
    const handleAuthChange = () => setZaloUser(getStoredZaloUser());
    window.addEventListener(ZALO_AUTH_CHANGED_EVENT, handleAuthChange);
    return () =>
      window.removeEventListener(ZALO_AUTH_CHANGED_EVENT, handleAuthChange);
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [stories, setStories] = useState<StoreStory[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);

  const [featureCards, setFeatureCards] = useState<FeatureCard[]>([]);
  const [featureCardsLoading, setFeatureCardsLoading] = useState(true);
  const [featureCardsError, setFeatureCardsError] = useState(false);

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(false);

    fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    setStoriesLoading(true);

    fetchStories()
      .then((data) => {
        if (!cancelled) setStories(data);
      })
      .catch(() => {
        if (!cancelled) setStories([]);
      })
      .finally(() => {
        if (!cancelled) setStoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    setFeatureCardsLoading(true);
    setFeatureCardsError(false);

    fetchFeatureCards()
      .then((data) => {
        if (!cancelled) setFeatureCards(data);
      })
      .catch(() => {
        if (!cancelled) setFeatureCardsError(true);
      })
      .finally(() => {
        if (!cancelled) setFeatureCardsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    setPromotionsLoading(true);

    fetchPromotions()
      .then((data) => {
        if (!cancelled) setPromotions(data);
      })
      .catch(() => {
        if (!cancelled) setPromotions([]);
      })
      .finally(() => {
        if (!cancelled) setPromotionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = [
    {
      label: "Trà sữa",
      icon: "🧋",
      bg: "#FFF0F5",
    },
    {
      label: "Trà trái cây",
      icon: "🍓",
      bg: "#FFF4E8",
    },
    {
      label: "Cà phê",
      icon: "☕",
      bg: "#F5EFE6",
    },
    {
      label: "Bánh ngọt",
      icon: "🍰",
      bg: "#F3EEFF",
    },
  ] as const;

  return (
    <Page
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-transparent px-4 py-2 hide-scrollbar"
      style={{
        paddingBottom: "calc(70px + env(safe-area-inset-bottom))",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {/* =========================
          GREETING
      ========================== */}
      <Text className="pt-1 text-lg font-bold">
        {zaloUser ? `Xin chào, ${zaloUser.name}!` : "Xin chào!"}{" "}
        <span className="text-xl">👋</span>
      </Text>

      <Text className="text-base font-normal italic text-gray-700">
        {zaloUser ? "Chào bạn đã quay trở lại." : "Rất vui được gặp bạn."}
      </Text>

      {/* =========================
          STORE STORIES (24H)
      ========================== */}
      <StoreStories
        loading={storiesLoading}
        stores={stories.map((story) => ({
          id: story.id,
          title: story.title,
          avatar: story.thumbnail ?? story.avatar,
          image: story.image,
        }))}
      />

      <Box className="pt-3 relative flex gap-3">
        {/* Main card */}
        <Box className="relative min-w-0 flex-1 rounded-2xl border border-white/40 bg-white/10 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.15)] backdrop-blur-xl">
          <Text className="text-lg font-bold leading-tight text-black">
            Cà phê kể chuyện mỗi ngày
          </Text>

          <Text className="mt-2 line-clamp-2 pr-9 text-sm leading-5 text-black/80">
            Cà phê ngon không chỉ là một thức uống — đó là khoảnh khắc đánh thức tâm trí và sưởi ấm tâm hồn bạn.
          </Text>

          <button
            type="button"
            aria-label="Đọc thêm"
            onClick={() => navigate("/story")}
            className="group absolute bottom-3 right-3 flex h-9 w-9 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-black transition-transform duration-150 active:scale-90"
          >
            <Icon
              icon="zi-chevron-right"
              size={22}
              className="transition-transform duration-150 group-active:translate-x-0.5"
            />
          </button>
        </Box>

        {/* Cart button */}
        <Box
          onClick={() => navigate("/cart")}
          className="relative flex w-[72px] flex-none cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/40 bg-white/10 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-transform active:scale-95"
        >
          <Box className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70 text-xl shadow-sm">
            🛒
          </Box>

          <Text
            size="xxSmall"
            className="whitespace-nowrap font-semibold text-black"
          >
            Giỏ hàng
          </Text>

          {cartCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white shadow-[0_2px_6px_rgba(239,68,68,0.5)]">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </Box>
      </Box>

      {/* =========================
          BANNER / SWIPER
      ========================== */}
      {promotionsLoading ? (
        <Box className="mt-6 h-40 w-full flex-none animate-pulse rounded-lg bg-white/40" />
      ) : (
        promotions.length > 0 && (
          <Box className="mt-6 w-full flex-none">
            <Swiper autoplay loop className="overflow-hidden rounded-lg">
              {promotions.map((promo) => (
                <Swiper.Slide key={promo.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/promotion/${promo.id}`)}
                    className="relative block h-40 w-full overflow-hidden rounded-lg border-0 p-0 text-left"
                  >
                    {promo.image && (
                      <img
                        src={promo.image}
                        alt={promo.title}
                        className="h-full w-full object-cover"
                      />
                    )}

                    <Box className="absolute inset-0 bg-gradient-to-t from-black/25 via-black/25 to-transparent" />

                    <Box className="absolute inset-0 flex flex-col justify-end p-5">
                      <Text.Title size="large" className="text-white">
                        {promo.title}
                      </Text.Title>

                      {promo.subtitle && (
                        <Text className="mt-2 max-w-[220px] text-white/85">
                          {promo.subtitle}
                        </Text>
                      )}
                    </Box>
                  </button>
                </Swiper.Slide>
              ))}
            </Swiper>
          </Box>
        )
      )}

      {/* =========================
          CATEGORIES
      ========================== */}
      <Box className="mt-5 grid w-full flex-none grid-cols-4 gap-y-4 rounded-lg bg-white px-2 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
        {categories.map((category) => (
          <button
            key={category.label}
            type="button"
            onClick={() =>
              navigate(`/category/${encodeURIComponent(category.label)}`)
            }
            className="flex min-w-0 flex-col items-center gap-2 border-0 bg-transparent px-1 text-center transition-transform active:scale-95"
          >
            <Box
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{
                backgroundColor: category.bg,
              }}
            >
              <Text className="text-[26px] leading-none">
                {category.icon}
              </Text>
            </Box>

            <Text
              size="xxSmall"
              className="w-full truncate font-medium text-[#2f2f2f]"
            >
              {category.label}
            </Text>
          </button>
        ))}
      </Box>

      {/* =========================
          GỢI Ý CHO BẠN
      ========================== */}
      <Box className="mt-6 w-full flex-none">
        <Box className="flex items-center justify-between px-1">
          <Text.Title
            size="normal"
            className="font-bold"
          >
            Gợi ý cho bạn
          </Text.Title>

          <Text
            size="small"
            className="cursor-pointer font-medium text-gray-500 transition-transform duration-150 active:scale-95 active:opacity-60"
            onClick={() => navigate("/suggestions")}
          >
            Xem tất cả
          </Text>
        </Box>

        {/* Product horizontal list */}
        {loading ? (
          <Box
            className="mt-3 flex gap-4 overflow-x-auto pb-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <ProductCardSkeletonList count={3} className="w-40 flex-none" />
          </Box>
        ) : error ? (
          <Box className="mt-3 flex flex-col items-center gap-2 rounded-lg bg-white/50 py-8 text-center">
            <Text size="small" className="text-gray-500">
              Không tải được sản phẩm
            </Text>
          </Box>
        ) : (
          <Box
            className="mt-3 flex gap-4 overflow-x-auto pb-6 pr-4"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {products.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                onClick={() => navigate(`/product/${item.id}`)}
                className="w-40 flex-none"
              />
            ))}
          </Box>
        )}
      </Box>

      {/* =========================
          FEATURE CARDS
      ========================== */}
      <FeatureCards
        cards={featureCards}
        loading={featureCardsLoading}
        error={featureCardsError}
        onSelect={(card) => card.productId && navigate(`/product/${card.productId}`)}
      />
    </Page>
  );
}

export default HomePage;