import { Box } from "zmp-ui";

// Khung chờ có cùng bố cục với ProductCard (ảnh 4:3 + tên + giá).
export function ProductCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <Box className={`glass-card rounded-2xl ${className}`}>
      <Box
        className="skeleton w-full"
        style={{ aspectRatio: "4 / 3", borderRadius: "16px 16px 0 16px" }}
      />
      <Box className="py-2.5 pl-3 pr-8">
        <Box className="skeleton h-3.5 w-3/4 rounded-full" />
        <Box className="skeleton mt-2 h-3.5 w-1/2 rounded-full" />
      </Box>
    </Box>
  );
}

export function ProductCardSkeletonList({
  count,
  className = "",
}: {
  count: number;
  className?: string;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} className={className} />
      ))}
    </>
  );
}

export default ProductCardSkeleton;
