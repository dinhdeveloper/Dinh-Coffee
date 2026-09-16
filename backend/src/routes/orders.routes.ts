import { Router } from "express";
import {
  checkout,
  createOrderMac,
  getOrderStatus,
  linkCheckoutOrder,
} from "@/controllers/orders.controller";

const router = Router();

router.post("/", checkout);
router.get("/:id/status", getOrderStatus);
router.post("/mac", createOrderMac);
router.post("/:id/link", linkCheckoutOrder);

export default router;
