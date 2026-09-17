import { Request, Response } from "express";
import {
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from "@/data/addresses.store";

function getUserId(req: Request): string | undefined {
  const value = req.query.userId ?? (req.body as { userId?: string })?.userId;
  return typeof value === "string" && value.trim() ? value : undefined;
}

export async function listAddressesForUser(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) {
    res.status(400).json({ message: "Thiếu userId" });
    return;
  }

  res.json({ data: await listAddresses(userId) });
}

export async function createAddressForUser(req: Request, res: Response) {
  const userId = getUserId(req);
  const body = req.body as {
    receiver?: string;
    phone?: string;
    detail?: string;
    note?: string;
  };

  if (!userId) {
    res.status(400).json({ message: "Thiếu userId" });
    return;
  }

  if (!body.receiver?.trim() || !body.phone?.trim() || !body.detail?.trim()) {
    res.status(400).json({ message: "Vui lòng nhập đầy đủ tên, số điện thoại và địa chỉ" });
    return;
  }

  const address = await createAddress({
    userId,
    receiver: body.receiver.trim(),
    phone: body.phone.trim(),
    detail: body.detail.trim(),
    note: body.note?.trim() || undefined,
  });

  res.json({ data: address });
}

export async function updateAddressForUser(req: Request, res: Response) {
  const userId = getUserId(req);
  const body = req.body as {
    receiver?: string;
    phone?: string;
    detail?: string;
    note?: string;
  };

  if (!userId) {
    res.status(400).json({ message: "Thiếu userId" });
    return;
  }

  if (!body.receiver?.trim() || !body.phone?.trim() || !body.detail?.trim()) {
    res.status(400).json({ message: "Vui lòng nhập đầy đủ tên, số điện thoại và địa chỉ" });
    return;
  }

  const address = await updateAddress(req.params.id, userId, {
    receiver: body.receiver.trim(),
    phone: body.phone.trim(),
    detail: body.detail.trim(),
    note: body.note?.trim() || undefined,
  });

  if (!address) {
    res.status(404).json({ message: "Không tìm thấy địa chỉ" });
    return;
  }

  res.json({ data: address });
}

export async function deleteAddressForUser(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) {
    res.status(400).json({ message: "Thiếu userId" });
    return;
  }

  const deleted = await deleteAddress(req.params.id, userId);

  if (!deleted) {
    res.status(404).json({ message: "Không tìm thấy địa chỉ" });
    return;
  }

  res.status(204).send();
}

export async function setDefaultAddressForUser(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) {
    res.status(400).json({ message: "Thiếu userId" });
    return;
  }

  const address = await setDefaultAddress(req.params.id, userId);

  if (!address) {
    res.status(404).json({ message: "Không tìm thấy địa chỉ" });
    return;
  }

  res.json({ data: address });
}
