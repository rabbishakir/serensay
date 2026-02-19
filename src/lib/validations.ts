import { z } from "zod"
import { OrderStatus, Source } from "@prisma/client"

export const BuyerSchema = z.object({
  name: z.string().min(1, "Name is required."),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export const OrderSchema = z.object({
  buyerId: z.string().min(1, "Buyer is required."),
  productName: z.string().min(1, "Product name is required."),
  brand: z.string().optional(),
  shade: z.string().optional(),
  qty: z.number().int().min(1).default(1),
  sellPriceBdt: z.number().min(0),
  buyPriceUsd: z.number().optional(),
  depositBdt: z.number().min(0).default(0),
  source: z.nativeEnum(Source),
  status: z.nativeEnum(OrderStatus).optional(),
  batchId: z.string().optional(),
  tags: z.array(z.string().min(1).max(30)).optional(),
  notes: z.string().optional(),
})
