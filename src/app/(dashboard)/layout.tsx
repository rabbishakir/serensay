"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

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
      <aside className="fixed inset-y-0 left-0 w-[220px] bg-[hsl(var(--brand))] text-white">
        <div className="flex h-full flex-col">
          <div className="px-5 py-6 text-base font-bold tracking-wide">GLAM ORBIT LITE</div>
          <nav className="flex-1 space-y-1 px-3">
            {navItems.map((item) => {
              const active = isActive(item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "block rounded-r-md border-l-2 px-3 py-2 text-sm transition-colors",
                    active
                      ? "border-white bg-white/10 text-white"
                      : "border-transparent text-white/85 hover:bg-white/5 hover:text-white",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="p-4">
            <Link
              href="/orders?new=true"
              className="block rounded-md bg-[hsl(var(--accent))] px-4 py-2 text-center text-sm font-semibold text-black hover:opacity-90"
            >
              + New Order
            </Link>
          </div>
        </div>
      </aside>
      <main className="ml-[220px] min-h-screen overflow-y-auto bg-white p-6">{children}</main>
    </div>
  )
}
