"use client"
/* eslint-disable @next/next/no-img-element */

import { ImageIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type ImageLightboxProps = {
  imageUrl: string | null | undefined
  productName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ImageLightbox({
  imageUrl,
  productName,
  open,
  onOpenChange,
}: ImageLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-2">
        <DialogHeader>
          <DialogTitle>{productName || "Product Image"}</DialogTitle>
        </DialogHeader>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={productName || "Product"}
            className="w-full max-h-[80vh] object-contain rounded-lg"
          />
        ) : (
          <div className="flex h-[280px] flex-col items-center justify-center gap-2 rounded-lg border border-[#EDE0E2] bg-[#F7F3F4] text-[#A08488]">
            <ImageIcon className="h-10 w-10" />
            <p className="text-sm">No image</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
