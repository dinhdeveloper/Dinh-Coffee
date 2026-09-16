import { Router } from "express";
import { getUser, syncUser } from "@/controllers/users.controller";

const router = Router();

router.post("/sync", syncUser);
router.get("/:id", getUser);

export default router;
