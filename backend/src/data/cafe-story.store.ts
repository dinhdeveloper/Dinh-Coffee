import { prisma } from "@/lib/prisma";

export type CafeStory = {
  id: string;
  title: string;
  content: string;
  publishedAt: number;
};

function toCafeStory(row: {
  id: string;
  title: string;
  content: string;
  publishedAt: Date;
}): CafeStory {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    publishedAt: row.publishedAt.getTime(),
  };
}

// "Mỗi ngày 1 câu chuyện" — luôn lấy bài mới nhất đã publish.
export async function getLatestCafeStory(): Promise<CafeStory | null> {
  const row = await prisma.cafeStory.findFirst({
    orderBy: { publishedAt: "desc" },
  });

  return row ? toCafeStory(row) : null;
}

export async function listCafeStories(): Promise<CafeStory[]> {
  const rows = await prisma.cafeStory.findMany({
    orderBy: { publishedAt: "desc" },
  });

  return rows.map(toCafeStory);
}
