// Seed dữ liệu mẫu ban đầu cho các bảng mới (chạy 1 lần, không tự chạy mỗi
// lần deploy như "prisma db push"): npx tsx prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import {
  CATALOG_CATEGORIES,
  CATALOG_PRODUCTS,
} from "../src/data/catalog-seed-data";

const prisma = new PrismaClient();

const STORE_STORIES = [
  {
    title: "Cafe & Tea House",
    location: "Bình Thạnh, Hồ Chí Minh",
    rating: 4.8,
    price: "65.000đ",
    productId: "hc-002",
    purchaseCount: 324234,
    image:
      "https://img.magnific.com/free-photo/composition-with-delicious-thai-tea-beverage_23-2148994334.jpg",
    thumbnail:
      "https://img.magnific.com/free-photo/composition-with-delicious-thai-tea_23-2148994319.jpg",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    title: "The Coffee Corner",
    location: "Quận 1, Hồ Chí Minh",
    rating: 4.7,
    price: "75.000đ",
    productId: "hc-004",
    purchaseCount: 182567,
    image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
    thumbnail:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400",
    avatar: "https://randomuser.me/api/portraits/women/12.jpg",
  },
  {
    title: "Matcha Garden",
    location: "Thảo Điền, Thủ Đức",
    rating: 4.9,
    price: "69.000đ",
    productId: "tea-002",
    purchaseCount: 456892,
    image: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=800",
    thumbnail:
      "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400",
    avatar: "https://randomuser.me/api/portraits/men/22.jpg",
  },
  {
    title: "Saigon Brew Coffee",
    location: "Phú Nhuận, Hồ Chí Minh",
    rating: 4.6,
    price: "55.000đ",
    productId: "tea-004",
    purchaseCount: 215430,
    image: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800",
    thumbnail:
      "https://images.unsplash.com/photo-1498804103079-a6351b050096?w=400",
    avatar: "https://randomuser.me/api/portraits/women/21.jpg",
  },
  {
    title: "Milk Tea Station",
    location: "Gò Vấp, Hồ Chí Minh",
    rating: 4.5,
    price: "75.000đ",
    productId: "fd-004",
    purchaseCount: 298761,
    image: "https://images.unsplash.com/photo-1558857563-b371033873b8?w=800",
    thumbnail:
      "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=400",
    avatar: "https://randomuser.me/api/portraits/men/18.jpg",
  },
];

const FEATURE_CARDS = [
  {
    title: "Cafe & Tea House",
    location: "Bình Thạnh, Hồ Chí Minh",
    rating: 4.8,
    price: "65.000đ",
    productId: "hc-002",
    purchaseCount: 324234,
    image:
      "https://img.magnific.com/free-photo/composition-with-delicious-thai-tea-beverage_23-2148994334.jpg",
    thumbnail:
      "https://img.magnific.com/free-photo/composition-with-delicious-thai-tea_23-2148994319.jpg",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    title: "The Coffee Corner",
    location: "Quận 1, Hồ Chí Minh",
    rating: 4.7,
    price: "75.000đ",
    productId: "hc-004",
    purchaseCount: 182567,
    image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
    thumbnail:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400",
    avatar: "https://randomuser.me/api/portraits/women/12.jpg",
  },
  {
    title: "Matcha Garden",
    location: "Thảo Điền, Thủ Đức",
    rating: 4.9,
    price: "69.000đ",
    productId: "tea-002",
    purchaseCount: 456892,
    image: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=800",
    thumbnail:
      "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400",
    avatar: "https://randomuser.me/api/portraits/men/22.jpg",
  },
  {
    title: "Saigon Brew Coffee",
    location: "Phú Nhuận, Hồ Chí Minh",
    rating: 4.6,
    price: "55.000đ",
    productId: "tea-004",
    purchaseCount: 215430,
    image: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800",
    thumbnail:
      "https://images.unsplash.com/photo-1498804103079-a6351b050096?w=400",
    avatar: "https://randomuser.me/api/portraits/women/21.jpg",
  },
  {
    title: "Milk Tea Station",
    location: "Gò Vấp, Hồ Chí Minh",
    rating: 4.5,
    price: "75.000đ",
    productId: "fd-004",
    purchaseCount: 298761,
    image: "https://images.unsplash.com/photo-1558857563-b371033873b8?w=800",
    thumbnail:
      "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=400",
    avatar: "https://randomuser.me/api/portraits/men/18.jpg",
  },
];

const CAFE_STORY = {
  title: "Mỗi ngày 1 câu chuyện",
  content: [
    "Cà phê ngon không chỉ là một thức uống — đó là khoảnh khắc đánh thức tâm trí và sưởi ấm tâm hồn bạn. Mỗi hạt cà phê đi qua một hành trình dài, từ những nông trại trên cao nguyên đầy nắng gió, qua bàn tay tỉ mỉ của người rang xay, để rồi hội tụ trong tách cà phê bạn cầm trên tay mỗi sáng.",
    "Có người tìm đến cà phê để bắt đầu một ngày mới tràn đầy năng lượng, có người lại xem đó là khoảng lặng để suy ngẫm, trò chuyện cùng bạn bè hay đơn giản là ngồi một mình ngắm phố phường trôi qua khung cửa sổ.",
    "Dù bạn thưởng thức cà phê theo cách nào, chúng tôi tin rằng mỗi tách cà phê đều mang trong mình một câu chuyện riêng — câu chuyện của hương vị, của con người, và của những khoảnh khắc đáng nhớ trong cuộc sống thường ngày.",
  ].join("\n\n"),
};

