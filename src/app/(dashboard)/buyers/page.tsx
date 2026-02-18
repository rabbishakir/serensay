import { headers } from "next/headers"

import BuyerDrawer, { type BuyerData } from "@/components/shared/BuyerDrawer"
import BuyersTable from "@/components/shared/BuyersTable"
import { Button } from "@/components/ui/button"

async function getBuyers() {
  const h = headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "http"

  if (!host) {
    throw new Error("Missing host header.")
  }

  const res = await fetch(`${proto}://${host}/api/buyers`, {
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to fetch buyers.")
  }

  return (await res.json()) as BuyerData[]
}

export default async function BuyersPage() {
  const buyers = await getBuyers()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-[#1E1215]">Buyers</h1>
        <BuyerDrawer
          mode="add"
          trigger={
            <Button type="button" className="whitespace-nowrap">
              + Add Buyer
            </Button>
          }
        />
      </div>

      <BuyersTable buyers={buyers} />
    </div>
  )
}
