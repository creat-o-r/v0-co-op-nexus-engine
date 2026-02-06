"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Package, Truck, Hammer, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/products", label: "Products", icon: Package },
  { href: "/build", label: "Build", icon: Hammer },
  { href: "/logistics", label: "Routes", icon: Truck },
  { href: "/community", label: "Hub", icon: Users },
]

export function BottomNav() {
  const pathname = usePathname()

  // Hide on auth and landing pages
  if (!pathname || pathname === "/" || pathname.startsWith("/auth")) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="mx-auto flex h-14 max-w-lg items-stretch justify-around px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className={cn("font-medium", isActive && "font-semibold")}>{item.label}</span>
            </Link>
          )
        })}
      </div>
      {/* Safe area padding for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
