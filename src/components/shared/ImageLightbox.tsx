"use client"
/* eslint-disable @next/next/no-img-element */

import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type ImageLightboxProps = {
  images: string[]
  productName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  initialIndex?: number
}

export default function ImageLightbox({
  images,
  productName,
  open,
  onOpenChange,
  initialIndex = 0,
}: ImageLightboxProps) {
  const safeImages = useMemo(() => (Array.isArray(images) ? images.slice(0, 3) : []), [images])
  const [index, setIndex] = useState(0)
  const [failedIndices, setFailedIndices] = useState<number[]>([])

  useEffect(() => {
    if (!open) return
    const clamped = safeImages.length === 0 ? 0 : Math.min(Math.max(initialIndex, 0), safeImages.length - 1)
    setIndex(clamped)
    setFailedIndices([])
  }, [open, initialIndex, safeImages.length])

  useEffect(() => {
    if (safeImages.length === 0) return
    if (index > safeImages.length - 1) {
      setIndex(safeImages.length - 1)
    }
  }, [index, safeImages.length])

  const hasImages = safeImages.length > 0
  const activeImage = hasImages ? safeImages[index] : ""
  const activeFailed = failedIndices.includes(index)

  const goPrev = () => {
    if (safeImages.length <= 1) return
    setIndex((prev) => (prev - 1 + safeImages.length) % safeImages.length)
  }

  const goNext = () => {
    if (safeImages.length <= 1) return
    setIndex((prev) => (prev + 1) % safeImages.length)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{productName || "Product Images"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            {hasImages ? (
              <>
                {activeFailed ? (
                  <div className="flex h-[400px] items-center justify-center rounded-lg border border-[#EDE0E2] bg-[#F7F3F4] text-sm text-[#A08488]">
                    No image
                  </div>
                ) : (
                  <img
                    src={activeImage}
                    alt={`${productName || "Product"} image ${index + 1}`}
                    className="h-[400px] w-full rounded-lg border border-[#EDE0E2] bg-[#F7F3F4] object-contain"
                    onError={() =>
                      setFailedIndices((prev) =>
                        prev.includes(index) ? prev : [...prev, index]
                      )
                    }
                  />
                )}

                {safeImages.length > 1 ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                      onClick={goPrev}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={goNext}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                ) : null}
              </>
            ) : (
              <div className="flex h-[400px] flex-col items-center justify-center gap-2 rounded-lg border border-[#EDE0E2] bg-[#F7F3F4] text-[#A08488]">
                <ImageIcon className="h-10 w-10" />
                <p className="text-sm">No images</p>
              </div>
            )}
          </div>

          {safeImages.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {safeImages.map((url, thumbIndex) => (
                <button
                  key={`${url}-${thumbIndex}`}
                  type="button"
                  onClick={() => setIndex(thumbIndex)}
                  className={cn(
                    "h-[72px] w-[72px] overflow-hidden rounded-md border-2 border-transparent",
                    thumbIndex === index ? "border-[#C4878E]" : ""
                  )}
                >
                  <img
                    src={url}
                    alt={`${productName || "Product"} thumbnail ${thumbIndex + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}

          {hasImages ? (
            <p className="text-sm text-[#A08488]">
              {index + 1} / {safeImages.length}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
