import { useEffect, useState } from "react";
import { Box, Icon, Page, Text, useNavigate, useParams } from "zmp-ui";
import { fetchProducts, Product } from "@/services/products";

function CategoryProductsPage() {
  const navigate = useNavigate();
  const { name } = useParams<{ name: string }>();
  const category = name ? decodeURIComponent(name) : "";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(false);

    fetchProducts({ category })
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
  }, [category]);

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
          paddingTop: "calc(var(--zaui-safe-area-inset-top, 0px) + 12px)",
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
            {category}
          </Text.Title>
          {!loading && !error && (
            <Text size="small" className="text-gray-500">
              {products.length} sản phẩm
            </Text>
          )}
        </Box>
      </Box>

      {/* =========================
          LIST
      ========================== */}
      {loading ? (
        <Box className="mt-5 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Box
              key={i}
              className="h-52 animate-pulse rounded-lg bg-gray-200"
            />
          ))}
        </Box>
      ) : error ? (
        <Box className="flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
          <Text className="font-medium text-gray-600">
            Không tải được danh sách sản phẩm
          </Text>
        </Box>
      ) : products.length === 0 ? (
        <Box className="flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
          <Box className="flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl">
            <Icon icon="zi-warning" size={26} className="text-gray-400" />
          </Box>
          <Text className="font-medium text-gray-600">
            Chưa có sản phẩm trong danh mục này
          </Text>
        </Box>
      ) : (
        <Box className="mt-5 grid grid-cols-2 gap-3">
          {products.map((item) => (
            <Box
              key={item.id}
              onClick={() => navigate(`/product/${item.id}`)}
              className="relative h-52 cursor-pointer overflow-hidden rounded-lg transition-transform duration-150 active:scale-95"
            >
              <img
                src={item.image}
                alt={item.title}
                className="h-full w-full object-cover"
              />

              <Box className="absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-black/30 to-transparent p-3 backdrop-blur-md">
                <Text.Title size="small" className="line-clamp-1 text-white">
                  {item.title}
                </Text.Title>

                <Text className="mt-1 font-bold text-white/90">
                  {item.price}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Page>
  );
}

export default CategoryProductsPage;
