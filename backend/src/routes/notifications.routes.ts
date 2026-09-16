import { Router } from "express";
import {
  deleteNotification,
  listNotifications,
  markAllAsRead,
  markAsRead,
} from "@/controllers/notifications.controller";

const router = Router();

router.get("/", listNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

export default router;
