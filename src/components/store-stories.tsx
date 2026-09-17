import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Box, Icon, Text } from "zmp-ui";

export type StoreStory = {
  id: string;
  title: string;
  avatar: string;
  image: string;
};

const SLIDE_DURATION_MS = 3500;

// Progress bar hiển thị đủ số lượng story (vd. có 5 cửa hàng thì có 5 đoạn),
// chứ không phải chỉ số ảnh của riêng 1 cửa hàng — giống Instagram khi xem
// hết story người này sẽ tự chuyển sang người kế tiếp trong cùng 1 hàng.
function StoryViewer({
  stories,
  startIndex,
  onClose,
}: {
  stories: StoreStory[];
  startIndex: number;
  onClose: () => void;
}) {
  const [storyIndex, setStoryIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number>();

  const story = stories[storyIndex];

  const goNext = () => {
    if (storyIndex < stories.length - 1) {
      setStoryIndex((i) => i + 1);
      setProgress(0);
      return;
    }
    handleClose();
  };

  const goPrev = () => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
      setProgress(0);
      return;
    }
    setProgress(0);
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 220);
  };

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const ratio = Math.min(1, elapsed / SLIDE_DURATION_MS);
      setProgress(ratio);

      if (ratio >= 1) {
        goNext();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyIndex]);

  if (!story) return null;

  return createPortal(
    <Box
      className="fixed inset-0 z-[1000] bg-black transition-opacity duration-200 ease-out"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <img
        src={story.image}
        alt={story.title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out"
        style={{ transform: visible ? "scale(1)" : "scale(1.06)" }}
      />

      <Box className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/40" />

      {/* Tap zones */}
      <button
        type="button"
        aria-label="Story trước"
        onClick={goPrev}
        className="absolute inset-y-0 left-0 w-1/3 border-0 bg-transparent p-0"
      />
      <button
        type="button"
        aria-label="Story tiếp theo"
        onClick={goNext}
        className="absolute inset-y-0 right-0 w-2/3 border-0 bg-transparent p-0"
      />

      {/* Progress bars — 1 đoạn cho mỗi story */}
      <Box
        className="absolute inset-x-3 flex gap-1"
        style={{ top: "calc(var(--zaui-safe-area-inset-top, 0px) + 10px)" }}
      >
        {stories.map((item, idx) => (
          <Box
            key={item.id}
            className="overflow-hidden rounded-full bg-white/25"
            style={{ height: 2.5, flex: 1 }}
          >
            <Box
              className="h-full rounded-full bg-white transition-[width] ease-linear"
              style={{
                width:
                  idx < storyIndex
                    ? "100%"
                    : idx === storyIndex
                      ? `${progress * 100}%`
                      : "0%",
                transitionDuration: idx === storyIndex ? "80ms" : "0ms",
              }}
            />
          </Box>
        ))}
      </Box>

      {/* Header */}
      <Box
        className="absolute inset-x-3 flex items-center gap-2.5"
        style={{ top: "calc(var(--zaui-safe-area-inset-top, 0px) + 22px)" }}
      >
        <img
          src={story.avatar}
          alt=""
          className="h-9 w-9 flex-none rounded-full border-2 border-white/80 object-cover"
        />
        <Text className="min-w-0 flex-1 truncate font-semibold text-white">
          {story.title}
        </Text>

        <button
          type="button"
          aria-label="Đóng"
          onClick={handleClose}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full border-0 bg-black/30 p-0 text-white backdrop-blur-sm transition-transform active:scale-90"
        >
          <Icon icon="zi-close" size={18} />
        </button>
      </Box>
    </Box>,
    document.body,
  );
}

function StoreStories({
  stores,
  loading,
}: {
  stores: StoreStory[];
  loading?: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <Box
        className="mt-4 flex flex-none gap-4 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {[0, 1, 2, 3].map((i) => (
          <Box key={i} className="flex flex-none flex-col items-center gap-1.5">
            <Box className="h-16 w-16 animate-pulse rounded-full bg-gray-200" />
            <Box className="h-2.5 w-10 animate-pulse rounded bg-gray-200" />
          </Box>
        ))}
      </Box>
    );
  }

  if (stores.length === 0) return null;

  return (
    <>
      <Box
        className="mt-4 flex flex-none gap-4 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {stores.map((store, index) => (
          <button
            key={store.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="flex flex-none flex-col items-center gap-1.5 border-0 bg-transparent p-0 transition-transform active:scale-95"
          >
            <Box className="rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-500 p-[2.5px]">
              <Box className="rounded-full bg-white p-[2.5px]">
                <img
                  src={store.avatar}
                  alt={store.title}
                  className="h-14 w-14 rounded-full object-cover"
                />
              </Box>
            </Box>
            <Text
              size="xxSmall"
              className="w-16 truncate text-center font-medium text-[#2f2f2f]"
            >
              {store.title}
            </Text>
          </button>
        ))}
      </Box>

      {openIndex !== null && (
        <StoryViewer
          stories={stores}
          startIndex={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}

export default StoreStories;
