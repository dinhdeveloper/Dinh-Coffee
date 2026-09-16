import { Request, Response } from "express";
import { properties } from "@/data/properties.data";

export function listProperties(req: Request, res: Response) {
  res.json({ data: properties });
}

export function getProperty(req: Request, res: Response) {
  const property = properties.find((item) => item.id === req.params.id);

  if (!property) {
    res.status(404).json({ message: "Không tìm thấy cửa hàng" });
    return;
  }

  res.json({ data: property });
}
