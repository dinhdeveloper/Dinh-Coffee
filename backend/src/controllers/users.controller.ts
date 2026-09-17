import { Request, Response } from "express";
import {
  getUser as getUserFromStore,
  setPhone,
  upsertUser,
} from "@/data/users.store";
import { resolvePhoneNumber } from "@/lib/zalo-graph";

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

// Mobile gọi ngay sau khi zmp-sdk's getPhoneNumber() trả về "code" — backend
// đổi code đó thành số điện thoại thật qua graph.zalo.me rồi lưu lại.
export async function updatePhone(req: Request, res: Response) {
  const body = req.body as {
    userId?: string;
    accessToken?: string;
    code?: string;
  };

  if (!body.userId || !body.accessToken || !body.code) {
    res.status(400).json({ message: "Thiếu userId, accessToken hoặc code" });
    return;
  }

  try {
    const phone = await resolvePhoneNumber(body.accessToken, body.code);
    const user = await setPhone(body.userId, phone);
    res.json({ data: user });
  } catch (err) {
    res.status(502).json({
      message: err instanceof Error ? err.message : "Không lấy được số điện thoại",
    });
  }
}
