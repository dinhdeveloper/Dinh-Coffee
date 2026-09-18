import { prisma } from "@/lib/prisma";

export type Promotion = {
  id: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  image: string | null;
  linkType: string;
  linkValue: string | null;
  startAt: number | null;
  endAt: number | null;
  createdAt: number;
};

function toPromotion(row: {
  id: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  image: string | null;
  linkType: string;
  linkValue: string | null;
  startAt: Date | null;
  endAt: Date | null;
  createdAt: Date;
}): Promotion {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    content: row.content,
    image: row.image,
    linkType: row.linkType,
    linkValue: row.linkValue,
    startAt: row.startAt ? row.startAt.getTime() : null,
    endAt: row.endAt ? row.endAt.getTime() : null,
    createdAt: row.createdAt.getTime(),
  };
}

// Banner ở trang chủ — chỉ lấy khuyến mãi đang bật và trong khoảng thời gian
// hiệu lực (startAt/endAt null = không giới hạn phía đó).
export async function listActivePromotions(): Promise<Promotion[]> {
  const now = new Date();

  const rows = await prisma.promotion.findMany({
    where: {
      isActive: true,
      OR: [{ startAt: null }, { startAt: { lte: now } }],
      AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
    },
    orderBy: { sortOrder: "asc" },
  });

  return rows.map(toPromotion);
}

export async function getPromotionById(id: string): Promise<Promotion | null> {
  const row = await prisma.promotion.findUnique({ where: { id } });
  return row ? toPromotion(row) : null;
}
