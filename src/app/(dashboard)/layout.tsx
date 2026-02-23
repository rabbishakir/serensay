"use client"

import Link from "next/link"
import Image from "next/image"
import { LogOut, Menu, Plus, X } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import GlobalSearch from "@/components/shared/GlobalSearch"
import { Button } from "@/components/ui/button"

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

type CurrentUser = {
  username: string
  role: "admin" | "moderator"
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 1023px)").matches
    if (sidebarOpen && isMobile) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [sidebarOpen])

  useEffect(() => {
    let cancelled = false

    const loadUser = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" })
        if (!response.ok) {
          if (!cancelled) router.push("/login")
          return
        }

        const data = (await response.json()) as {
          username: string
          role: "admin" | "moderator"
        }

        if (!cancelled) {
          setUser({ username: data.username, role: data.role })
        }
      } catch {
        if (!cancelled) router.push("/login")
      }
    }

    void loadUser()
    return () => {
      cancelled = true
    }
  }, [router])

  const visibleNavItems = useMemo(
    () => navItems.filter((item) => item.label !== "Reports" || user?.role === "admin"),
    [user]
  )

  const onLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  const isActive = (item: NavItem) => {
    if (item.href === "/") return pathname === "/"
    return item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={[
          "flex flex-col h-full bg-[#F7F3F4]",
          "border-r border-[#E8C8CC]",
          "transition-transform duration-300 ease-in-out",
          "z-40 w-[220px] flex-shrink-0",
          "fixed lg:relative top-0 left-0",
          sidebarOpen
            ? "translate-x-0 shadow-[4px_0_24px_rgba(0,0,0,0.08)] lg:shadow-none"
            : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="lg:hidden flex justify-end p-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg hover:bg-[#FCEEF0] transition-colors text-[#A08488] hover:text-[#1E1215]"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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
            <p className="mt-1 text-center text-xs uppercase tracking-[0.25em] text-[#BA4E5A]">
              BEAUTY PRODUCTS
            </p>
            <div className="mx-4 mb-2 mt-4 border-b border-[#E8C8CC]" />
          </div>
          <nav className="flex-1 space-y-1 px-3">
            {visibleNavItems.map((item) => {
              const active = isActive(item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "block rounded-lg border-l-2 px-3 py-2 text-sm transition-colors",
                    active
                      ? "border-[#C4878E] bg-[#FCEEF0] font-semibold text-[#BA4E5A]"
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
              className="block w-full rounded-lg bg-[#973559e6] px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-[#A86870]"
            >
              + New Order
            </Link>
          </div>
          <div className="px-4 pb-4">
            {user ? (
              <div className="mb-3 rounded-lg border border-[#EDE0E2] bg-white p-3">
                <p className="text-xs font-bold text-[#1E1215]">{user.username}</p>
                <span
                  className={[
                    "mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-medium",
                    user.role === "admin"
                      ? "bg-[#FCEEF0] text-[#C4878E]"
                      : "bg-[#F7F3F4] text-[#A08488]",
                  ].join(" ")}
                >
                  {user.role === "admin" ? "Admin" : "Moderator"}
                </span>
              </div>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              onClick={onLogout}
              className="w-full justify-start text-sm text-[#A08488] hover:bg-[#FCEEF0] hover:text-[#1E1215]"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      <div
        className={[
          "flex flex-col flex-1 overflow-hidden",
          "transition-all duration-300 ease-in-out",
          sidebarOpen ? "lg:ml-0" : "",
        ].join(" ")}
      >
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#EDE0E2] sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="p-2 rounded-lg hover:bg-[#FCEEF0] transition-colors text-[#1E1215]"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Serene Say"
              width={28}
              height={28}
              className="w-7 h-7 object-contain"
            />
            <span className="font-bold text-sm text-[#1E1215] tracking-wider">SERENE SAY</span>
          </div>

          <button
            type="button"
            onClick={() => router.push("/orders?new=true")}
            className="p-2 rounded-lg bg-[#C4878E] text-white hover:bg-[#A86870] transition-colors"
            aria-label="New order"
          >
            <Plus className="w-5 h-5" />
          </button>
        </header>

        <main
          className={[
            "flex-1 overflow-auto",
            "transition-all duration-300 ease-in-out",
            "p-4 lg:p-6 bg-[#FAFAFA]",
            sidebarOpen ? "ml-[220px] lg:ml-0" : "ml-0",
          ].join(" ")}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
