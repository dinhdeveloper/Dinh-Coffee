import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { Box, Icon, Page, Text, useNavigate } from "zmp-ui";
import { fetchProducts, Product } from "@/services/products";
import { favoriteIdsAtom } from "@/store/favorites";
import ProductCard from "@/components/product-card";

function FavoritesPage() {
  const navigate = useNavigate();
  const favoriteIds = useAtomValue(favoriteIdsAtom);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  // Giữ đúng thứ tự người dùng đã bấm yêu thích (mới nhất lên trước), thay vì
  // theo thứ tự trả về từ /products.
  const favorites = favoriteIds
    .map((id) => products.find((item) => item.id === id))
    .filter((item): item is Product => Boolean(item))
    .reverse();

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
            Sản phẩm yêu thích
          </Text.Title>
          {!loading && !error && favorites.length > 0 && (
            <Text size="small" className="text-gray-500">
              {favorites.length} món đã lưu
            </Text>
          )}
        </Box>
      </Box>

      {/* =========================
          GRID
      ========================== */}
      {loading ? (
        <Box className="mt-5 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
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
      ) : favorites.length === 0 ? (
        <Box className="flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
          <Box className="flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-white/10 text-3xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl">
            🤍
          </Box>
          <Text className="font-medium text-gray-600">
            Bạn chưa thích món nào
          </Text>
          <Text size="small" className="text-gray-400">
            Bấm biểu tượng trái tim trên món ăn để lưu vào đây
          </Text>
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="mt-2 rounded-full border-0 btn-liquid px-5 py-2.5 text-sm font-medium text-white active:scale-95"
          >
            Khám phá món ngon
          </button>
        </Box>
      ) : (
        <Box className="mt-5 grid grid-cols-2 gap-5" style={{ paddingBottom: 24 }}>
          {favorites.map((item, index) => (
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

export default FavoritesPage;
