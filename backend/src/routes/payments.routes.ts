import { Router } from "express";
import {
  zaloPayCallback,
  zmpCheckoutCallback,
} from "@/controllers/payments.controller";

const router = Router();

router.post("/zalopay/callback", zaloPayCallback);
router.post("/zmp/callback", zmpCheckoutCallback);

export default router;
