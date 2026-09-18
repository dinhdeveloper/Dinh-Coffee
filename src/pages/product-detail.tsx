import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { Box, Icon, Page, Text, useNavigate, useParams } from "zmp-ui";
import { ApiError } from "@/services/api";
import { fetchProductById, fetchProducts, Product } from "@/services/products";
import {
  createProductReview,
  fetchProductReviews,
  Review,
  ReviewSummary,
} from "@/services/reviews";
import {
  getStoredZaloUser,
  requestZaloProfile,
} from "@/services/zalo-auth";
import { cartCountAtom, cartItemsAtom } from "@/store/cart";
import ProductCard from "@/components/product-card";

function parsePrice(price: string) {
  return Number(price.replace(/[^\d]/g, ""));
}

function formatPrice(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function ProductDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "not-found" | "error"
  >("loading");
  const [mounted, setMounted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [related, setRelated] = useState<Product[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const setCartItems = useSetAtom(cartItemsAtom);
  const cartCount = useAtomValue(cartCountAtom);

  useEffect(() => {
    if (!id) {
      setStatus("not-found");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setMounted(false);

    fetchProductById(id)
      .then((data) => {
        if (cancelled) return;
        setProduct(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus(err instanceof ApiError && err.status === 404 ? "not-found" : "error");
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setRelatedLoading(true);

    fetchProducts()
      .then((data) => {
        if (cancelled) return;
        setRelated(data.filter((item) => item.id !== id).slice(0, 8));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRelatedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadReviews = () => {
    if (!id) return;
    setReviewsLoading(true);

    fetchProductReviews(id)
      .then((data) => {
        setReviews(data.reviews);
        setReviewSummary(data.summary);
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  };

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmitReview = async () => {
    if (!id || submittingReview) return;

    const user = getStoredZaloUser();
    if (!user) {
      try {
        await requestZaloProfile();
      } catch {
        setReviewError("Vui lòng đăng nhập Zalo để đánh giá");
        return;
      }
    }

    const currentUser = getStoredZaloUser();
    if (!currentUser) {
      setReviewError("Vui lòng đăng nhập Zalo để đánh giá");
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);

    try {
      await createProductReview(id, {
        userId: currentUser.id,
        userName: currentUser.name,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });

      setShowReviewForm(false);
      setReviewComment("");
      setReviewRating(5);
      loadReviews();
    } catch {
      setReviewError("Không gửi được đánh giá, vui lòng thử lại");
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    if (status !== "ready") return;
    // Wait for the router's own page-slide transition (~400ms) to finish
    // before running local reveal animations, so the two don't animate
    // transforms at the same time and cause jank.
    const timer = setTimeout(() => setMounted(true), 400);
    return () => clearTimeout(timer);
  }, [status]);

  const unitPrice = useMemo(
    () => (product ? parsePrice(product.price) : 0),
    [product],
  );

  if (status === "loading") {
    return (
      <Page className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
        <Box className="h-[54vh] w-full flex-none animate-pulse bg-gray-200" />
        <Box className="relative z-10 mx-4 -mt-9 flex-none rounded-[28px] bg-white p-4 shadow-[0_16px_40px_rgba(20,20,20,0.12)]">
          <Box className="h-4 w-20 animate-pulse rounded bg-gray-200" />
          <Box className="mt-3 h-6 w-2/3 animate-pulse rounded bg-gray-200" />
        </Box>
        <Box className="relative min-h-0 flex-1 rounded-t-[28px] bg-white px-5 pt-6" style={{ marginTop: 10 }}>
          <Box className="h-4 w-full animate-pulse rounded bg-gray-200" />
          <Box className="mt-2 h-4 w-3/4 animate-pulse rounded bg-gray-200" />
        </Box>
      </Page>
    );
  }

  if (status === "error") {
    return (
      <Page className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-transparent px-6 text-center">
        <Text className="font-medium text-gray-600">
          Không tải được sản phẩm, vui lòng thử lại
        </Text>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full border-0 bg-[#1a1a1a] px-5 py-2.5 text-sm font-semibold text-white active:scale-95"
        >
          Quay lại
        </button>
      </Page>
    );
  }

  if (status === "not-found" || !product) {
    return (
      <Page className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-transparent px-6 text-center">
        <Text className="font-medium text-gray-600">
          Không tìm thấy sản phẩm
        </Text>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full border-0 bg-[#1a1a1a] px-5 py-2.5 text-sm font-semibold text-white active:scale-95"
        >
          Quay lại
        </button>
      </Page>
    );
  }

  const handleAddToCart = () => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);

      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
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
          quantity,
        },
      ];
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <Page
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-transparent hide-scrollbar"
      style={{
        paddingBottom: "calc(70px + env(safe-area-inset-bottom))",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {/* =========================
          HERO IMAGE — full-bleed, chiếm phần lớn màn hình
      ========================== */}
      <Box className="relative h-[42vh] w-full flex-none overflow-hidden">
        <img
          src={product.image}
          alt={product.title}
          className="h-full w-full object-cover transition-transform duration-700 ease-out"
          style={{
            transform: mounted ? "scale(1)" : "scale(1.12)",
          }}
        />
        <Box className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/0 to-black/25" />

        <Box
          className="absolute inset-x-0 top-0 flex items-center justify-between px-4"
          style={{
            paddingTop: "calc(var(--zaui-safe-area-inset-top, 0px) + 8px)",
          }}
        >
          <button
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/25 text-white shadow-[0_8px_20px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-transform active:scale-90"
          >
            <Icon icon="zi-arrow-left" size={22} />
          </button>

          <button
            type="button"
            aria-label="Yêu thích"
            onClick={() => setLiked((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/25 text-white shadow-[0_8px_20px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-transform active:scale-90"
          >
            <Icon
              icon={liked ? "zi-heart-solid" : "zi-heart"}
              size={20}
              className={`transition-transform duration-200 ${liked ? "text-red-400" : "text-white"}`}
              style={{ transform: liked ? "scale(1.15)" : "scale(1)" }}
            />
          </button>
        </Box>
      </Box>

      {/* =========================
          LIQUID GLASS SUMMARY CARD
          Thẻ kính nổi đè lên mép dưới ảnh — độ mờ đủ đậm (white/75) để chữ
          luôn rõ trên mọi tấm ảnh, viền sáng mảnh phía trên mô phỏng ánh
          phản chiếu của kính thật.
      ========================== */}
      <Box
        className="relative z-10 mx-4 -mt-9 flex-none rounded-[28px] border border-white/70 bg-white/75 p-4 shadow-[0_16px_40px_rgba(20,20,20,0.18)] backdrop-blur-2xl transition-all duration-500 ease-out"
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.9), 0 16px 40px rgba(20,20,20,0.18)",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(16px)",
        }}
      >
        <Box className="flex items-start justify-between gap-3">
          <Box className="min-w-0 flex-1">
            <Text
              size="xSmall"
              className="font-semibold uppercase tracking-wide text-red-400"
            >
              {product.category}
            </Text>

            <Text.Title size="large" className="mt-1 font-bold text-[#1a1a1a]">
              {product.title}
            </Text.Title>
          </Box>

          <Box className="flex flex-none items-center gap-1 rounded-full bg-white/80 px-2.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <Text size="small">⭐</Text>
            <Text size="small" className="font-semibold text-[#2f2f2f]">
              {product.rating}
            </Text>
            <Text size="xSmall" className="text-gray-500">
              ({product.reviews})
            </Text>
          </Box>
        </Box>

        <Box className="mt-2 flex items-center justify-between">
          {product.purchaseCount > 0 ? (
            <Text size="xSmall" className="text-gray-500">
              Đã bán {product.purchaseCount.toLocaleString("vi-VN")}
            </Text>
          ) : (
            <span />
          )}

          <Text.Title size="small" className="font-bold text-red-500">
            {product.price}
          </Text.Title>
        </Box>
      </Box>

      {/* =========================
          CONTENT SHEET — nền trắng đặc để chữ luôn rõ, tách biệt khỏi
          phần ảnh/kính mờ phía trên
      ========================== */}
      <Box
        className="relative flex-1 rounded-t-[28px] bg-white px-5 pb-6 pt-5 transition-all duration-500 ease-out"
        style={{
          marginTop: 10,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
        }}
      >
        <Text
          className="leading-6 text-gray-500 transition-all duration-500 ease-out"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(8px)",
            transitionDelay: "80ms",
          }}
        >
          {product.description}
        </Text>

        {/* Quantity */}
        <Box
          className="mt-5 flex items-center justify-between transition-all duration-500 ease-out"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(8px)",
            transitionDelay: "140ms",
          }}
        >
          <Text className="font-semibold text-[#2f2f2f]">Số lượng</Text>

          <Box className="flex items-center gap-3 rounded-full border border-gray-200 px-1.5 py-1.5">
            <button
              type="button"
              aria-label="Giảm số lượng"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full border-0 bg-gray-100 p-0 text-[#2f2f2f] transition-transform active:scale-90"
            >
              <Text className="font-bold leading-none">−</Text>
            </button>

            <Text className="w-5 text-center font-semibold text-[#1a1a1a]">
              {quantity}
            </Text>

            <button
              type="button"
              aria-label="Tăng số lượng"
              onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full border-0 bg-[#1a1a1a] p-0 text-white transition-transform active:scale-90"
            >
              <Text className="font-bold leading-none">+</Text>
            </button>
          </Box>
        </Box>

        {/* =========================
            ĐÁNH GIÁ
        ========================== */}
        <Box
          className="mt-6 transition-all duration-500 ease-out"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(8px)",
            transitionDelay: "170ms",
          }}
        >
          <Box className="flex items-center justify-between">
            <Text.Title size="normal" className="font-bold text-[#1a1a1a]">
              Đánh giá
              {reviewSummary && reviewSummary.count > 0 && (
                <Text
                  size="small"
                  className="ml-1 inline font-normal text-gray-400"
                >
                  ({reviewSummary.count})
                </Text>
              )}
            </Text.Title>

            <button
              type="button"
              onClick={() => {
                setReviewError(null);
                setShowReviewForm(true);
              }}
              className="rounded-full border-0 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-[#2f2f2f] active:scale-95"
            >
              Viết đánh giá
            </button>
          </Box>

          {reviewsLoading ? (
            <Box className="mt-3 flex flex-col gap-2">
              {[0, 1].map((i) => (
                <Box key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </Box>
          ) : reviews.length === 0 ? (
            <Text size="small" className="mt-3 text-gray-400">
              Chưa có đánh giá nào — hãy là người đầu tiên!
            </Text>
          ) : (
            <Box className="mt-3 flex flex-col gap-3">
              {reviews.map((review) => (
                <Box key={review.id} className="rounded-xl bg-gray-50 p-3">
                  <Box className="flex items-center justify-between">
                    <Text size="small" className="font-semibold text-[#1a1a1a]">
                      {review.userName}
                    </Text>
                    <Text size="xSmall" className="text-amber-500">
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </Text>
                  </Box>
                  {review.comment && (
                    <Text size="small" className="mt-1 text-gray-600">
                      {review.comment}
                    </Text>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Gợi ý món khác */}
        {(relatedLoading || related.length > 0) && (
          <Box
            className="mt-6 transition-all duration-500 ease-out"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(8px)",
              transitionDelay: "200ms",
            }}
          >
            <Text.Title size="normal" className="font-bold text-[#1a1a1a]">
              Có thể bạn cũng thích
            </Text.Title>

            <Box
              className="mt-3 flex gap-4 overflow-x-auto pb-6 pr-4"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {relatedLoading
                ? [0, 1, 2].map((i) => (
                    <Box
                      key={i}
                      className="h-52 w-40 flex-none animate-pulse rounded-2xl bg-gray-200"
                    />
                  ))
                : related.map((item) => (
                    <ProductCard
                      key={item.id}
                      product={item}
                      onClick={() =>
                        navigate(`/product/${item.id}`, { replace: true })
                      }
                      className="w-40 flex-none"
                    />
                  ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* =========================
          STICKY BOTTOM BAR
          Rendered via portal directly under <body> so it always
          paints above the floating bottom nav, regardless of any
          stacking/containing context created by the route wrapper.
      ========================== */}
      {createPortal(
        <Box
          className="fixed inset-x-0 bottom-0 z-[999] flex items-center gap-3 bg-white px-5 pb-5 pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] transition-transform duration-500 ease-out"
          style={{
            paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
            transform: mounted ? "translateY(0)" : "translateY(100%)",
          }}
        >
          <button
            type="button"
            aria-label="Giỏ hàng"
            onClick={() => navigate("/cart")}
            className="relative flex h-12 w-12 flex-none items-center justify-center rounded-full border border-gray-200 bg-white text-lg transition-transform active:scale-90"
          >
            🛒
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-[0_2px_6px_rgba(239,68,68,0.5)]">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>

          <Box className="min-w-0 flex-1">
            <Text size="xSmall" className="text-gray-400">
              Tổng tiền
            </Text>
            <Text.Title size="normal" className="font-bold text-[#1a1a1a]">
              {formatPrice(unitPrice * quantity)}
            </Text.Title>
          </Box>

          <button
            type="button"
            onClick={handleAddToCart}
            className="relative flex flex-none items-center justify-center gap-2 overflow-hidden rounded-full border-0 bg-[#1a1a1a] px-6 py-3 text-sm font-semibold text-white transition-transform active:scale-95"
          >
            <span
              className="flex items-center gap-2 transition-all duration-300"
              style={{
                opacity: added ? 0 : 1,
                transform: added ? "translateY(-16px)" : "translateY(0)",
              }}
            >
              <Icon icon="zi-plus" size={16} />
              Thêm vào giỏ
            </span>

            <span
              className="absolute inset-0 flex items-center justify-center gap-2 transition-all duration-300"
              style={{
                opacity: added ? 1 : 0,
                transform: added ? "translateY(0)" : "translateY(16px)",
              }}
            >
              <Icon icon="zi-check" size={16} />
              Đã thêm
            </span>
          </button>
        </Box>,
        document.body,
      )}

      {/* =========================
          REVIEW FORM OVERLAY
      ========================== */}
      {showReviewForm &&
        createPortal(
          <Box className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50">
            <Box
              className="w-full max-w-md rounded-t-3xl bg-white p-5"
              style={{
                paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
              }}
            >
              <Text.Title size="normal" className="font-bold text-[#1a1a1a]">
                Đánh giá {product.title}
              </Text.Title>

              <Box className="mt-4 flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`${star} sao`}
                    onClick={() => setReviewRating(star)}
                    className="border-0 bg-transparent p-1 text-2xl leading-none active:scale-90"
                  >
                    {star <= reviewRating ? "★" : "☆"}
                  </button>
                ))}
              </Box>

              <textarea
                placeholder="Chia sẻ cảm nhận của bạn (không bắt buộc)"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
                className="mt-4 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#1a1a1a] outline-none focus:border-[#1a1a1a]"
              />

              {reviewError && (
                <Text size="small" className="mt-3 text-red-500">
                  {reviewError}
                </Text>
              )}

              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="mt-4 w-full rounded-full border-0 bg-[#1a1a1a] py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-80"
              >
                {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="mt-2 w-full rounded-full border-0 bg-transparent py-2.5 text-sm font-medium text-gray-400 active:opacity-60"
              >
                Huỷ
              </button>
            </Box>
          </Box>,
          document.body,
        )}
    </Page>
  );
}

export default ProductDetailPage;
