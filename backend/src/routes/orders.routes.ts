import { Router } from "express";
import {
  checkout,
  createOrderMac,
  getOrderStatus,
} from "@/controllers/orders.controller";

const router = Router();

router.post("/", checkout);
router.get("/:id/status", getOrderStatus);
router.post("/mac", createOrderMac);

export default router;
