import { CSSProperties, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { Box, Icon, Text } from "zmp-ui";
import { formatPrice, Product } from "@/services/products";
import { cartItemsAtom } from "@/store/cart";
import { favoriteIdsAtom } from "@/store/favorites";

function ProductCard({
  product,
  onClick,
  className = "",
  style,
}: {
  product: Product;
  onClick: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const setCartItems = useSetAtom(cartItemsAtom);
  const [favoriteIds, setFavoriteIds] = useAtom(favoriteIdsAtom);
  const [added, setAdded] = useState(false);
  const isFavorite = favoriteIds.includes(product.id);

  const handleToggleFavorite = (event: React.MouseEvent) => {
    event.stopPropagation();

    setFavoriteIds((prev) =>
      prev.includes(product.id)
        ? prev.filter((id) => id !== product.id)
        : [...prev, product.id],
    );
  };

  const handleAddToCart = (event: React.MouseEvent) => {
    event.stopPropagation();

    // Thêm nhanh từ danh sách không có bước chọn size/đường/đá, nên chỉ gộp
    // vào dòng "mặc định" (không có lineId) của sản phẩm này — tránh cộng
    // nhầm số lượng vào một dòng đã tuỳ biến (vd. Size L) được thêm từ trang
    // chi tiết sản phẩm.
    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item.id === product.id && !item.lineId,
      );

      if (existing) {
        return prev.map((item) =>
          item === existing ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [
        ...prev,
        {
          id: product.id,
          title: product.title,
          price: formatPrice(product.price),
          image: product.image,
          quantity: 1,
        },
      ];
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <Box
      data-bot-product={product.id}
      onClick={onClick}
      className={`group relative cursor-pointer glass-card rounded-2xl transition-transform duration-150 active:scale-[0.96] ${className}`}
      style={style}
    >
      <Box className="relative w-full" style={{ aspectRatio: "4 / 3" }}>
        <img
          src={product.image}
          alt={product.title}
          className="h-full w-full object-cover"
          style={{ borderRadius: "16px 16px 0 16px" }}
        />

        {product.rating && (
          <Box className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm">
            <Text size="xxSmall">⭐</Text>
            <Text size="xxSmall" className="font-semibold text-[#2f2f2f]">
              {product.rating}
            </Text>
          </Box>
        )}

        <button
          type="button"
          aria-label={isFavorite ? "Bỏ yêu thích" : "Yêu thích"}
          onClick={handleToggleFavorite}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-0 bg-white/90 p-0 shadow-sm backdrop-blur-sm transition-transform active:scale-90"
        >
          <Icon
            icon={isFavorite ? "zi-heart-solid" : "zi-heart"}
            size={14}
            className={isFavorite ? "text-red-500" : "text-gray-400"}
          />
        </button>
      </Box>

      <Box className="py-2.5 pl-3 pr-8">
        <Text
          size="small"
          className="line-clamp-1 font-medium text-[#2f2f2f]"
        >
          {product.title}
        </Text>

        <Text size="small" className="mt-1 font-semibold text-red-500">
          {formatPrice(product.price)}
        </Text>
      </Box>

      {/* Nút thêm vào giỏ — nằm ngoài góc dưới-phải của cả item, không bị khung
          card giữ lại bên trong. */}
      <button
        type="button"
        aria-label="Thêm vào giỏ hàng"
        onClick={handleAddToCart}
        className="absolute -bottom-2.5 -right-2.5 flex h-9 w-9 items-center justify-center rounded-full border-0 btn-liquid text-white outline outline-4 outline-white/80 transition-transform duration-150 active:scale-90"
      >
        <Icon icon={added ? "zi-check" : "zi-plus"} size={15} />
      </button>
    </Box>
  );
}

export default ProductCard;
