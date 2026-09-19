import { Router } from "express";
import { chat, transcribe } from "@/controllers/assistant.controller";

const router = Router();

router.post("/chat", chat);
router.post("/transcribe", transcribe);

export default router;
