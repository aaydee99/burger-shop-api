import { Router } from "express";
import { z } from "zod";
import { products } from "../data/products.js";
import { HttpError } from "../middleware/errorHandler.js";

const querySchema = z.object({
  category: z.enum(["burger", "sandwich", "side", "drink"]).optional(),
  tag: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
});

export const productsRouter = Router();

productsRouter.get("/", (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
    return;
  }

  const { category, tag, q } = parsed.data;
  let list = [...products];

  if (category) {
    list = list.filter((p) => p.category === category);
  }
  if (tag) {
    list = list.filter((p) => p.tags.includes(tag));
  }
  if (q) {
    const needle = q.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle),
    );
  }

  res.json({ data: list });
});

productsRouter.get("/:slug", (req, res, next) => {
  const product = products.find((p) => p.slug === req.params.slug);
  if (!product) {
    next(new HttpError(404, "Product not found"));
    return;
  }
  res.json({ data: product });
});
