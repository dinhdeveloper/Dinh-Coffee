import { Router } from "express";
import { zaloPayCallback } from "@/controllers/payments.controller";

const router = Router();

router.post("/zalopay/callback", zaloPayCallback);

export default router;
