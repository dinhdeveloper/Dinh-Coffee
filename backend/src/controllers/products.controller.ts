import { Request, Response } from "express";
import { products } from "@/data/products.data";

export function listProducts(req: Request, res: Response) {
  const { category, q } = req.query;

  let result = products;

  if (typeof category === "string" && category.trim()) {
    result = result.filter((product) => product.category === category);
  }

  if (typeof q === "string" && q.trim()) {
    const keyword = q.trim().toLowerCase();
    result = result.filter((product) =>
      product.title.toLowerCase().includes(keyword),
    );
  }

  res.json({ data: result });
}

export function getProduct(req: Request, res: Response) {
  const product = products.find((item) => item.id === req.params.id);

  if (!product) {
    res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    return;
  }

  res.json({ data: product });
}
