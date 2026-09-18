import { Request, Response } from "express";
import { getPromotionById, listActivePromotions } from "@/data/promotions.store";

export async function getPromotions(req: Request, res: Response) {
  const promotions = await listActivePromotions();
  res.json({ data: promotions });
}

export async function getPromotion(req: Request, res: Response) {
  const promotion = await getPromotionById(req.params.id);

  if (!promotion) {
    res.status(404).json({ message: "Không tìm thấy khuyến mãi" });
    return;
  }

  res.json({ data: promotion });
}
