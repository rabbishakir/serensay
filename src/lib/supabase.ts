import { PrismaClient, Source } from "@prisma/client"

type PrismaTransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]

type InventoryOrderInput = {
  productName: string
  brand: string | null
  shade: string | null
  qty: number
  source: Source
}

type DeductResult = {
  deducted: boolean
  newQty: number | null
  warning: string | null
}

function buildInventoryWhere(order: InventoryOrderInput) {
  return {
    productName: { equals: order.productName, mode: "insensitive" as const },
    brand:
      order.brand == null
        ? null
        : { equals: order.brand, mode: "insensitive" as const },
    shade:
      order.shade == null
        ? null
        : { equals: order.shade, mode: "insensitive" as const },
  }
}

export async function deductFromInventory(
  tx: PrismaTransactionClient,
  order: InventoryOrderInput
): Promise<DeductResult> {
  if (order.source === Source.PRE_ORDER) {
    return { deducted: false, newQty: null, warning: null }
  }

  if (order.source === Source.BD_STOCK) {
    const item = await tx.bdInventory.findFirst({
      where: buildInventoryWhere(order),
    })
    if (!item) {
      return {
        deducted: false,
        newQty: null,
        warning: "Product not found in BD inventory",
      }
    }

    const rawNewQty = item.qty - order.qty
    const newQty = Math.max(0, rawNewQty)
    await tx.bdInventory.update({
      where: { id: item.id },
      data: { qty: newQty },
    })

    return {
      deducted: true,
      newQty,
      warning:
        rawNewQty < 0
          ? "Stock went below 0. BD inventory set to 0. Please recheck stock."
          : newQty <= 2
            ? `Low stock warning: only ${newQty} units remaining in BD inventory.`
            : null,
    }
  }

  const item = await tx.usaInventory.findFirst({
    where: buildInventoryWhere(order),
  })
  if (!item) {
    return {
      deducted: false,
      newQty: null,
      warning: "Product not found in USA inventory",
    }
  }

  const rawNewQty = item.qty - order.qty
  const newQty = Math.max(0, rawNewQty)
  await tx.usaInventory.update({
    where: { id: item.id },
    data: { qty: newQty },
  })

  return {
    deducted: true,
    newQty,
    warning:
      rawNewQty < 0
        ? "Stock went below 0. USA inventory set to 0. Please recheck stock."
        : newQty <= 2
          ? `Low stock warning: only ${newQty} units remaining in USA inventory.`
          : null,
  }
}

export async function restoreToInventory(
  tx: PrismaTransactionClient,
  order: InventoryOrderInput
): Promise<void> {
  if (order.source === Source.PRE_ORDER) return

  if (order.source === Source.BD_STOCK) {
    const item = await tx.bdInventory.findFirst({
      where: buildInventoryWhere(order),
    })
    if (!item) return
    await tx.bdInventory.update({
      where: { id: item.id },
      data: { qty: item.qty + order.qty },
    })
    return
  }

  const item = await tx.usaInventory.findFirst({
    where: buildInventoryWhere(order),
  })
  if (!item) return
  await tx.usaInventory.update({
    where: { id: item.id },
    data: { qty: item.qty + order.qty },
  })
}
