import cors from "cors";
import express from "express";
import { env } from "@/config/env";
import { errorHandler, notFoundHandler } from "@/middlewares/error-handler";
import notificationsRoutes from "@/routes/notifications.routes";
import ordersRoutes from "@/routes/orders.routes";
import paymentsRoutes from "@/routes/payments.routes";
import productsRoutes from "@/routes/products.routes";
import propertiesRoutes from "@/routes/properties.routes";
import usersRoutes from "@/routes/users.routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/products", productsRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/properties", propertiesRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/payments", paymentsRoutes);
  app.use("/api/users", usersRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
