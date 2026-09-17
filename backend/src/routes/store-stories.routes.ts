import { Router } from "express";
import { listStoreStories } from "@/controllers/store-stories.controller";

const router = Router();

router.get("/", listStoreStories);

export default router;
