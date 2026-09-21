// Dữ liệu seed catalog (category + product) — nạp 1 lần vào DB bằng
// `npx tsx prisma/seed.ts`, sau đó admin sửa trực tiếp trong DB, không cần
// sửa lại file này/deploy lại code. Nguồn: danh sách món phong cách
// Starbucks do người dùng cung cấp (giá đã quy đổi VND).
import { ProductCustomization, ProductSize } from "@/types/product";

export type CatalogCategorySeed = {
  slug: string;
  name: string; // tiếng Việt
  nameEn: string;
  sortOrder: number;
  imageUrl: string;
};

export type CatalogProductSeed = {
  id: string;
  categorySlug: string;
  title: string; // tiếng Việt
  titleEn: string;
  description: string;
  image: string;
  sizes: ProductSize[];
  customizations: ProductCustomization[];
  nutrition: Record<string, number> | null;
  allergens: string[];
  tags: string[];
  isActive: boolean;
};

// Ảnh mô phỏng (không phải ảnh Starbucks thật — không có nguồn hợp lệ để lấy,
// xem trao đổi trước đó) — dùng Lorem Picsum, seed cố định theo slug/id để
// mỗi món/danh mục luôn ra đúng 1 ảnh, không đổi mỗi lần tải lại trang.
function categoryImage(slug: string) {
  return `https://picsum.photos/seed/${slug}/400/400`;
}
function productImage(id: string) {
  return `https://picsum.photos/seed/${id}/600/600`;
}

export const CATALOG_CATEGORIES: CatalogCategorySeed[] = [
  { slug: "hot-coffees", name: "Cà phê nóng", nameEn: "Hot Coffees", sortOrder: 1, imageUrl: categoryImage("hot-coffees") },
  { slug: "cold-coffees", name: "Cà phê lạnh", nameEn: "Cold Coffees", sortOrder: 2, imageUrl: categoryImage("cold-coffees") },
  { slug: "teas", name: "Trà", nameEn: "Teas", sortOrder: 3, imageUrl: categoryImage("teas") },
  { slug: "refreshers", name: "Nước giải khát", nameEn: "Refreshers", sortOrder: 4, imageUrl: categoryImage("refreshers") },
  { slug: "food", name: "Đồ ăn", nameEn: "Food", sortOrder: 5, imageUrl: categoryImage("food") },
  { slug: "merchandise", name: "Sản phẩm lưu niệm", nameEn: "Merchandise", sortOrder: 6, imageUrl: categoryImage("merchandise") },
];

const MILK: ProductCustomization = {
  name: "Milk",
  type: "single",
  options: ["Whole", "Nonfat", "Oat", "Almond", "Soy"],
};
const ICE: ProductCustomization = {
  name: "Ice",
  type: "single",
  options: ["Less", "Regular", "Extra"],
};
const SWEETNESS: ProductCustomization = {
  name: "Sweetness",
  type: "single",
  options: ["0%", "50%", "100%"],
};
const EXTRA_SHOT: ProductCustomization = {
  name: "Extra shot",
  type: "toggle",
  priceDelta: 15000,
};
const SYRUP: ProductCustomization = {
  name: "Syrup",
  type: "multi",
  options: ["Vanilla", "Caramel", "Hazelnut"],
  priceDelta: 10000,
};

function sizes(tall: number, grande: number, venti: number): ProductSize[] {
  return [
    { code: "tall", label: "Tall", volumeMl: 354, price: tall },
    { code: "grande", label: "Grande", volumeMl: 473, price: grande },
    { code: "venti", label: "Venti", volumeMl: 591, price: venti },
  ];
}

function oneSize(price: number): ProductSize[] {
  return [{ code: "one-size", label: "Standard", volumeMl: null, price }];
}

