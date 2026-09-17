import { Request, Response } from "express";
import { getLatestCafeStory } from "@/data/cafe-story.store";

export async function getCafeStory(req: Request, res: Response) {
  const story = await getLatestCafeStory();

  if (!story) {
    res.status(404).json({ message: "Chưa có câu chuyện nào" });
    return;
  }

  res.json({ data: story });
}
