import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { Page, Text, Swiper, Box, Icon, useNavigate } from "zmp-ui";
import { fetchProducts, Product } from "@/services/products";
import { fetchStories, StoreStory } from "@/services/stories";
import { fetchPromotions, Promotion } from "@/services/promotions";
import { cartCountAtom } from "@/store/cart";
import StoreStories from "@/components/store-stories";
import ProductCard from "@/components/product-card";
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

  const [properties, setProperties] = useState<StoreStory[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState(false);

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

    setPropertiesLoading(true);
    setPropertiesError(false);

    fetchStories()
      .then((data) => {
        if (!cancelled) setProperties(data);
      })
      .catch(() => {
        if (!cancelled) setPropertiesError(true);
      })
      .finally(() => {
        if (!cancelled) setPropertiesLoading(false);
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
        loading={propertiesLoading}
        stores={properties.map((property) => ({
          id: property.id,
          title: property.title,
          avatar: property.thumbnail ?? property.avatar,
          image: property.image,
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
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                className="h-52 w-40 flex-none animate-pulse rounded-2xl bg-gray-200"
              />
            ))}
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
          PROPERTY / FEATURE CARD
      ========================== */}

      <Box className="mt-7 w-full flex-none">
        {propertiesLoading ? (
          <Box
            className="w-full animate-pulse rounded-3xl bg-gray-200"
            style={{ aspectRatio: "1 / 1" }}
          />
        ) : propertiesError ? (
          <Box className="flex flex-col items-center gap-2 rounded-3xl bg-white/50 py-10 text-center">
            <Text size="small" className="text-gray-500">
              Không tải được danh sách cửa hàng
            </Text>
          </Box>
        ) : (
          <Swiper
            autoplay
            loop
            className="overflow-hidden rounded-3xl"
          >
            {properties.map((property) => (
              <Swiper.Slide key={property.id}>
                <Box
                  onClick={() => navigate(`/product/${property.productId}`)}
                  className="relative w-full flex-none cursor-pointer overflow-hidden rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.1)] transition-transform duration-150 active:scale-[0.98]"
                  style={{
                    aspectRatio: "1 / 1",
                  }}
                >
                  {/* Ảnh nền */}
                  <img
                    src={property.image}
                    alt={property.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />

                  {/* Badge top-left */}
                  <Box className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 py-1 pl-1 pr-3 shadow-sm backdrop-blur-sm">
                    <img
                      src={property.avatar}
                      alt=""
                      className="h-6 w-6 rounded-full border-2 border-white object-cover"
                    />

                    <Text
                      size="xSmall"
                      className="font-medium text-[#2f2f2f]"
                    >
                      + {property.purchaseCount.toLocaleString("vi-VN")} lượt mua
                    </Text>
                  </Box>

                  {/* Badge top-right */}
                  <Box className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur-sm">
                    <Text size="small">⭐</Text>

                    <Text
                      size="small"
                      className="font-semibold text-[#2f2f2f]"
                    >
                      {property.rating}
                    </Text>
                  </Box>

                  {/* Card thông tin */}
                  <Box className="absolute bottom-3 left-3 right-3 flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
                    <img
                      src={property.thumbnail ?? property.image}
                      alt=""
                      className="h-14 w-14 flex-none rounded-xl object-cover"
                    />

                    <Box className="min-w-0 flex-1">
                      <Text.Title
                        size="small"
                        className="truncate text-[#1a1a1a]"
                      >
                        {property.title}
                      </Text.Title>

                      <Box className="mt-0.5 flex items-center gap-1">
                        <Text size="small">⭐</Text>

                        <Text
                          size="xSmall"
                          className="truncate text-gray-500"
                        >
                          {(property.reviewCount ?? 0).toLocaleString("vi-VN")}{" "}
                          đánh giá
                        </Text>
                      </Box>
                    </Box>

                    <Box className="flex-none rounded-xl border border-gray-200 px-3 py-2">
                      <Text
                        size="small"
                        className="font-semibold text-[#1a1a1a]"
                      >
                        {property.price}
                      </Text>
                    </Box>
                  </Box>
                </Box>
              </Swiper.Slide>
            ))}
          </Swiper>
        )}
      </Box>
    </Page>
  );
}

export default HomePage;