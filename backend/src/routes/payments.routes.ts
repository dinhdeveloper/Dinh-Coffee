import { Router } from "express";
import {
  momoIpn,
  zaloPayCallback,
  zmpCheckoutCallback,
} from "@/controllers/payments.controller";

const router = Router();

router.post("/zalopay/callback", zaloPayCallback);
router.post("/momo/ipn", momoIpn);
router.post("/zmp/callback", zmpCheckoutCallback);

export default router;
