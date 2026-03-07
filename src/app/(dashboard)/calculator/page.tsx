"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function parseNumber(value: string) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function formatTaka(value: number) {
  if (value === 0) return "৳0"
  return `৳${new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`
}

function formatUsd(value: number) {
  return `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`
}

function InputWithAdornment({
  value,
  onChange,
  type = "number",
  min = 0,
  step = "0.01",
  leftAdornment,
  rightAdornment,
  required = false,
}: {
  value: string
  onChange: (value: string) => void
  type?: string
  min?: number
  step?: string
  leftAdornment?: string
  rightAdornment?: string
  required?: boolean
}) {
  return (
    <div className="relative">
      {leftAdornment ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#A08488]">
          {leftAdornment}
        </span>
      ) : null}
      <Input
        type={type}
        min={min}
        step={step}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={`${leftAdornment ? "pl-8" : ""} ${rightAdornment ? "pr-9" : ""}`}
      />
      {rightAdornment ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#A08488]">
          {rightAdornment}
        </span>
      ) : null}
    </div>
  )
}

export default function CalculatorPage() {
  const [buyPriceUsd, setBuyPriceUsd] = useState("")
  const [weightG, setWeightG] = useState("")
  const [exchangeRate, setExchangeRate] = useState("125")
  const [marginPct, setMarginPct] = useState("25")
  const [bdShippingRate, setBdShippingRate] = useState("2.90")
  const [salesTaxPct, setSalesTaxPct] = useState("8")
  const [usShippingUsd, setUsShippingUsd] = useState("0")
  const [bdLocalDelivery, setBdLocalDelivery] = useState("0")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" })
        if (!res.ok || cancelled) throw new Error("Failed to fetch settings")
        const settings = (await res.json()) as Record<string, string>
        if (cancelled) return
        setExchangeRate(settings.exchange_rate ?? "125")
        setMarginPct(settings.default_margin ?? "25")
        setBdShippingRate(settings.bd_shipping_rate ?? "2.90")
      } catch {
        setExchangeRate("125")
        setMarginPct("25")
        setBdShippingRate("2.90")
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const computed = useMemo(() => {
    const usd = parseNumber(buyPriceUsd)
    const weight = weightG.trim() === "" ? null : parseNumber(weightG)
    const rate = parseNumber(exchangeRate)
    const margin = parseNumber(marginPct)
    const shippingRate = parseNumber(bdShippingRate)
    const salesTax = parseNumber(salesTaxPct)
    const usShipping = parseNumber(usShippingUsd)
    const bdLocal = parseNumber(bdLocalDelivery)
    const hasBuyPrice = buyPriceUsd.trim() !== "" && usd > 0

    const buyPriceBdt = usd * rate
    const salesTaxAmount = buyPriceBdt * (salesTax / 100)
    const afterSalesTax = buyPriceBdt + salesTaxAmount
    const usShippingBdt = usShipping * rate
    const costBeforeProfit = afterSalesTax + usShippingBdt
    const productPrice = costBeforeProfit * (1 + margin / 100)
    const bdShipping = weight === null ? 0 : weight * shippingRate
    const finalPrice = productPrice + bdShipping + bdLocal
    const totalCost = costBeforeProfit + bdShipping + bdLocal
    const profitAmount = finalPrice - totalCost
    const marginAchievedPct = costBeforeProfit > 0 ? (profitAmount / costBeforeProfit) * 100 : 0

    return {
      hasBuyPrice,
      usd,
      weight,
      rate,
      margin,
      salesTax,
      usShipping,
      bdLocal,
      buyPriceBdt: hasBuyPrice ? buyPriceBdt : 0,
      salesTaxAmount: hasBuyPrice ? salesTaxAmount : 0,
      afterSalesTax: hasBuyPrice ? afterSalesTax : 0,
      usShippingBdt: hasBuyPrice ? usShippingBdt : 0,
      costBeforeProfit: hasBuyPrice ? costBeforeProfit : 0,
      productPrice: hasBuyPrice ? productPrice : 0,
      bdShipping: hasBuyPrice ? bdShipping : 0,
      finalPrice: hasBuyPrice ? finalPrice : 0,
      profitAmount: hasBuyPrice ? profitAmount : 0,
      marginAchievedPct: hasBuyPrice ? marginAchievedPct : 0,
      taxMultiplier: 1 + salesTax / 100,
      profitMultiplier: 1 + margin / 100,
      shippingRate,
    }
  }, [bdLocalDelivery, bdShippingRate, buyPriceUsd, exchangeRate, marginPct, salesTaxPct, usShippingUsd, weightG])

  const metrics = useMemo(
    () => [
      { label: "Buy Price BDT", value: formatTaka(computed.buyPriceBdt) },
      { label: "Sales Tax", value: formatTaka(computed.salesTaxAmount) },
      { label: "US shipping", value: formatTaka(computed.usShippingBdt) },
      { label: "Product Price", value: formatTaka(computed.productPrice) },
      { label: "Profit", value: formatTaka(computed.profitAmount) },
    ],
    [computed]
  )

  const copyPrice = async () => {
    if (!computed.hasBuyPrice) return
    try {
      await navigator.clipboard.writeText(computed.finalPrice.toFixed(2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy final price")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1E1215]">Price Calculator</h1>
        <p className="text-sm text-[#8B6F74]">Reference tool only. No values are saved.</p>
      </div>

      <div className="sticky top-0 z-10 w-full rounded-xl bg-[#1E1215] px-6 py-4">
        <div className="flex flex-wrap items-center">
          {metrics.map((metric, index) => (
            <div key={metric.label} className="flex items-center py-1">
              {index > 0 ? <span className="mx-4 text-[#3D2E28]">|</span> : null}
              <div>
                <p className="text-xs uppercase tracking-wider text-[#A08488]">{metric.label}</p>
                <p className="text-sm font-bold text-white">{metric.value}</p>
              </div>
            </div>
          ))}
          <span className="mx-4 text-[#3D2E28]">|</span>
          <div className="py-1">
            <p className="text-xs text-[#C4878E]">✦ Sell Price</p>
            <p className="text-lg font-bold text-[#C4878E]">{formatTaka(computed.finalPrice)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#EDE0E2] bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Buy Price (USD)</Label>
            <InputWithAdornment
              value={buyPriceUsd}
              onChange={setBuyPriceUsd}
              leftAdornment="$"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Weight (grams)</Label>
            <InputWithAdornment value={weightG} onChange={setWeightG} rightAdornment="g" step="1" />
          </div>
          <div className="space-y-2">
            <Label>Exchange Rate (USD→BDT)</Label>
            <InputWithAdornment value={exchangeRate} onChange={setExchangeRate} />
            <p className="text-xs text-[#A08488]">Last saved in Settings</p>
          </div>
          <div className="space-y-2">
            <Label>Profit Margin %</Label>
            <InputWithAdornment value={marginPct} onChange={setMarginPct} rightAdornment="%" />
          </div>
          <div className="space-y-2">
            <Label>Sales Tax %</Label>
            <InputWithAdornment value={salesTaxPct} onChange={setSalesTaxPct} rightAdornment="%" />
            <p className="text-xs text-[#A08488]">US sales tax charged at point of purchase</p>
          </div>
          <div className="space-y-2">
            <Label>US Shipping (USD)</Label>
            <InputWithAdornment value={usShippingUsd} onChange={setUsShippingUsd} leftAdornment="$" />
          </div>
          <div className="space-y-2">
            <Label>BD Local Delivery (BDT)</Label>
            <InputWithAdornment
              value={bdLocalDelivery}
              onChange={setBdLocalDelivery}
              leftAdornment="৳"
            />
          </div>
          <div className="rounded-lg border border-[#EDE0E2] bg-[#F7F3F4] p-3">
            <p className="text-sm font-semibold text-[#1E1215]">BD Shipping Rate</p>
            <p className="text-sm text-[#A08488]">{`৳${computed.shippingRate.toFixed(2)} per gram`}</p>
            <p className="text-sm text-[#A08488]">Fixed international rate</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#EDE0E2] bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-[#1E1215]">Calculation Breakdown</h2>
        <div className="grid grid-cols-2 gap-y-3">
          <p className="text-sm text-[#6E5558]">
            Buy Price (USD → BDT): {formatUsd(computed.usd)} × {formatTaka(computed.rate)}
          </p>
          <p className="text-right font-medium text-[#1E1215]">{formatTaka(computed.buyPriceBdt)}</p>

          <p className="text-sm text-[#6E5558]">
            After Sales Tax ({computed.salesTax.toFixed(2)}%): {formatTaka(computed.buyPriceBdt)} ×{" "}
            {computed.taxMultiplier.toFixed(2)}
          </p>
          <p className="text-right font-medium text-[#1E1215]">{formatTaka(computed.afterSalesTax)}</p>

          <p className="text-sm text-[#6E5558]">
            After US Shipping: + {formatUsd(computed.usShipping)} × {formatTaka(computed.rate)}
          </p>
          <p className="text-right font-medium text-[#1E1215]">{formatTaka(computed.costBeforeProfit)}</p>

          <p className="text-sm text-[#6E5558]">
            Product Price (after {computed.margin.toFixed(2)}% margin):{" "}
            {formatTaka(computed.costBeforeProfit)} × {computed.profitMultiplier.toFixed(2)}
          </p>
          <p className="text-right font-medium text-[#1E1215]">{formatTaka(computed.productPrice)}</p>
        </div>

        <div className="my-4 border-t border-[#EDE0E2]" />

        <div className="grid grid-cols-2 gap-y-3">
          <p className="text-sm text-[#6E5558]">
            BD Shipping ({computed.weight === null ? "Enter weight" : `${computed.weight}g`} × ৳
            {computed.shippingRate.toFixed(2)}):
          </p>
          <p className="text-right font-medium text-[#1E1215]">
            {computed.weight === null ? (
              <span className="text-[#A08488]">Enter weight</span>
            ) : (
              formatTaka(computed.bdShipping)
            )}
          </p>

          <p className="text-sm text-[#6E5558]">BD Local Delivery:</p>
          <p className="text-right font-medium text-[#1E1215]">{formatTaka(computed.bdLocal)}</p>
        </div>

        <div className="my-4 border-t border-[#EDE0E2]" />

        <div className="grid grid-cols-2 gap-y-3">
          <p className="text-sm text-[#6E5558]">Final Customer Price:</p>
          <p className="text-right text-xl font-bold text-[#C4878E]">{formatTaka(computed.finalPrice)}</p>

          <p className="text-sm text-[#6E5558]">Profit Amount:</p>
          <p className="text-right font-medium text-[#1E1215]">{formatTaka(computed.profitAmount)}</p>

          <p className="text-sm text-[#6E5558]">Margin Achieved:</p>
          <p className="text-right font-medium text-[#1E1215]">{computed.marginAchievedPct.toFixed(2)}%</p>
        </div>
      </div>

      <Button
        onClick={() => void copyPrice()}
        disabled={!computed.hasBuyPrice}
        className="w-full rounded-xl bg-[#C4878E] py-3 font-semibold text-white hover:bg-[#A86870]"
      >
        {copied ? "✓ Copied!" : `Copy Final Price — ${formatTaka(computed.finalPrice)}`}
      </Button>
    </div>
  )
}
