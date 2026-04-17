import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { products } from "../data/products.js";
import { HttpError } from "../middleware/errorHandler.js";

const lineItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(20),
});

const createOrderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(8).max(32),
    addressLine1: z.string().trim().min(4).max(160),
    addressLine2: z.string().trim().max(160).optional(),
    city: z.string().trim().min(2).max(80),
    postalCode: z.string().trim().min(3).max(20),
    notes: z.string().trim().max(500).optional(),
  }),
  items: z.array(lineItemSchema).min(1).max(30),
});

export interface OrderRecord {
  id: string;
  createdAt: string;
  customer: z.infer<typeof createOrderSchema>["customer"];
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

const orders = new Map<string, OrderRecord>();

export const ordersRouter = Router();

ordersRouter.post("/", (req, res, next) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    next(parsed.error);
    return;
  }

  const { customer, items } = parsed.data;
  const resolved: OrderRecord["items"] = [];
  let subtotalCents = 0;

  for (const line of items) {
    const product = products.find((p) => p.id === line.productId);
    if (!product) {
      next(new HttpError(400, `Unknown product: ${line.productId}`));
      return;
    }
    const lineTotalCents = product.priceCents * line.quantity;
    subtotalCents += lineTotalCents;
    resolved.push({
      productId: product.id,
      name: product.name,
      quantity: line.quantity,
      unitPriceCents: product.priceCents,
      lineTotalCents,
    });
  }

  const taxCents = Math.round(subtotalCents * 0.0825);
  const totalCents = subtotalCents + taxCents;
  const id = `ord_${randomUUID().slice(0, 8)}`;
  const createdAt = new Date().toISOString();

  const order: OrderRecord = {
    id,
    createdAt,
    customer,
    items: resolved,
    subtotalCents,
    taxCents,
    totalCents,
  };

  orders.set(id, order);
  res.status(201).json({ data: { id, createdAt, totalCents } });
});

ordersRouter.get("/:id", (req, res, next) => {
  const order = orders.get(req.params.id);
  if (!order) {
    next(new HttpError(404, "Order not found"));
    return;
  }
  res.json({ data: order });
});
