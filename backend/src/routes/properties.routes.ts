import { Router } from "express";
import { getProperty, listProperties } from "@/controllers/properties.controller";

const router = Router();

router.get("/", listProperties);
router.get("/:id", getProperty);

export default router;
