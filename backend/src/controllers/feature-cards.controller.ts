import { Request, Response } from "express";
import { listFeatureCards as listCards } from "@/data/feature-cards.store";

export async function listFeatureCards(req: Request, res: Response) {
  res.json({ data: await listCards() });
}
