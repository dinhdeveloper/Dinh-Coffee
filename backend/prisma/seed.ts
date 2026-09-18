// Seed dữ liệu mẫu ban đầu cho các bảng mới (chạy 1 lần, không tự chạy mỗi
// lần deploy như "prisma db push"): npx tsx prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STORE_STORIES = [
  {
    title: "Cafe & Tea House",
    location: "Bình Thạnh, Hồ Chí Minh",
    rating: 4.8,
    price: "35.000đ",
    productId: "tra-sua-tran-chau",
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
    price: "45.000đ",
    productId: "ca-phe-muoi",
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
    price: "55.000đ",
    productId: "matcha-da-xay",
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
    price: "39.000đ",
    productId: "tra-dao-cam-sa",
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
    price: "42.000đ",
    productId: "banh-flan-tra-sua",
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

const PROMOTIONS = [
  {
    title: "Trà sữa hôm nay",
    subtitle: "Ưu đãi nhẹ cho một ngày thật ngọt.",
    content:
      "Giảm ngay 10.000đ cho mọi ly trà sữa trân châu khi đặt qua Mini App, áp dụng cho đơn hàng đầu tiên trong ngày.",
    image:
      "https://img.magnific.com/free-photo/composition-with-delicious-thai-tea_23-2148994319.jpg",
    linkType: "product",
    linkValue: "tra-sua-tran-chau",
    sortOrder: 0,
  },
  {
    title: "Vị Thái thơm béo",
    subtitle: "Đậm vị trà, mịn vị sữa.",
    content:
      "Bộ sưu tập trà sữa phong cách Thái Lan chính thức ra mắt — đậm đà, béo mịn, giá không đổi.",
    image:
      "https://img.magnific.com/free-photo/composition-with-delicious-thai-tea-beverage_23-2148994334.jpg",
    linkType: "category",
    linkValue: "Trà sữa",
    sortOrder: 1,
  },
  {
    title: "Berry signature",
    subtitle: "Một chút chua ngọt cho buổi chiều.",
    content:
      "Berry signature — thức uống chua ngọt tự nhiên, topping bồng bềnh, chỉ có tại BoomBerry.",
    image:
      "https://img.magnific.com/free-photo/arrangement-with-delicious-traditional-thai-tea_23-2148994372.jpg",
    linkType: "product",
    linkValue: "berry-signature",
    sortOrder: 2,
  },
];

async function main() {
  if ((await prisma.promotion.count()) === 0) {
    await prisma.promotion.createMany({ data: PROMOTIONS });
    console.log("Seeded promotions");
  }

  if ((await prisma.cafeStory.count()) === 0) {
    await prisma.cafeStory.create({ data: CAFE_STORY });
    console.log("Seeded cafe_stories");
  }

  if ((await prisma.storeStory.count()) === 0) {
    await prisma.storeStory.createMany({
      data: STORE_STORIES.map((story) => ({
        ...story,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })),
    });
    console.log("Seeded store_stories");
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
