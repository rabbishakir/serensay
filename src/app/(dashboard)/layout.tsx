"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import GlobalSearch from "@/components/shared/GlobalSearch"

type NavItem = {
  label: string
  href: string
  matchPrefix?: boolean
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "Buyers", href: "/buyers", matchPrefix: true },
  { label: "Orders", href: "/orders", matchPrefix: true },
  { label: "BD Inventory", href: "/inventory/bd", matchPrefix: true },
  { label: "USA Inventory", href: "/inventory/usa", matchPrefix: true },
  { label: "Shipments", href: "/shipments", matchPrefix: true },
  { label: "Calculator", href: "/calculator", matchPrefix: true },
  { label: "Reports", href: "/reports", matchPrefix: true },
  { label: "Settings", href: "/settings", matchPrefix: true },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  const isActive = (item: NavItem) => {
    if (item.href === "/") return pathname === "/"
    return item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 w-[220px] border-r border-[#E8C8CC] bg-[#F7F3F4] text-[#1E1215]">
        <div className="flex h-full flex-col">
          <div>
            <div className="mx-4 mt-4 rounded-xl border border-[#EDE0E2] bg-[#f0f0f0] p-3">
              <Image
                src="/logo.png"
                alt="Serene Say logo"
                width={140}
                height={80}
                className="mx-auto w-full max-w-[140px]"
              />
            </div>
            <p className="mt-3 text-center text-sm font-bold tracking-[0.2em] text-[#1E1215]">
              SERENE SAY
            </p>
            <p className="mt-1 text-center text-xs uppercase tracking-[0.25em] text-[#C4878E]">
              BEAUTY PRODUCTS
            </p>
            <div className="mx-4 mb-2 mt-4 border-b border-[#E8C8CC]" />
          </div>
          <nav className="flex-1 space-y-1 px-3">
            {navItems.map((item) => {
              const active = isActive(item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "block rounded-lg border-l-2 px-3 py-2 text-sm transition-colors",
                    active
                      ? "border-[#C4878E] bg-[#FCEEF0] font-semibold text-[#C4878E]"
                      : "border-transparent text-[#8B6F74] hover:bg-[#FCEEF0] hover:text-[#1E1215]",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <GlobalSearch />
          <div className="p-4">
            <Link
              href="/orders?new=true"
              className="block w-full rounded-lg bg-[#C4878E] px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-[#A86870]"
            >
              + New Order
            </Link>
          </div>
        </div>
      </aside>
      <main className="ml-[220px] min-h-screen overflow-y-auto bg-[#FAFAFA] p-6">{children}</main>
    </div>
  )
}
