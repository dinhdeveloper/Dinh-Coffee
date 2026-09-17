import { CSSProperties, useState } from "react";
import { useSetAtom } from "jotai";
import { Box, Icon, Text } from "zmp-ui";
import { Product } from "@/services/products";
import { cartItemsAtom } from "@/store/cart";

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
  const [added, setAdded] = useState(false);

  const handleAddToCart = (event: React.MouseEvent) => {
    event.stopPropagation();

    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);

      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...prev,
        {
          id: product.id,
          title: product.title,
          price: product.price,
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
      onClick={onClick}
      className={`group relative cursor-pointer rounded-2xl bg-white shadow-[0_0_16px_rgba(0,0,0,0.1)] transition-transform duration-150 active:scale-[0.96] ${className}`}
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
      </Box>

      <Box className="py-2.5 pl-3 pr-8">
        <Text
          size="small"
          className="line-clamp-1 font-medium text-[#2f2f2f]"
        >
          {product.title}
        </Text>

        <Text size="small" className="mt-1 font-semibold text-red-500">
          {product.price}
        </Text>
      </Box>

      {/* Nút thêm vào giỏ — nằm ngoài góc dưới-phải của cả item, không bị khung
          card giữ lại bên trong. */}
      <button
        type="button"
        aria-label="Thêm vào giỏ hàng"
        onClick={handleAddToCart}
        className="absolute -bottom-2.5 -right-2.5 flex h-9 w-9 items-center justify-center rounded-full border-0 bg-[#1a1a1a] text-white shadow-[0_4px_12px_rgba(0,0,0,0.3)] ring-4 ring-white transition-transform duration-150 active:scale-90"
      >
        <Icon icon={added ? "zi-check" : "zi-plus"} size={15} />
      </button>
    </Box>
  );
}

export default ProductCard;
