import { Request, Response } from "express";
import { getUser as getUserFromStore, upsertUser } from "@/data/users.store";

export async function syncUser(req: Request, res: Response) {
  const body = req.body as { id?: string; name?: string; avatar?: string };

  if (!body.id || !body.name) {
    res.status(400).json({ message: "Thiếu thông tin người dùng" });
    return;
  }

  const user = await upsertUser({
    id: body.id,
    name: body.name,
    avatar: body.avatar ?? "",
  });

  res.json({ data: user });
}

export async function getUser(req: Request, res: Response) {
  const user = await getUserFromStore(req.params.id);

  if (!user) {
    res.status(404).json({ message: "Không tìm thấy người dùng" });
    return;
  }

  res.json({ data: user });
}
