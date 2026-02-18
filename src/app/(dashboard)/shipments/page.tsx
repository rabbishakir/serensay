import { headers } from "next/headers"

import ShipmentsListClient from "@/components/shared/ShipmentsListClient"

type ShipmentListItem = {
  id: string
  name: string
  status: "PACKING" | "IN_TRANSIT" | "ARRIVED"
  departureDate: string | null
  _count: { orders: number }
}

async function getShipments() {
  const h = headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "http"
  if (!host) throw new Error("Missing request host header.")

  const res = await fetch(`${proto}://${host}/api/shipments`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error("Failed to fetch shipments.")
  return (await res.json()) as ShipmentListItem[]
}

export default async function ShipmentsPage() {
  const shipments = await getShipments()
  return <ShipmentsListClient initialShipments={shipments} />
}
