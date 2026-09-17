import { useEffect, useState } from "react";
import { Page, Text, Box, Icon, useNavigate } from "zmp-ui";
import { CafeStory, fetchCafeStory } from "@/services/cafe-story";

function StoryPage() {
  const navigate = useNavigate();
  const [story, setStory] = useState<CafeStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchCafeStory()
      .then((data) => {
        if (!cancelled) setStory(data);
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

  return (
    <Page className="flex h-full min-h-0 flex-col overflow-y-auto bg-transparent px-4 py-2 hide-scrollbar">
      <Box
        className="flex items-center gap-3"
        style={{
          paddingTop: "calc(var(--zaui-safe-area-inset-top, 0px))",
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-white/80 text-[#141415] shadow-[0_8px_22px_rgba(0,0,0,0.10)]"
        >
          <Icon icon="zi-arrow-left" size={22} />
        </button>

        <Text.Title size="normal">{story?.title ?? "Mỗi ngày 1 câu chuyện"}</Text.Title>
      </Box>

      <Box className="mt-4 rounded-2xl border border-white/40 bg-white/10 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.15)] backdrop-blur-xl">
        {loading ? (
          <Box className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Box key={i} className="h-4 animate-pulse rounded bg-white/40" />
            ))}
          </Box>
        ) : error || !story ? (
          <Text className="text-sm text-black/60">
            Không tải được câu chuyện hôm nay, vui lòng thử lại sau.
          </Text>
        ) : (
          story.content.split("\n\n").map((paragraph, index) => (
            <Text
              key={index}
              className={`text-sm leading-6 text-black/80 ${index > 0 ? "mt-3" : ""}`}
            >
              {paragraph}
            </Text>
          ))
        )}
      </Box>
    </Page>
  );
}

export default StoryPage;
