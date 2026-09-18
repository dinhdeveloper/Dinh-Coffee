import { Router } from "express";
import { getPromotion, getPromotions } from "@/controllers/promotions.controller";

const router = Router();

router.get("/", getPromotions);
router.get("/:id", getPromotion);

export default router;
