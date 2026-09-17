import { Request, Response } from "express";
import { listActiveStoreStories } from "@/data/store-stories.store";

export async function listStoreStories(req: Request, res: Response) {
  res.json({ data: await listActiveStoreStories() });
}
