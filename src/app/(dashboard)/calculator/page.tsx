"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ShippingTier = {
  min: number
  max: number
  cost: number
}

function parseNumber(value: string) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function roundToNearestTen(value: number) {
  return Math.round(value / 10) * 10
}

function formatBdt(value: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value)
}

export default function CalculatorPage() {
  const [buyPriceUsd, setBuyPriceUsd] = useState("")
  const [weightG, setWeightG] = useState("")
  const [exchangeRate, setExchangeRate] = useState("")
  const [marginPct, setMarginPct] = useState("")
  const [shippingOverride, setShippingOverride] = useState("")
  const [tiers, setTiers] = useState<ShippingTier[]>([])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" })
        if (!res.ok || cancelled) return
        const settings = (await res.json()) as Record<string, string>
        if (cancelled) return

        setExchangeRate(settings.exchange_rate ?? "110")
        setMarginPct(settings.default_margin ?? "25")

        const rawTiers = settings.shipping_tiers
        if (rawTiers) {
          try {
            const parsed = JSON.parse(rawTiers) as ShippingTier[]
            if (Array.isArray(parsed)) setTiers(parsed)
          } catch {
            setTiers([])
          }
        }
      } catch {
        setExchangeRate("110")
        setMarginPct("25")
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const computed = useMemo(() => {
    const usd = parseNumber(buyPriceUsd)
    const weight = parseNumber(weightG)
    const rate = parseNumber(exchangeRate)
    const margin = parseNumber(marginPct)
    const override = shippingOverride.trim() === "" ? null : parseNumber(shippingOverride)

    const buyPriceBdt = usd * rate

    const tierShipping = tiers.find((tier) => weight >= tier.min && weight <= tier.max)?.cost ?? 0
    const shippingCostBdt = override ?? tierShipping

    const subtotal = buyPriceBdt + shippingCostBdt
    const suggestedSellPriceRaw = subtotal * (1 + margin / 100)
    const suggestedSellPrice = roundToNearestTen(suggestedSellPriceRaw)
    const profit = suggestedSellPrice - subtotal
    const marginAchievedPct = suggestedSellPrice > 0 ? (profit / suggestedSellPrice) * 100 : 0

    return {
      buyPriceBdt,
      shippingCostBdt,
      subtotal,
      suggestedSellPrice,
      profit,
      marginAchievedPct,
    }
  }, [buyPriceUsd, exchangeRate, marginPct, shippingOverride, tiers, weightG])

  const copyPrice = async () => {
    try {
      await navigator.clipboard.writeText(String(computed.suggestedSellPrice))
      toast.success("Price copied")
    } catch {
      toast.error("Failed to copy price")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1E1215]">Price Calculator</h1>
        <p className="text-sm text-[#8B6F74]">Reference tool only. No values are saved.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Buy Price (USD)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={buyPriceUsd}
            onChange={(e) => setBuyPriceUsd(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Weight (grams)</Label>
          <Input
            type="number"
            min={0}
            value={weightG}
            onChange={(e) => setWeightG(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Exchange Rate (USD→BDT)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Profit Margin %</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={marginPct}
            onChange={(e) => setMarginPct(e.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Additional shipping override (BDT)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={shippingOverride}
            onChange={(e) => setShippingOverride(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calculated Result</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <p className="text-sm text-[#8B6F74]">
              Buy Price in BDT: <span className="text-lg font-semibold text-[#1E1215]">{formatBdt(computed.buyPriceBdt)}</span>
            </p>
            <p className="text-sm text-[#8B6F74]">
              Shipping Cost (BDT):{" "}
              <span className="text-lg font-semibold text-[#1E1215]">{formatBdt(computed.shippingCostBdt)}</span>
            </p>
            <p className="text-sm text-[#8B6F74]">
              Subtotal: <span className="text-lg font-semibold text-[#1E1215]">{formatBdt(computed.subtotal)}</span>
            </p>
            <p className="text-sm text-[#8B6F74]">
              Profit: <span className="text-lg font-semibold text-[#1E1215]">{formatBdt(computed.profit)}</span>
            </p>
            <p className="text-sm text-[#8B6F74] md:col-span-2">
              Suggested Sell Price:{" "}
              <span className="text-3xl font-bold text-[hsl(var(--brand))]">
                {formatBdt(computed.suggestedSellPrice)}
              </span>
            </p>
            <p className="text-sm text-[#8B6F74]">
              Margin Achieved %:{" "}
              <span className="text-lg font-semibold text-[#1E1215]">
                {computed.marginAchievedPct.toFixed(2)}%
              </span>
            </p>
          </div>
          <Button onClick={() => void copyPrice()}>Copy Price</Button>
        </CardContent>
      </Card>
    </div>
  )
}
