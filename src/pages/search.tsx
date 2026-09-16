import { useEffect, useMemo, useState } from "react";
import { Box, Icon, Page, Text, useNavigate } from "zmp-ui";
import { fetchProducts, Product } from "@/services/products";

const keywords = ["Trà sữa", "Cà phê", "Trà trái cây", "Bánh ngọt", "Matcha"];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function ProductCard({
  item,
  onClick,
}: {
  item: Product;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      className="relative h-40 cursor-pointer overflow-hidden rounded-xl transition-transform duration-150 active:scale-95"
    >
      <img
        src={item.image}
        alt={item.title}
        className="h-full w-full object-cover"
      />

      <Box className="absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-black/25 to-transparent p-2.5">
        <Text
          size="small"
          className="line-clamp-1 text-left font-semibold text-white"
        >
          {item.title}
        </Text>
        <Text size="xSmall" className="text-left font-bold text-white/90">
          {item.price}
        </Text>
      </Box>
    </Box>
  );
}

function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

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

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    return products.filter((item) => normalize(item.title).includes(q));
  }, [query, products]);

  const hasQuery = query.trim().length > 0;

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
          SEARCH BAR
      ========================== */}
      <Box className="flex items-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.1)] backdrop-blur-xl">
        <Icon icon="zi-search" size={20} className="shrink-0 text-gray-500" />

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm tên món hoặc danh mục..."
          className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#2f2f2f] outline-none placeholder:text-gray-400"
        />

        {hasQuery && (
          <button
            type="button"
            aria-label="Xóa tìm kiếm"
            onClick={() => setQuery("")}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-0 bg-black/10 p-0 text-gray-600 active:scale-90"
          >
            <Icon icon="zi-close" size={14} />
          </button>
        )}
      </Box>

      {/* =========================
          GỢI Ý TỪ KHÓA
      ========================== */}
      {!hasQuery && (
        <Box className="mt-4 flex flex-none flex-wrap gap-2">
          {keywords.map((keyword) => (
            <button
              key={keyword}
              type="button"
              onClick={() => setQuery(keyword)}
              className="rounded-full border border-white/40 bg-white/10 px-4 py-1.5 text-sm font-medium text-[#2f2f2f] shadow-[0_4px_14px_rgba(0,0,0,0.06)] backdrop-blur-xl active:scale-95"
            >
              {keyword}
            </button>
          ))}
        </Box>
      )}

      {/* =========================
          KẾT QUẢ / GỢI Ý MẶC ĐỊNH
      ========================== */}
      <Box className="mt-5 w-full flex-1">
        {loading && (
          <Box className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Box
                key={i}
                className="h-40 animate-pulse rounded-xl bg-gray-200"
              />
            ))}
          </Box>
        )}

        {!loading && error && (
          <Box className="flex flex-col items-center gap-2 rounded-xl bg-white/50 py-10 text-center">
            <Text size="small" className="text-gray-500">
              Không tải được danh sách sản phẩm
            </Text>
          </Box>
        )}

        {!loading && !error && !hasQuery && (
          <>
            <Text.Title size="normal" className="px-1 font-bold">
              Món phổ biến
            </Text.Title>

            <Box className="mt-3 grid grid-cols-2 gap-3">
              {products.slice(0, 6).map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  onClick={() => navigate(`/product/${item.id}`)}
                />
              ))}
            </Box>
          </>
        )}

        {!loading && !error && hasQuery && results.length > 0 && (
          <>
            <Text
              size="small"
              className="px-1 text-left font-medium text-gray-500"
            >
              {results.length} kết quả cho "{query}"
            </Text>

            <Box className="mt-3 grid grid-cols-2 gap-3">
              {results.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  onClick={() => navigate(`/product/${item.id}`)}
                />
              ))}
            </Box>
          </>
        )}

        {!loading && !error && hasQuery && results.length === 0 && (
          <Box className="flex flex-1 flex-col items-center justify-center gap-3 pt-16 text-center">
            <Box className="flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl">
              <Icon icon="zi-search" size={26} className="text-gray-400" />
            </Box>
            <Text className="font-medium text-gray-600">
              Không tìm thấy kết quả cho "{query}"
            </Text>
            <Text size="small" className="text-gray-400">
              Thử tìm với từ khóa khác nhé
            </Text>
          </Box>
        )}
      </Box>
    </Page>
  );
}

export default SearchPage;
