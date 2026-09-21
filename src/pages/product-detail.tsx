import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAtom, useAtomValue } from "jotai";
import {
  Box,
  Icon,
  Page,
  Text,
  useLocation,
  useNavigate,
  useParams,
} from "zmp-ui";
import { ApiError } from "@/services/api";
import { fetchProductById, fetchProducts, formatPrice, Product } from "@/services/products";
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
import { cartCountAtom, cartItemsAtom, cartLineKey } from "@/store/cart";
import { assistantIntentAtom } from "@/store/assistant";
import { favoriteIdsAtom } from "@/store/favorites";
import ProductCard from "@/components/product-card";
import {
  buildCartLineId,
  computeUnitPrice,
  defaultOptions,
  describeOptions,
  ProductOptions,
  ProductSelections,
} from "@/services/customization";

function ProductDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  // Mở từ giỏ hàng để sửa 1 dòng: /product/:id?line=<lineKey>.
  const editLineKey = new URLSearchParams(location.search).get("line");

  const [product, setProduct] = useState<Product | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "not-found" | "error"
  >("loading");
  const [mounted, setMounted] = useState(false);
  const [favoriteIds, setFavoriteIds] = useAtom(favoriteIdsAtom);
  const [quantity, setQuantity] = useState(1);
  // Con trỏ giả do bot điều khiển, để người dùng thấy bot đang bấm vào đâu.
  const [botCursor, setBotCursor] = useState<{
    x: number;
    y: number;
    tapping: boolean;
  } | null>(null);
  const [selectedSizeCode, setSelectedSizeCode] = useState<string>("");
  const [selections, setSelections] = useState<ProductSelections>({});
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
  const [cartItems, setCartItems] = useAtom(cartItemsAtom);
  const editingItem = editLineKey
    ? cartItems.find((item) => cartLineKey(item) === editLineKey)
    : undefined;
  const editingItemRef = useRef(editingItem);
  editingItemRef.current = editingItem;
  const cartCount = useAtomValue(cartCountAtom);
  const [assistantIntent, setAssistantIntent] = useAtom(assistantIntentAtom);
  const [autoAdd, setAutoAdd] = useState(false);

  useEffect(() => {
    if (!id) {
      setStatus("not-found");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setMounted(false);
    setQuantity(1);
    setSelectedSizeCode("");
    setSelections({});

    fetchProductById(id)
      .then((data) => {
        if (cancelled) return;
        setProduct(data);
        const defaults = defaultOptions(data);
        setSelectedSizeCode(defaults?.sizeCode ?? "");
        setSelections(defaults?.selections ?? {});
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

  // Sửa dòng trong giỏ: điền sẵn số lượng + tuỳ chọn hiện có (chỉ 1 lần khi tải xong).
  useEffect(() => {
    const item = editingItemRef.current;
    if (status !== "ready" || !item) return;
    setQuantity(item.quantity);
    if (item.options) {
      setSelectedSizeCode(item.options.sizeCode);
      setSelections(item.options.selections ?? {});
    }
  }, [status, editLineKey]);

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

  // Bot trợ lý giao lệnh: lần lượt chọn từng tuỳ chọn (có độ trễ để người
  // dùng thấy như có người thao tác), rồi bật autoAdd để bấm "thêm vào giỏ"
  // bằng state mới nhất (qua addToCartRef vì handleAddToCart khai báo sau).
  const addToCartRef = useRef<() => void>();
  const intentPending =
    status === "ready" &&
    !!product &&
    assistantIntent?.status === "pending" &&
    assistantIntent.productId === product.id &&
    (assistantIntent.editLineKey ?? null) === editLineKey;

  useEffect(() => {
    if (!intentPending || !assistantIntent || !product) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    let delay = 1200;
    // Mỗi bước: cuộn tới nút → di con trỏ tới → bấm (hiệu ứng chạm) → chọn.
    const step = (fn: () => void, gap = 1000, target?: string) => {
      if (target) {
        const findTarget = () =>
          document.querySelector(`[data-bot-opt="${target}"]`);
        timers.push(
          setTimeout(() => {
            findTarget()?.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "center",
            });
          }, delay),
        );
        delay += 500;
        timers.push(
          setTimeout(() => {
            const rect = findTarget()?.getBoundingClientRect();
            if (!rect) return;
            setBotCursor((prev) => ({
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              tapping: prev?.tapping ?? false,
            }));
          }, delay),
        );
        delay += 700;
        timers.push(
          setTimeout(() => {
            setBotCursor((prev) => (prev ? { ...prev, tapping: true } : prev));
          }, delay),
        );
        timers.push(
          setTimeout(() => {
            setBotCursor((prev) => (prev ? { ...prev, tapping: false } : prev));
          }, delay + 350),
        );
      }
      timers.push(setTimeout(fn, delay));
      delay += gap;
    };

    // Con trỏ xuất hiện giữa màn hình rồi mới bay tới nút đầu tiên.
    timers.push(
      setTimeout(
        () =>
          setBotCursor({
            x: window.innerWidth / 2,
            y: window.innerHeight * 0.6,
            tapping: false,
          }),
        200,
      ),
    );

    const targetQuantity = assistantIntent.quantity;
    const currentQuantity = editingItemRef.current?.quantity ?? 1;
    if (targetQuantity !== undefined && targetQuantity !== currentQuantity) {
      step(
        () => setQuantity(targetQuantity),
        1000,
        "quantity-plus",
      );
    }
    const opts: ProductOptions | undefined =
      product.sizes.length || product.customizations.length
        ? assistantIntent.options
        : undefined;
    if (opts?.sizeCode)
      step(() => setSelectedSizeCode(opts.sizeCode), 1000, `size-${opts.sizeCode}`);
    for (const custom of product.customizations) {
      const value = opts?.selections?.[custom.name];
      if (value === undefined) continue;

      if (custom.type === "toggle") {
        step(
          () => setSelections((prev) => ({ ...prev, [custom.name]: value })),
          1000,
          `custom-${custom.name}`,
        );
      } else if (custom.type === "single" && typeof value === "string") {
        step(
          () => setSelections((prev) => ({ ...prev, [custom.name]: value })),
          1000,
          `custom-${custom.name}-${value}`,
        );
      } else if (custom.type === "multi" && Array.isArray(value)) {
        for (const item of value) {
          step(
            () =>
              setSelections((prev) => {
                const current = Array.isArray(prev[custom.name])
                  ? (prev[custom.name] as string[])
                  : [];
                return current.includes(item)
                  ? prev
                  : { ...prev, [custom.name]: [...current, item] };
              }),
            1000,
            `custom-${custom.name}-${item}`,
          );
        }
      }
    }
    step(() => setAutoAdd(true), 900, "add-to-cart");

    return () => {
      timers.forEach(clearTimeout);
      setBotCursor(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentPending]);

  useEffect(() => {
    if (!autoAdd) return;

    addToCartRef.current?.();
    setAutoAdd(false);
    // Không clear timer: setAutoAdd(false) ở trên làm effect chạy lại cleanup.
    setTimeout(
      () =>
        setAssistantIntent((prev) => (prev ? { ...prev, status: "done" } : prev)),
      1500,
    );
    setTimeout(() => setBotCursor(null), 1200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdd]);

  if (status === "loading") {
    return (
      <Page className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
        <Box className="h-[54vh] w-full flex-none animate-pulse bg-gray-200" />
        <Box className="relative z-10 mx-4 -mt-9 flex-none rounded-[10px] bg-white p-4 shadow-[0_16px_40px_rgba(20,20,20,0.12)]">
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
          className="rounded-full border-0 btn-liquid px-5 py-2.5 text-sm font-medium text-white active:scale-95"
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
          className="rounded-full border-0 btn-liquid px-5 py-2.5 text-sm font-medium text-white active:scale-95"
        >
          Quay lại
        </button>
      </Page>
    );
  }

  const isFavorite = favoriteIds.includes(product.id);
  const hasSizes = product.sizes.length > 1;
  const customizable = product.sizes.length > 0 || product.customizations.length > 0;

  const handleToggleFavorite = () => {
    setFavoriteIds((prev) =>
      prev.includes(product.id)
        ? prev.filter((favId) => favId !== product.id)
        : [...prev, product.id],
    );
  };

  const setSelectionValue = (name: string, value: string | string[] | boolean) => {
    setSelections((prev) => ({ ...prev, [name]: value }));
  };

  const toggleMultiSelection = (name: string, value: string) => {
    setSelections((prev) => {
      const current = Array.isArray(prev[name]) ? (prev[name] as string[]) : [];
      return {
        ...prev,
        [name]: current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  };

  const options: ProductOptions | undefined = customizable
    ? { sizeCode: selectedSizeCode, selections }
    : undefined;
  const finalUnitPrice = computeUnitPrice(product, options);
  const optionsLabel = describeOptions(product, options);

  const handleAddToCart = () => {
    const lineId = buildCartLineId(product.id, options);
    const priceString = formatPrice(finalUnitPrice);

    if (editingItem && editLineKey) {
      // Cập nhật đúng dòng đang sửa (đổi tuỳ chọn thì đổi lineId); nếu trùng
      // dòng khác thì gộp số lượng vào dòng đó.
      const updated = {
        ...editingItem,
        lineId,
        price: priceString,
        quantity,
        options,
        optionsLabel,
      };
      setCartItems((prev) => {
        const duplicate = prev.find(
          (item) =>
            cartLineKey(item) === lineId && cartLineKey(item) !== editLineKey,
        );
        if (duplicate) {
          return prev
            .filter((item) => cartLineKey(item) !== editLineKey)
            .map((item) =>
              cartLineKey(item) === lineId
                ? { ...item, quantity: item.quantity + quantity }
                : item,
            );
        }
        return prev.map((item) =>
          cartLineKey(item) === editLineKey ? updated : item,
        );
      });
      setAdded(true);
      setTimeout(() => navigate(-1), 700);
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => cartLineKey(item) === lineId);

      if (existing) {
        return prev.map((item) =>
          cartLineKey(item) === lineId
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }

      return [
        ...prev,
        {
          id: product.id,
          lineId,
          title: product.title,
          price: priceString,
          image: product.image,
          quantity,
          options,
          optionsLabel,
        },
      ];
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };
  addToCartRef.current = handleAddToCart;

  const cursorOverlay = botCursor && (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[2000]"
      style={{
        transform: `translate(${botCursor.x}px, ${botCursor.y}px)`,
        transition: "transform 650ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {botCursor.tapping && (
        <span className="absolute -left-4 -top-4 h-8 w-8 animate-ping rounded-full bg-[#006AF5] opacity-60" />
      )}
      <svg
        viewBox="0 0 24 24"
        width="28"
        height="28"
        style={{
          transform: botCursor.tapping ? "scale(0.85)" : "scale(1)",
          transition: "transform 120ms ease",
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.35))",
        }}
      >
        <path
          d="M4 2l16 9-7 2-3 7z"
          fill="#fff"
          stroke="#2f2f2f"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );

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
            onClick={handleToggleFavorite}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/25 text-white shadow-[0_8px_20px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-transform active:scale-90"
          >
            <Icon
              icon={isFavorite ? "zi-heart-solid" : "zi-heart"}
              size={20}
              className={`transition-transform duration-200 ${isFavorite ? "text-red-400" : "text-white"}`}
              style={{ transform: isFavorite ? "scale(1.15)" : "scale(1)" }}
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
        className="relative z-10 mx-4 -mt-9 flex-none rounded-[10px] border border-white/70 bg-white/75 p-4 shadow-[0_16px_40px_rgba(20,20,20,0.18)] backdrop-blur-2xl transition-all duration-500 ease-out"
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
              {product.rating.toFixed(1)}
            </Text>
            <Text size="xSmall" className="text-gray-500">
              ({product.reviewsCount})
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
            {formatPrice(finalUnitPrice)}
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
              data-bot-opt="quantity-plus"
              onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full border-0 btn-liquid p-0 text-white transition-transform active:scale-90"
            >
              <Text className="font-bold leading-none">+</Text>
            </button>
          </Box>
        </Box>

        {/* =========================
            TUỲ CHỌN MÓN — size + tuỳ chọn riêng của từng món
        ========================== */}
        {customizable && (
          <Box
            className="mt-6 transition-all duration-500 ease-out"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(8px)",
              transitionDelay: "150ms",
            }}
          >
            {hasSizes && (
              <>
                <Text className="font-semibold text-[#2f2f2f]">Kích cỡ</Text>
                <Box className="mt-2 flex gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size.code}
                      type="button"
                      data-bot-opt={`size-${size.code}`}
                      onClick={() => setSelectedSizeCode(size.code)}
                      className={`flex-1 rounded-xl border-[1.5px] py-2 text-sm font-semibold transition-colors ${
                        selectedSizeCode === size.code
                          ? "border-[#006AF5] bg-white text-[#2f2f2f]"
                          : "border-gray-200 bg-white text-[#2f2f2f]"
                      }`}
                    >
                      {size.label}
                      <Text size="xSmall" className="text-gray-400">
                        {formatPrice(size.price)}
                      </Text>
                    </button>
                  ))}
                </Box>
              </>
            )}

            {product.customizations.map((custom) => {
              if (custom.type === "toggle") {
                const checked = selections[custom.name] === true;
                return (
                  <Box key={custom.name}>
                    <Text className="mt-4 font-semibold text-[#2f2f2f]">
                      {custom.name}
                    </Text>
                    <button
                      type="button"
                      data-bot-opt={`custom-${custom.name}`}
                      onClick={() => setSelectionValue(custom.name, !checked)}
                      className={`mt-2 flex w-full items-center justify-between gap-3 rounded-xl border-[1.5px] px-3.5 py-2.5 transition-colors ${
                        checked ? "border-[#006AF5] bg-white" : "border-gray-200 bg-white"
                      }`}
                    >
                      <Box className="flex items-center gap-2.5">
                        <Box
                          className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 ${
                            checked ? "border-[#006AF5] btn-liquid" : "border-gray-300"
                          }`}
                        >
                          {checked && (
                            <Icon icon="zi-check" size={12} className="text-white" />
                          )}
                        </Box>
                        <Text size="small" className="text-[#2f2f2f]">
                          {custom.name}
                        </Text>
                      </Box>
                      <Text size="small" className="font-semibold text-gray-500">
                        +{formatPrice(custom.priceDelta ?? 0)}
                      </Text>
                    </button>
                  </Box>
                );
              }

              if (custom.type === "single") {
                const selected = selections[custom.name];
                return (
                  <Box key={custom.name}>
                    <Text className="mt-4 font-semibold text-[#2f2f2f]">
                      {custom.name}
                    </Text>
                    <Box
                      className="mt-2 flex gap-2 overflow-x-auto pb-1"
                      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    >
                      {(custom.options ?? []).map((option) => (
                        <button
                          key={option}
                          type="button"
                          data-bot-opt={`custom-${custom.name}-${option}`}
                          onClick={() => setSelectionValue(custom.name, option)}
                          className={`flex-none rounded-full border-[1.5px] px-4 py-1.5 text-sm font-semibold transition-colors ${
                            selected === option
                              ? "border-[#006AF5] bg-white text-[#2f2f2f]"
                              : "border-gray-200 bg-white text-[#2f2f2f]"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </Box>
                  </Box>
                );
              }

              const selectedList = Array.isArray(selections[custom.name])
                ? (selections[custom.name] as string[])
                : [];
              return (
                <Box key={custom.name}>
                  <Text className="mt-4 font-semibold text-[#2f2f2f]">
                    {custom.name}
                  </Text>
                  <Box className="mt-2 flex flex-col gap-2">
                    {(custom.options ?? []).map((option) => {
                      const checked = selectedList.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          data-bot-opt={`custom-${custom.name}-${option}`}
                          onClick={() => toggleMultiSelection(custom.name, option)}
                          className={`flex items-center justify-between gap-3 rounded-xl border-[1.5px] px-3.5 py-2.5 transition-colors ${
                            checked ? "border-[#006AF5] bg-white" : "border-gray-200 bg-white"
                          }`}
                        >
                          <Box className="flex items-center gap-2.5">
                            <Box
                              className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 ${
                                checked ? "border-[#006AF5] btn-liquid" : "border-gray-300"
                              }`}
                            >
                              {checked && (
                                <Icon icon="zi-check" size={12} className="text-white" />
                              )}
                            </Box>
                            <Text size="small" className="text-[#2f2f2f]">
                              {option}
                            </Text>
                          </Box>
                          <Text size="small" className="font-semibold text-gray-500">
                            +{formatPrice(custom.priceDelta ?? 0)}
                          </Text>
                        </button>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

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
              {formatPrice(finalUnitPrice * quantity)}
            </Text.Title>
          </Box>

          <button
            type="button"
            data-bot-opt="add-to-cart"
            onClick={handleAddToCart}
            className="relative flex flex-none items-center justify-center gap-2 overflow-hidden rounded-full border-0 btn-liquid px-6 py-3 text-sm font-medium text-white transition-transform active:scale-95"
          >
            <span
              className="flex items-center gap-2 transition-all duration-300"
              style={{
                opacity: added ? 0 : 1,
                transform: added ? "translateY(-16px)" : "translateY(0)",
              }}
            >
              <Icon icon="zi-plus" size={16} />
              {editingItem ? "Cập nhật giỏ hàng" : "Thêm vào giỏ"}
            </span>

            <span
              className="absolute inset-0 flex items-center justify-center gap-2 transition-all duration-300"
              style={{
                opacity: added ? 1 : 0,
                transform: added ? "translateY(0)" : "translateY(16px)",
              }}
            >
              <Icon icon="zi-check" size={16} />
              {editingItem ? "Đã cập nhật" : "Đã thêm"}
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
                className="mt-4 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#1a1a1a] outline-none focus:border-[#006AF5]"
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
                className="mt-4 w-full rounded-full border-0 btn-liquid py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-80"
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
      {cursorOverlay && createPortal(cursorOverlay, document.body)}
    </Page>
  );
}

export default ProductDetailPage;
