import { prisma } from "@/lib/prisma";

export type StoreStory = {
  id: string;
  title: string;
  location?: string;
  rating?: number;
  price?: string;
  avatar: string;
  image: string;
  thumbnail?: string;
  productId?: string;
  purchaseCount: number;
  createdAt: number;
  expiresAt: number;
};

function toStoreStory(row: {
  id: string;
  title: string;
  location: string | null;
  rating: number | null;
  price: string | null;
  avatar: string;
  image: string;
  thumbnail: string | null;
  productId: string | null;
  purchaseCount: number;
  createdAt: Date;
  expiresAt: Date;
}): StoreStory {
  return {
    id: row.id,
    title: row.title,
    location: row.location ?? undefined,
    rating: row.rating ?? undefined,
    price: row.price ?? undefined,
    avatar: row.avatar,
    image: row.image,
    thumbnail: row.thumbnail ?? undefined,
    productId: row.productId ?? undefined,
    purchaseCount: row.purchaseCount,
    createdAt: row.createdAt.getTime(),
    expiresAt: row.expiresAt.getTime(),
  };
}

// Story chỉ sống trong 24h — quá hạn (expiresAt < now) sẽ không trả về nữa,
// giống story Instagram/Zalo tự biến mất mà không cần job dọn dữ liệu riêng.
export async function listActiveStoreStories(): Promise<StoreStory[]> {
  const rows = await prisma.storeStory.findMany({
    where: { expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  return rows.map(toStoreStory);
}

export async function createStoreStory(input: {
  title: string;
  location?: string;
  rating?: number;
  price?: string;
  avatar: string;
  image: string;
  thumbnail?: string;
  productId?: string;
  ttlHours?: number;
}): Promise<StoreStory> {
  const ttlHours = input.ttlHours ?? 24;
  const row = await prisma.storeStory.create({
    data: {
      title: input.title,
      location: input.location,
      rating: input.rating,
      price: input.price,
      avatar: input.avatar,
      image: input.image,
      thumbnail: input.thumbnail,
      productId: input.productId,
      expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
    },
  });

  return toStoreStory(row);
}
