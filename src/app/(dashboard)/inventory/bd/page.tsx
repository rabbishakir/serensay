import { headers } from "next/headers"

import InventoryTableManager from "@/components/shared/InventoryTableManager"
import type { BdInventoryItem } from "@/components/shared/InventoryDrawer"

async function getBdInventory() {
  const h = headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "http"
  const cookie = h.get("cookie")
  if (!host) throw new Error("Missing request host header.")

  const res = await fetch(`${proto}://${host}/api/inventory/bd`, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined,
  })
  if (!res.ok) throw new Error("Failed to fetch BD inventory.")
  return (await res.json()) as BdInventoryItem[]
}

export default async function BdInventoryPage() {
  const items = await getBdInventory()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-[#1E1215]">BD Inventory</h1>
      <InventoryTableManager type="bd" initialItems={items} />
    </div>
  )
}
