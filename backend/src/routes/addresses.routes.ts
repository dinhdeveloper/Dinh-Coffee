import { Router } from "express";
import {
  createAddressForUser,
  deleteAddressForUser,
  listAddressesForUser,
  setDefaultAddressForUser,
  updateAddressForUser,
} from "@/controllers/addresses.controller";

const router = Router();

router.get("/", listAddressesForUser);
router.post("/", createAddressForUser);
router.patch("/:id", updateAddressForUser);
router.patch("/:id/default", setDefaultAddressForUser);
router.delete("/:id", deleteAddressForUser);

export default router;
