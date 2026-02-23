import { NextRequest, NextResponse } from "next/server"

type UpcStore = {
  store_name?: string
  price?: number | string | null
}

type UpcItem = {
  title?: string
  brand?: string
  color?: string
  description?: string
  weight?: string
  dimension?: string
  images?: string[]
  stores?: UpcStore[]
}

type UpcResponse = {
  code?: string
  items?: UpcItem[]
}

function parseWeightToGrams(weightStr: string): number | null {
  if (!weightStr) return null
  const match = weightStr.match(/([\d.]+)\s*(oz|ounce|g|gram|lb|pound)/i)
  if (!match) return null
  const val = parseFloat(match[1])
  const unit = match[2].toLowerCase()
  if (unit.startsWith("g")) return Math.round(val)
  if (unit.startsWith("oz") || unit.startsWith("ounce")) return Math.round(val * 28.3495)
  if (unit.startsWith("lb") || unit.startsWith("pound")) return Math.round(val * 453.592)
  return null
}

function toNumberPrice(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function lowestStorePrice(stores: UpcStore[]): number | null {
  if (!stores || stores.length === 0) return null
  const prices = stores
    .map((store) => toNumberPrice(store.price))
    .filter((price): price is number => price != null && price > 0)
  return prices.length ? Math.min(...prices) : null
}

export async function GET(req: NextRequest) {
  const upc = req.nextUrl.searchParams.get("upc")?.trim()
  if (!upc) {
    return NextResponse.json({ error: "UPC required" }, { status: 400 })
  }

  try {
    const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(upc)}`
    let response: Response
    try {
      response = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      })
    } catch {
      return NextResponse.json({ error: "UPC lookup failed" }, { status: 502 })
    }

    if (!response.ok) {
      return NextResponse.json({ error: "UPC lookup failed" }, { status: 502 })
    }

    const data = (await response.json()) as UpcResponse
    if (data.code !== "OK" || !Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const item = data.items[0]
    const stores = Array.isArray(item.stores) ? item.stores : []

    return NextResponse.json({
      found: true,
      product: {
        name: item.title || "",
        brand: item.brand || "",
        shade: item.color || "",
        description: item.description || "",
        weightG: parseWeightToGrams(item.weight || ""),
        dimension: item.dimension || "",
        images: (Array.isArray(item.images) ? item.images : []).slice(0, 3),
        lowestPrice: lowestStorePrice(stores),
        stores: stores.slice(0, 3).map((store) => ({
          name: store.store_name || "",
          price: toNumberPrice(store.price),
        })),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