export const CATALOG_PRODUCTS: CatalogProductSeed[] = [
  {
    id: "hc-001",
    categorySlug: "hot-coffees",
    title: "Cà phê Americano",
    titleEn: "Caffè Americano",
    description: "Espresso shots topped with hot water for a light layer of crema.",
    image: productImage("hc-001"),
    sizes: sizes(55000, 62000, 69000),
    customizations: [EXTRA_SHOT],
    nutrition: { caloriesGrande: 15, sugarG: 2, fatG: 1, proteinG: 0, caffeineMg: 225 },
    allergens: [],
    tags: ["bestseller"],
    isActive: true,
  },
  {
    id: "hc-002",
    categorySlug: "hot-coffees",
    title: "Cà phê Latte",
    titleEn: "Caffè Latte",
    description: "Rich espresso balanced with steamed milk and a light layer of foam.",
    image: productImage("hc-002"),
    sizes: sizes(65000, 72000, 79000),
    customizations: [MILK, EXTRA_SHOT, SYRUP],
    nutrition: { caloriesGrande: 190, sugarG: 23, fatG: 8, proteinG: 6, caffeineMg: 150 },
    allergens: ["milk"],
    tags: ["classic"],
    isActive: true,
  },
  {
    id: "hc-003",
    categorySlug: "hot-coffees",
    title: "Cappuccino",
    titleEn: "Cappuccino",
    description: "Espresso with silky steamed milk and a deep layer of foam.",
    image: productImage("hc-003"),
    sizes: sizes(65000, 72000, 79000),
    customizations: [MILK, EXTRA_SHOT, SYRUP],
    nutrition: { caloriesGrande: 140, sugarG: 17, fatG: 6, proteinG: 4, caffeineMg: 150 },
    allergens: ["milk"],
    tags: [],
    isActive: true,
  },
  {
    id: "hc-004",
    categorySlug: "hot-coffees",
    title: "Caramel Macchiato",
    titleEn: "Caramel Macchiato",
    description: "Freshly steamed milk with vanilla syrup, espresso and caramel drizzle.",
    image: productImage("hc-004"),
    sizes: sizes(75000, 82000, 89000),
    customizations: [MILK, EXTRA_SHOT, SYRUP],
    nutrition: { caloriesGrande: 250, sugarG: 30, fatG: 10, proteinG: 8, caffeineMg: 150 },
    allergens: ["milk"],
    tags: ["bestseller"],
    isActive: true,
  },
  {
    id: "cc-001",
    categorySlug: "cold-coffees",
    title: "Latte đá",
    titleEn: "Iced Caffè Latte",
    description: "Espresso poured over ice with cold milk.",
    image: productImage("cc-001"),
    sizes: sizes(65000, 72000, 79000),
    customizations: [ICE, MILK, EXTRA_SHOT, SYRUP],
    nutrition: { caloriesGrande: 130, sugarG: 16, fatG: 5, proteinG: 4, caffeineMg: 150 },
    allergens: ["milk"],
    tags: [],
    isActive: true,
  },
  {
    id: "cc-002",
    categorySlug: "cold-coffees",
    title: "Cold Brew",
    titleEn: "Cold Brew",
    description: "Slow-steeped for 20 hours, smooth and naturally sweet.",
    image: productImage("cc-002"),
    sizes: sizes(65000, 72000, 79000),
    customizations: [ICE],
    nutrition: { caloriesGrande: 5, sugarG: 1, fatG: 0, proteinG: 0, caffeineMg: 205 },
    allergens: [],
    tags: ["signature"],
    isActive: true,
  },
  {
    id: "cc-003",
    categorySlug: "cold-coffees",
    title: "Cold Brew kem vani",
    titleEn: "Vanilla Sweet Cream Cold Brew",
    description: "Cold brew finished with a float of vanilla sweet cream.",
    image: productImage("cc-003"),
    sizes: sizes(79000, 86000, 93000),
    customizations: [ICE, MILK, EXTRA_SHOT, SYRUP],
    nutrition: { caloriesGrande: 110, sugarG: 13, fatG: 4, proteinG: 3, caffeineMg: 185 },
    allergens: ["milk"],
    tags: ["new"],
    isActive: true,
  },
  {
    id: "cc-004",
    categorySlug: "cold-coffees",
    title: "Java Chip Frappuccino",
    titleEn: "Java Chip Frappuccino",
    description: "Coffee blended with mocha sauce and Frappuccino chips, topped with whipped cream.",
    image: productImage("cc-004"),
    sizes: sizes(85000, 92000, 99000),
    customizations: [MILK],
    nutrition: { caloriesGrande: 440, sugarG: 53, fatG: 18, proteinG: 13, caffeineMg: 95 },
    allergens: ["milk", "soy"],
    tags: ["bestseller"],
    isActive: true,
  },
  {
    id: "tea-001",
    categorySlug: "teas",
    title: "Trà đen đá",
    titleEn: "Iced Black Tea",
    description: "Freshly brewed black tea served over ice.",
    image: productImage("tea-001"),
    sizes: sizes(49000, 55000, 61000),
    customizations: [SWEETNESS, ICE],
    nutrition: { caloriesGrande: 0, sugarG: 0, fatG: 0, proteinG: 0, caffeineMg: 40 },
    allergens: [],
    tags: [],
    isActive: true,
  },
  {
    id: "tea-002",
    categorySlug: "teas",
    title: "Matcha Latte",
    titleEn: "Green Tea Latte",
    description: "Smooth matcha green tea with steamed milk.",
    image: productImage("tea-002"),
    sizes: sizes(69000, 76000, 83000),
    customizations: [MILK, SWEETNESS],
    nutrition: { caloriesGrande: 240, sugarG: 29, fatG: 10, proteinG: 7, caffeineMg: 70 },
    allergens: ["milk"],
    tags: ["classic"],
    isActive: true,
  },
  {
    id: "tea-003",
    categorySlug: "teas",
    title: "Chai Latte",
    titleEn: "Chai Tea Latte",
    description: "Black tea infused with cinnamon, clove and warming spices, with steamed milk.",
    image: productImage("tea-003"),
    sizes: sizes(69000, 76000, 83000),
    customizations: [MILK, SWEETNESS],
    nutrition: { caloriesGrande: 240, sugarG: 29, fatG: 10, proteinG: 7, caffeineMg: 95 },
    allergens: ["milk"],
    tags: [],
    isActive: true,
  },
  {
    id: "tea-004",
    categorySlug: "teas",
    title: "Trà đào Tranquility",
    titleEn: "Peach Tranquility Tea",
    description: "Herbal blend of peach, chamomile and lemon verbena.",
    image: productImage("tea-004"),
    sizes: sizes(55000, 62000, 69000),
    customizations: [SWEETNESS, ICE],
    nutrition: { caloriesGrande: 0, sugarG: 0, fatG: 0, proteinG: 0, caffeineMg: 0 },
    allergens: [],
    tags: ["caffeine-free"],
    isActive: true,
  },
  {
    id: "rf-001",
    categorySlug: "refreshers",
    title: "Strawberry Açaí Refresher",
    titleEn: "Strawberry Açaí Refresher",
    description: "Sweet strawberry and açaí flavors with real freeze-dried strawberries.",
    image: productImage("rf-001"),
    sizes: sizes(69000, 76000, 83000),
    customizations: [ICE],
    nutrition: { caloriesGrande: 90, sugarG: 11, fatG: 4, proteinG: 3, caffeineMg: 45 },
    allergens: [],
    tags: ["bestseller"],
    isActive: true,
  },
  {
    id: "rf-002",
    categorySlug: "refreshers",
    title: "Mango Dragonfruit Refresher",
    titleEn: "Mango Dragonfruit Refresher",
    description: "Tropical mango and dragonfruit with real dragonfruit pieces.",
    image: productImage("rf-002"),
    sizes: sizes(69000, 76000, 83000),
    customizations: [ICE],
    nutrition: { caloriesGrande: 100, sugarG: 12, fatG: 4, proteinG: 3, caffeineMg: 45 },
    allergens: [],
    tags: [],
    isActive: true,
  },
  {
    id: "rf-003",
    categorySlug: "refreshers",
    title: "Pink Drink",
    titleEn: "Pink Drink",
    description: "Strawberry Açaí Refresher made with creamy coconutmilk.",
    image: productImage("rf-003"),
    sizes: sizes(75000, 82000, 89000),
    customizations: [ICE],
    nutrition: { caloriesGrande: 140, sugarG: 17, fatG: 6, proteinG: 4, caffeineMg: 45 },
    allergens: ["tree-nut"],
    tags: ["signature"],
    isActive: true,
  },
  {
    id: "rf-004",
    categorySlug: "refreshers",
    title: "Lemonade Refresher",
    titleEn: "Lemonade Refresher",
    description: "Fresh lemonade lightly sweetened, served over ice.",
    image: productImage("rf-004"),
    sizes: sizes(55000, 62000, 69000),
    customizations: [ICE],
    nutrition: { caloriesGrande: 70, sugarG: 8, fatG: 3, proteinG: 2, caffeineMg: 0 },
    allergens: [],
    tags: [],
    isActive: true,
  },
  {
    id: "fd-001",
    categorySlug: "food",
    title: "Bánh croissant bơ",
    titleEn: "Butter Croissant",
    description: "Flaky, buttery croissant baked fresh daily.",
    image: productImage("fd-001"),
    sizes: oneSize(49000),
    customizations: [],
    nutrition: { calories: 260 },
    allergens: ["gluten", "milk", "egg"],
    tags: ["bakery"],
    isActive: true,
  },
  {
    id: "fd-002",
    categorySlug: "food",
    title: "Muffin chocolate",
    titleEn: "Chocolate Muffin",
    description: "Moist chocolate muffin with chocolate chips.",
    image: productImage("fd-002"),
    sizes: oneSize(55000),
    customizations: [],
    nutrition: { calories: 410 },
    allergens: ["gluten", "milk", "egg", "soy"],
    tags: ["bakery"],
    isActive: true,
  },
  {
    id: "fd-003",
    categorySlug: "food",
    title: "Sandwich gà pesto",
    titleEn: "Chicken Pesto Sandwich",
    description: "Grilled chicken, basil pesto and mozzarella on ciabatta.",
    image: productImage("fd-003"),
    sizes: oneSize(89000),
    customizations: [],
    nutrition: { calories: 430 },
    allergens: ["gluten", "milk", "egg"],
    tags: ["savory"],
    isActive: true,
  },
  {
    id: "fd-004",
    categorySlug: "food",
    title: "Bánh cheesecake New York",
    titleEn: "New York Cheesecake",
    description: "Classic creamy cheesecake with a graham cracker crust.",
    image: productImage("fd-004"),
    sizes: oneSize(75000),
    customizations: [],
    nutrition: { calories: 380 },
    allergens: ["gluten", "milk", "egg"],
    tags: ["dessert"],
    isActive: true,
  },
  {
    id: "mr-001",
    categorySlug: "merchandise",
    title: "Ly sứ cổ điển 355ml",
    titleEn: "Classic Ceramic Mug 355ml",
    description: "White ceramic mug with the classic green logo.",
    image: productImage("mr-001"),
    sizes: oneSize(299000),
    customizations: [],
    nutrition: null,
    allergens: [],
    tags: ["gift"],
    isActive: true,
  },
  {
    id: "mr-002",
    categorySlug: "merchandise",
    title: "Bình giữ nhiệt 473ml",
    titleEn: "Stainless Steel Tumbler 473ml",
    description: "Double-wall insulated tumbler, keeps drinks hot or cold.",
    image: productImage("mr-002"),
    sizes: oneSize(490000),
    customizations: [],
    nutrition: null,
    allergens: [],
    tags: ["eco"],
    isActive: true,
  },
  {
    id: "mr-003",
    categorySlug: "merchandise",
    title: "Cà phê hạt Pike Place 250g",
    titleEn: "Whole Bean Pike Place 250g",
    description: "Medium roast with subtle notes of cocoa and toasted nuts.",
    image: productImage("mr-003"),
    sizes: oneSize(250000),
    customizations: [],
    nutrition: null,
    allergens: [],
    tags: ["coffee-beans"],
    isActive: true,
  },
  {
    id: "mr-004",
    categorySlug: "merchandise",
    title: "Ly nhựa dùng lại 710ml",
    titleEn: "Reusable Cold Cup 710ml",
    description: "Reusable cold cup with lid and straw.",
    image: productImage("mr-004"),
    sizes: oneSize(199000),
    customizations: [],
    nutrition: null,
    allergens: [],
    tags: ["eco"],
    isActive: true,
  },
];
