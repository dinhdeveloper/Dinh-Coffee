import { Router } from "express";
import { checkout, getOrderStatus } from "@/controllers/orders.controller";

const router = Router();

router.post("/", checkout);
router.get("/:id/status", getOrderStatus);

export default router;
