import { Router } from "express";
import { getCafeStory } from "@/controllers/cafe-story.controller";

const router = Router();

router.get("/", getCafeStory);

export default router;
