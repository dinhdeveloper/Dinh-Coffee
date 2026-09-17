import { Router } from "express";
import { getUser, syncUser, updatePhone } from "@/controllers/users.controller";

const router = Router();

router.post("/sync", syncUser);
router.post("/phone", updatePhone);
router.get("/:id", getUser);

export default router;
