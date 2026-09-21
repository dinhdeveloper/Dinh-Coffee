import cors from "cors";
import express from "express";
import { env } from "@/config/env";
import { errorHandler, notFoundHandler } from "@/middlewares/error-handler";
import addressesRoutes from "@/routes/addresses.routes";
import cafeStoryRoutes from "@/routes/cafe-story.routes";
import categoriesRoutes from "@/routes/categories.routes";
import notificationsRoutes from "@/routes/notifications.routes";
import ordersRoutes from "@/routes/orders.routes";
import paymentsRoutes from "@/routes/payments.routes";
import productsRoutes from "@/routes/products.routes";
import promotionsRoutes from "@/routes/promotions.routes";
import storeStoriesRoutes from "@/routes/store-stories.routes";
import assistantRoutes from "@/routes/assistant.routes";
import featureCardsRoutes from "@/routes/feature-cards.routes";
import usersRoutes from "@/routes/users.routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  // 3mb: đủ cho đoạn ghi âm ngắn gửi lên /assistant/transcribe (base64).
  app.use(express.json({ limit: "3mb" }));

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/products", productsRoutes);
  app.use("/api/categories", categoriesRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/stories", storeStoriesRoutes);
  app.use("/api/assistant", assistantRoutes);
  app.use("/api/feature-cards", featureCardsRoutes);
  app.use("/api/cafe-story", cafeStoryRoutes);
  app.use("/api/promotions", promotionsRoutes);
  app.use("/api/addresses", addressesRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/payments", paymentsRoutes);
  app.use("/api/users", usersRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
