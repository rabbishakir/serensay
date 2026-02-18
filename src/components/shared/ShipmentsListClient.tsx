"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type ShipmentCard = {
  id: string
  name: string
  status: "PACKING" | "IN_TRANSIT" | "ARRIVED"
  departureDate: string | null
  _count: { orders: number }
}

function shipmentBadgeClass(status: ShipmentCard["status"]) {
  switch (status) {
    case "PACKING":
      return "bg-[#FEF3C7] text-[#92400E]"
    case "IN_TRANSIT":
      return "bg-[#DBEAFE] text-[#1E40AF]"
    case "ARRIVED":
      return "bg-[#DCFCE7] text-[#166534]"
  }
}

function formatDate(value: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function ShipmentsListClient({ initialShipments }: { initialShipments: ShipmentCard[] }) {
  const [shipments, setShipments] = useState(initialShipments)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [departureDate, setDepartureDate] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [showNameError, setShowNameError] = useState(false)

  const createShipment = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setShowNameError(true)
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          departureDate: departureDate ? new Date(departureDate).toISOString() : undefined,
          notes: notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to create batch.")
        return
      }
      const created: ShipmentCard = {
        ...data,
        _count: { orders: 0 },
      }
      setShipments((prev) => [created, ...prev])
      toast.success("Batch created")
      setOpen(false)
      setName("")
      setDepartureDate("")
      setNotes("")
      setShowNameError(false)
    } catch {
      toast.error("Failed to create batch.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[#1E1215]">Shipments</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>+ New Batch</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Batch</DialogTitle>
              <DialogDescription>Add shipment batch details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Batch name"
                value={name}
                className={showNameError ? "border-red-500" : ""}
                onChange={(e) => {
                  setName(e.target.value)
                  if (e.target.value.trim()) setShowNameError(false)
                }}
              />
              <Input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
              />
              <Textarea
                placeholder="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void createShipment()} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shipments.map((shipment) => (
          <Card key={shipment.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="truncate">{shipment.name}</span>
                <Badge className={shipmentBadgeClass(shipment.status)}>{shipment.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-[#5D4548]">
              <p>Departure: {formatDate(shipment.departureDate)}</p>
              <p>Orders: {shipment._count.orders}</p>
              <Button asChild size="sm" variant="outline">
                <Link href={`/shipments/${shipment.id}`}>View</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
