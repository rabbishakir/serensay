import { headers } from "next/headers"

import InventoryTableManager from "@/components/shared/InventoryTableManager"
import type { UsaInventoryItem } from "@/components/shared/InventoryDrawer"

async function getUsaInventory() {
  const h = headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "http"
  if (!host) throw new Error("Missing request host header.")

  const res = await fetch(`${proto}://${host}/api/inventory/usa`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error("Failed to fetch USA inventory.")
  return (await res.json()) as UsaInventoryItem[]
}

export default async function UsaInventoryPage() {
  const items = await getUsaInventory()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">USA Inventory</h1>
      <InventoryTableManager type="usa" initialItems={items} />
    </div>
  )
}
