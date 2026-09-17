import { useEffect, useMemo, useState } from "react";
import { Box, Icon, Page, Text, useNavigate } from "zmp-ui";
import { fetchProducts, Product } from "@/services/products";
import ProductCard from "@/components/product-card";

function SuggestionsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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
    if (loading) return;
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [loading]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((item) => item.category)));
    return unique.filter(Boolean);
  }, [products]);

  const filtered = useMemo(() => {
    if (!activeCategory) return products;
    return products.filter((item) => item.category === activeCategory);
  }, [products, activeCategory]);

  return (
    <Page
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-transparent px-4 py-2 hide-scrollbar"
      style={{
        paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
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

        <Box className="min-w-0 flex-1">
          <Text.Title size="normal" className="truncate font-bold">
            Gợi ý cho bạn
          </Text.Title>
          {!loading && !error && (
            <Text size="small" className="text-gray-500">
              {filtered.length} món để bạn chọn
            </Text>
          )}
        </Box>
      </Box>

      {/* =========================
          CATEGORY FILTER CHIPS
      ========================== */}
      {!loading && !error && categories.length > 0 && (
        <Box
          className="mt-4 flex flex-none gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`flex-none rounded-full border-0 px-4 py-1.5 text-sm font-semibold shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-colors duration-150 active:scale-95 ${
              activeCategory === null
                ? "bg-[#1a1a1a] text-white"
                : "bg-white/70 text-[#2f2f2f] backdrop-blur-xl"
            }`}
          >
            Tất cả
          </button>

          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`flex-none rounded-full border-0 px-4 py-1.5 text-sm font-semibold shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-colors duration-150 active:scale-95 ${
                activeCategory === category
                  ? "bg-[#1a1a1a] text-white"
                  : "bg-white/70 text-[#2f2f2f] backdrop-blur-xl"
              }`}
            >
              {category}
            </button>
          ))}
        </Box>
      )}

      {/* =========================
          GRID
      ========================== */}
      {loading ? (
        <Box className="mt-5 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Box
              key={i}
              className="h-52 animate-pulse rounded-2xl bg-gray-200"
            />
          ))}
        </Box>
      ) : error ? (
        <Box className="flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
          <Box className="flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl">
            <Icon icon="zi-warning" size={26} className="text-gray-400" />
          </Box>
          <Text className="font-medium text-gray-600">
            Không tải được danh sách sản phẩm
          </Text>
        </Box>
      ) : filtered.length === 0 ? (
        <Box className="flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
          <Box className="flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl">
            <Icon icon="zi-warning" size={26} className="text-gray-400" />
          </Box>
          <Text className="font-medium text-gray-600">
            Chưa có món nào trong danh mục này
          </Text>
        </Box>
      ) : (
        <Box className="mt-5 grid grid-cols-2 gap-5" style={{ paddingBottom: 24 }}>
          {filtered.map((item, index) => (
            <ProductCard
              key={item.id}
              product={item}
              onClick={() => navigate(`/product/${item.id}`)}
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted
                  ? "translateY(0) scale(1)"
                  : "translateY(14px) scale(0.97)",
                transition: "opacity 0.45s ease, transform 0.45s ease",
                transitionDelay: mounted ? `${(index % 8) * 45}ms` : "0ms",
              }}
            />
          ))}
        </Box>
      )}
    </Page>
  );
}

export default SuggestionsPage;
