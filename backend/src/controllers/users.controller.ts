import { Request, Response } from "express";
import { users } from "@/data/users.store";
import { User } from "@/types/user";

export function syncUser(req: Request, res: Response) {
  const body = req.body as { id?: string; name?: string; avatar?: string };

  if (!body.id || !body.name) {
    res.status(400).json({ message: "Thiếu thông tin người dùng" });
    return;
  }

  const now = Date.now();
  const existing = users.get(body.id);

  const user: User = {
    id: body.id,
    name: body.name,
    avatar: body.avatar ?? "",
    firstLoginAt: existing?.firstLoginAt ?? now,
    lastLoginAt: now,
  };

  users.set(user.id, user);

  res.json({ data: user });
}

export function getUser(req: Request, res: Response) {
  const user = users.get(req.params.id);

  if (!user) {
    res.status(404).json({ message: "Không tìm thấy người dùng" });
    return;
  }

  res.json({ data: user });
}
