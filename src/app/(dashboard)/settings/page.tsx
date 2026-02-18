"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type SettingMeta = {
  key: string
  value: string
  updatedAt: string
}

type TierRow = {
  min: string
  max: string
  cost: string
  label: string
}

const DEFAULT_INVENTORY_TAGS = ["Stocked", "Order Arrived", "Hold", "Gift", "Damaged"]

function formatDate(value?: string) {
  if (!value) return "Not saved yet"
  return new Date(value).toLocaleString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [exchangeRate, setExchangeRate] = useState("110")
  const [defaultMargin, setDefaultMargin] = useState("25")
  const [tierRows, setTierRows] = useState<TierRow[]>([])
  const [inventoryTags, setInventoryTags] = useState<string[]>(DEFAULT_INVENTORY_TAGS)
  const [tagDraft, setTagDraft] = useState("")
  const [metaMap, setMetaMap] = useState<Record<string, SettingMeta>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const refreshSettings = useCallback(async () => {
    setLoading(true)
    try {
      const [settingsRes, metaRes, tagsRes] = await Promise.all([
        fetch("/api/settings", { cache: "no-store" }),
        fetch("/api/settings/meta", { cache: "no-store" }),
        fetch("/api/settings/tags", { cache: "no-store" }),
      ])

      if (settingsRes.ok) {
        const settings = (await settingsRes.json()) as Record<string, string>
        setExchangeRate(settings.exchange_rate ?? "110")
        setDefaultMargin(settings.default_margin ?? "25")

        const tiersRaw = settings.shipping_tiers
        if (tiersRaw) {
          try {
            const parsed = JSON.parse(tiersRaw) as Array<{
              min?: number
              max?: number
              cost?: number
              label?: string
            }>
            setTierRows(
              parsed.map((tier) => ({
                min: String(tier.min ?? ""),
                max: String(tier.max ?? ""),
                cost: String(tier.cost ?? ""),
                label: String(tier.label ?? ""),
              }))
            )
          } catch {
            setTierRows([])
          }
        } else {
          setTierRows([])
        }
      }

      if (metaRes.ok) {
        const meta = (await metaRes.json()) as SettingMeta[]
        const nextMap: Record<string, SettingMeta> = {}
        for (const row of meta) nextMap[row.key] = row
        setMetaMap(nextMap)
      }

      if (tagsRes.ok) {
        const tagsData = (await tagsRes.json()) as { tags?: string[] }
        const parsed = Array.isArray(tagsData?.tags) ? tagsData.tags : []
        setInventoryTags(parsed.length > 0 ? parsed : DEFAULT_INVENTORY_TAGS)
      } else {
        setInventoryTags(DEFAULT_INVENTORY_TAGS)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshSettings()
  }, [refreshSettings])

  const saveSetting = async (key: string, value: string, successMessage: string) => {
    setSavingKey(key)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to save setting.")
        return
      }
      toast.success(successMessage)
      await refreshSettings()
    } catch {
      toast.error("Failed to save setting.")
    } finally {
      setSavingKey(null)
    }
  }

  const addTag = () => {
    const next = tagDraft.trim()
    if (!next) return
    if (inventoryTags.includes(next)) {
      setTagDraft("")
      return
    }
    setInventoryTags((prev) => [...prev, next])
    setTagDraft("")
  }

  const saveTags = async () => {
    setSavingKey("inventory_tags")
    try {
      const res = await fetch("/api/settings/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: inventoryTags }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to save tags.")
        return
      }
      toast.success("Tags saved")
      await refreshSettings()
    } catch {
      toast.error("Failed to save tags.")
    } finally {
      setSavingKey(null)
    }
  }

  const serializedTiers = useMemo(() => {
    return JSON.stringify(
      tierRows.map((row) => ({
        min: Number(row.min || 0),
        max: Number(row.max || 0),
        cost: Number(row.cost || 0),
        label: row.label || undefined,
      }))
    )
  }, [tierRows])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-[#1E1215]">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Exchange Rate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
            disabled={loading}
          />
          <p className="text-sm text-[#8B6F74]">
            Last updated: {formatDate(metaMap.exchange_rate?.updatedAt)}
          </p>
          <Button
            onClick={() => void saveSetting("exchange_rate", exchangeRate, "Exchange rate saved")}
            disabled={savingKey === "exchange_rate"}
          >
            {savingKey === "exchange_rate" ? "Saving..." : "Save Rate"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default Profit Margin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={defaultMargin}
            onChange={(e) => setDefaultMargin(e.target.value)}
            disabled={loading}
          />
          <p className="text-sm text-[#8B6F74]">
            Last updated: {formatDate(metaMap.default_margin?.updatedAt)}
          </p>
          <Button
            onClick={() =>
              void saveSetting("default_margin", defaultMargin || "25", "Default margin saved")
            }
            disabled={savingKey === "default_margin"}
          >
            {savingKey === "default_margin" ? "Saving..." : "Save Margin"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipping Cost Tiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Min (g)</TableHead>
                  <TableHead>Max (g)</TableHead>
                  <TableHead>Cost (BDT)</TableHead>
                  <TableHead>Label</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tierRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-16 text-center text-[#8B6F74]">
                      No tiers yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  tierRows.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.min}
                          onChange={(e) =>
                            setTierRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, min: e.target.value } : r))
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.max}
                          onChange={(e) =>
                            setTierRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, max: e.target.value } : r))
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.cost}
                          onChange={(e) =>
                            setTierRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, cost: e.target.value } : r))
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.label}
                          onChange={(e) =>
                            setTierRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r))
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setTierRows((prev) => [...prev, { min: "", max: "", cost: "", label: "" }])
              }
            >
              Add Tier
            </Button>
            <Button
              onClick={() =>
                void saveSetting("shipping_tiers", serializedTiers, "Shipping tiers saved")
              }
              disabled={savingKey === "shipping_tiers"}
            >
              {savingKey === "shipping_tiers" ? "Saving..." : "Save Tiers"}
            </Button>
          </div>

          <p className="text-sm text-[#8B6F74]">
            Last updated: {formatDate(metaMap.shipping_tiers?.updatedAt)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {inventoryTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                <span>{tag}</span>
                <button
                  type="button"
                  className="text-xs opacity-80 hover:opacity-100"
                  onClick={() =>
                    setInventoryTags((prev) => prev.filter((value) => value !== tag))
                  }
                  aria-label={`Remove ${tag}`}
                >
                  x
                </button>
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={tagDraft}
              placeholder="Tag name"
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addTag()
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addTag}>
              Add Tag
            </Button>
          </div>

          <Button onClick={() => void saveTags()} disabled={savingKey === "inventory_tags"}>
            {savingKey === "inventory_tags" ? "Saving..." : "Save Tags"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-[#8B6F74]">
          <p>App: Glam Orbit Lite</p>
          <p>Version: 1.0</p>
          <p>Stack: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Prisma, Supabase</p>
        </CardContent>
      </Card>
    </div>
  )
}
