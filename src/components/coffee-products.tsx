import { useEffect, useState } from "react";
import { Box, Text } from "zmp-ui";

type CoffeeItem = {
  name: string;
  price: string;
  image: string;
  rating?: string;
  reviews?: string;
  type: "large" | "small";
};

const coffeeRows = [
  {
    large: {
      name: "Coffee Robusta Bag",
      price: "1.950.000 VNĐ",
      image:
        "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500",
      rating: "4.9",
      reviews: "150 Review",
    },

    smallTop: {
      name: "Coffee Arabica Bag",
      price: "1.240.000 VNĐ",
      image:
        "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=300",
    },

    smallBottom: {
      name: "Coffee Culi Bag",
      price: "1.130.000 VNĐ",
      image:
        "https://images.unsplash.com/photo-1498804103079-a6351b050096?w=300",
    },
  },

  {
    large: {
      name: "Coffee Arabica Premium",
      price: "1.850.000 VNĐ",
      image:
        "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=500",
      rating: "4.8",
      reviews: "128 Review",
    },

    smallTop: {
      name: "Coffee Robusta",
      price: "1.120.000 VNĐ",
      image:
        "https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?w=300",
    },

    smallBottom: {
      name: "Coffee Blend",
      price: "980.000 VNĐ",
      image:
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300",
    },
  },
] as const;

function AnimatedWrapper({
  children,
  direction = "left",
  delay = 0,
}: {
  children: React.ReactNode;
  direction?: "left" | "right";
  delay?: number;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Box
      className="transition-all duration-[2000ms] ease-in-out"
      style={{
        transform: show
          ? "translateX(0)"
          : direction === "left"
            ? "translateX(-250px)"
            : "translateX(250px)",
        opacity: show ? 1 : 0,
      }}
    >
      {children}
    </Box>
  );
}

function SmallCoffeeCard({
  item,
}: {
  item: CoffeeItem;
}) {
  return (
    <Box
      className="
        relative
        h-[150px]
        w-full
        overflow-visible
        rounded-2xl
        border
        border-white/40
        bg-white/10
        shadow-[0_8px_25px_rgba(0,0,0,0.08)]
        backdrop-blur-xl
      "
    >
      {/* Background glass */}
      <Box className="absolute inset-0 rounded-2xl bg-white/10" />

      {/* Gradient border */}
      <Box
        className="
          pointer-events-none
          absolute
          inset-0
          rounded-2xl
          border
          border-white/30
        "
      />

      {/* Coffee image */}
      <Box className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[25px]">
        <img
          src={item.image}
          alt={item.name}
          className="
            h-[100px]
            w-[80px]
            rounded-lg
            object-cover
            shadow-[0_8px_20px_rgba(0,0,0,0.15)]
          "
        />
      </Box>

      {/* Product name */}
      <Box className="absolute bottom-[40px] left-0 right-0 px-2 text-center">
        <Text
          size="small"
          className="
            truncate
            font-bold
            text-[#2f2f2f]
            drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]
          "
        >
          {item.name}
        </Text>
      </Box>

      {/* Price */}
      <Box className="absolute bottom-[18px] left-0 right-0 text-center">
        <Text
          size="xSmall"
          className="font-bold text-[#2f2f2f]/80"
        >
          {item.price}
        </Text>
      </Box>
    </Box>
  );
}