const NOTIFICATIONS = [
  {
    userId: null,
    type: "promo",
    title: "Ưu đãi hôm nay",
    message: "Giảm 20% cho tất cả trà trái cây, chỉ áp dụng hôm nay!",
  },
  {
    userId: null,
    type: "system",
    title: "Chào mừng bạn!",
    message: "Cảm ơn bạn đã tham gia BoomBerry, khám phá ưu đãi thành viên ngay.",
  },
];

// linkValue của loại "category" là category SLUG (vd "hot-coffees"), được đổi
// sang đúng id thật trong DB ở seedPromotions() bên dưới — vì id là cuid chỉ
// biết được sau khi seedCatalog() chạy xong.
const PROMOTIONS = [
  {
    title: "Latte hôm nay",
    subtitle: "Ưu đãi nhẹ cho một ngày thật ngọt.",
    content:
      "Giảm ngay 10.000đ cho mọi ly Caffè Latte khi đặt qua Mini App, áp dụng cho đơn hàng đầu tiên trong ngày.",
    discountLabel: "-10.000đ",
    code: "LATTE10K",
    image:
      "https://img.magnific.com/free-photo/composition-with-delicious-thai-tea_23-2148994319.jpg",
    linkType: "product",
    linkValue: "hc-002",
    endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    sortOrder: 0,
  },
  {
    title: "Cà phê lạnh mùa hè",
    subtitle: "Đậm vị, mát lạnh cả ngày.",
    content:
      "Bộ sưu tập cà phê lạnh chính thức ra mắt — đậm đà, mát lạnh, giá không đổi.",
    discountLabel: "MỚI",
    code: null,
    image:
      "https://img.magnific.com/free-photo/composition-with-delicious-thai-tea-beverage_23-2148994334.jpg",
    linkType: "category",
    linkValue: "cold-coffees",
    endAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    sortOrder: 1,
  },
  {
    title: "Pink Drink signature",
    subtitle: "Một chút chua ngọt cho buổi chiều.",
    content:
      "Pink Drink — thức uống chua ngọt tự nhiên, béo nhẹ vị dừa, chỉ có tại BoomBerry.",
    discountLabel: "-20%",
    code: "PINK20",
    image:
      "https://img.magnific.com/free-photo/arrangement-with-delicious-traditional-thai-tea_23-2148994372.jpg",
    linkType: "product",
    linkValue: "rf-003",
    endAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    sortOrder: 2,
  },
];

async function seedCatalog() {
  const idBySlug = new Map<string, string>();

  for (const category of CATALOG_CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: {
        name: category.name,
        nameEn: category.nameEn,
        imageUrl: category.imageUrl,
        sortOrder: category.sortOrder,
      },
    });
    idBySlug.set(category.slug, record.id);
  }

  for (const product of CATALOG_PRODUCTS) {
    const categoryId = idBySlug.get(product.categorySlug);
    const data = {
      title: product.title,
      titleEn: product.titleEn,
      price: product.sizes[0]?.price ?? 0,
      image: product.image,
      categoryId,
      sizes: product.sizes,
      customizations: product.customizations,
      nutrition: product.nutrition ?? undefined,
      allergens: product.allergens,
      tags: product.tags,
      description: product.description,
      isActive: product.isActive,
    };

    await prisma.product.upsert({
      where: { id: product.id },
      create: { id: product.id, ...data },
      update: data,
    });
  }

  console.log(
    `Seeded catalog: ${CATALOG_CATEGORIES.length} categories, ${CATALOG_PRODUCTS.length} products`,
  );

  return idBySlug;
}

async function main() {
  const categoryIdBySlug = await seedCatalog();

  if ((await prisma.promotion.count()) === 0) {
    await prisma.promotion.createMany({
      data: PROMOTIONS.map((promo) => ({
        ...promo,
        linkValue:
          promo.linkType === "category"
            ? categoryIdBySlug.get(promo.linkValue) ?? promo.linkValue
            : promo.linkValue,
      })),
    });
    console.log("Seeded promotions");
  }

  if ((await prisma.cafeStory.count()) === 0) {
    await prisma.cafeStory.create({ data: CAFE_STORY });
    console.log("Seeded cafe_stories");
  }

  // Story chỉ sống 24h nên "bảng trống" không đủ để biết có cần seed lại —
  // chỉ seed khi không còn story nào còn hạn, và dọn các dòng đã hết hạn.
  const activeStories = await prisma.storeStory.count({
    where: { expiresAt: { gt: new Date() } },
  });

  if (activeStories === 0) {
    await prisma.storeStory.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    await prisma.storeStory.createMany({
      data: STORE_STORIES.map((story) => ({
        ...story,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })),
    });
    console.log("Seeded store_stories");
  }

  if ((await prisma.featureCard.count()) === 0) {
    await prisma.featureCard.createMany({
      data: FEATURE_CARDS.map((card, index) => ({ ...card, sortOrder: index })),
    });
    console.log("Seeded feature_cards");
  }

  if ((await prisma.notification.count()) === 0) {
    await prisma.notification.createMany({ data: NOTIFICATIONS });
    console.log("Seeded notifications");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
