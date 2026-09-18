import { Router } from "express";
import {
  cancelOrder,
  checkout,
  checkoutInStore,
  createOrderMac,
  getOrderStatus,
  linkCheckoutOrder,
} from "@/controllers/orders.controller";

const router = Router();

router.post("/", checkout);
router.post("/instore", checkoutInStore);
router.get("/:id/status", getOrderStatus);
router.post("/:id/cancel", cancelOrder);
router.post("/mac", createOrderMac);
router.post("/:id/link", linkCheckoutOrder);

export default router;
