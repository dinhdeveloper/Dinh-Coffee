import { Router } from "express";
import { listFeatureCards } from "@/controllers/feature-cards.controller";

const router = Router();

router.get("/", listFeatureCards);

export default router;
