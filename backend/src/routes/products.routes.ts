import { Router } from "express";
import { getProduct, listProducts } from "@/controllers/products.controller";
import {
  getProductReviews,
  postProductReview,
} from "@/controllers/reviews.controller";

const router = Router();

router.get("/", listProducts);
router.get("/:id", getProduct);
router.get("/:id/reviews", getProductReviews);
router.post("/:id/reviews", postProductReview);

export default router;
