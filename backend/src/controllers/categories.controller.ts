import { Request, Response } from "express";
import { prisma } from "@/lib/prisma";

export async function listCategories(_req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
  });

  res.json({
    data: categories.map((category) => ({
      id: category.id,
      slug: category.slug ?? category.id,
      name: category.name,
      nameEn: category.nameEn,
      imageUrl: category.imageUrl,
      sortOrder: category.sortOrder,
    })),
  });
}