function LargeCoffeeCard({
  item,
}: {
  item: CoffeeItem;
}) {
  return (
    <Box
      className="
        relative
        h-[320px]
        w-full
        overflow-hidden
        rounded-2xl
        border
        border-white/40
        bg-white/10
        shadow-[0_10px_30px_rgba(0,0,0,0.10)]
        backdrop-blur-xl
      "
    >
      {/* Glass background */}
      <Box className="absolute inset-0 bg-white/10" />

      {/* Content */}
      <Box className="relative flex h-full flex-col pt-4">
        {/* Product image */}
        <Box className="flex flex-1 items-center justify-center">
          <Box className="relative">
            <img
              src={item.image}
              alt={item.name}
              className="
                h-[220px]
                w-[150px]
                rounded-xl
                object-cover
                shadow-[0_10px_25px_rgba(0,0,0,0.15)]
              "
            />

            {/* TOP badge */}
            <Box
              className="
                absolute
                right-0
                top-[10px]
                rounded-l-full
                bg-white
                px-4
                py-1.5
                shadow-[0_4px_10px_rgba(0,0,0,0.10)]
              "
            >
              <Text className="font-bold text-red-400">
                Top
              </Text>
            </Box>
          </Box>
        </Box>

        {/* Product name */}
        <Box className="px-3">
          <Text
            size="small"
            className="
              font-bold
              text-[#2f2f2f]
              drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]
            "
          >
            {item.name}
          </Text>
        </Box>

        {/* Price */}
        <Box className="px-3 pb-1 pt-1">
          <Text
            size="small"
            className="font-bold text-[#2f2f2f]/90"
          >
            {item.price}
          </Text>
        </Box>

        {/* Review + Rating */}
        <Box className="flex items-center justify-between px-3 pb-4 pt-1">
          <Box>
            <Text
              size="xSmall"
              className="text-[#2f2f2f]/80"
            >
              {item.reviews}
            </Text>

            <Text className="mt-1 text-[13px] tracking-wide">
              ⭐⭐⭐⭐⭐
            </Text>
          </Box>

          {/* Color dot */}
          <Box className="h-6 w-6 rounded-full bg-red-400 shadow-sm" />
        </Box>
      </Box>
    </Box>
  );
}

function CoffeeProducts() {
  return (
    <Box className="mt-6 w-full">
      {coffeeRows.map((row, rowIndex) => {
        const isEven = rowIndex % 2 === 0;

        return (
          <Box
            key={rowIndex}
            className="mb-6 flex w-full items-start gap-3"
          >
            {/* =====================================
                BÊN TRÁI
                ===================================== */}

            {isEven ? (
              // Row chẵn:
              // LARGE bên trái
              <Box className="w-1/2 min-w-0">
                <AnimatedWrapper
                  direction="left"
                  delay={rowIndex * 150}
                >
                  <LargeCoffeeCard
                    item={{
                      ...row.large,
                      type: "large",
                    }}
                  />
                </AnimatedWrapper>
              </Box>
            ) : (
              // Row lẻ:
              // 2 SMALL bên trái
              <Box className="flex w-1/2 min-w-0 flex-col gap-10 pt-8">
                <AnimatedWrapper
                  direction="left"
                  delay={rowIndex * 150}
                >
                  <SmallCoffeeCard
                    item={{
                      ...row.smallTop,
                      type: "small",
                    }}
                  />
                </AnimatedWrapper>

                <AnimatedWrapper
                  direction="left"
                  delay={rowIndex * 150 + 200}
                >
                  <SmallCoffeeCard
                    item={{
                      ...row.smallBottom,
                      type: "small",
                    }}
                  />
                </AnimatedWrapper>
              </Box>
            )}

            {/* =====================================
                BÊN PHẢI
                ===================================== */}

            {isEven ? (
              // Row chẵn:
              // 2 SMALL bên phải
              <Box className="flex w-1/2 min-w-0 flex-col gap-10 pt-8">
                <AnimatedWrapper
                  direction="right"
                  delay={rowIndex * 150 + 200}
                >
                  <SmallCoffeeCard
                    item={{
                      ...row.smallTop,
                      type: "small",
                    }}
                  />
                </AnimatedWrapper>

                <AnimatedWrapper
                  direction="right"
                  delay={rowIndex * 150 + 400}
                >
                  <SmallCoffeeCard
                    item={{
                      ...row.smallBottom,
                      type: "small",
                    }}
                  />
                </AnimatedWrapper>
              </Box>
            ) : (
              // Row lẻ:
              // LARGE bên phải
              <Box className="w-1/2 min-w-0">
                <AnimatedWrapper
                  direction="right"
                  delay={rowIndex * 150}
                >
                  <LargeCoffeeCard
                    item={{
                      ...row.large,
                      type: "large",
                    }}
                  />
                </AnimatedWrapper>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

export default CoffeeProducts;