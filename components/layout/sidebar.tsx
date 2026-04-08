"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Fuel,
  Users,
  Settings,
  ChevronDown,
  ChevronRight,
  Map,
  List,
  Building2,
  UserCog,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavSubItem {
  label: string
  href: string
  icon?: React.ReactNode
}

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  subItems?: NavSubItem[]
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: <Home className="w-4 h-4" />,
  },
  {
    label: "Impianti",
    icon: <Fuel className="w-4 h-4" />,
    subItems: [
      { label: "Lista", href: "/impianti", icon: <List className="w-4 h-4" /> },
      { label: "Mappa", href: "/impianti/mappa", icon: <Map className="w-4 h-4" /> },
    ],
  },
  {
    label: "Clienti",
    href: "/clienti",
    icon: <Users className="w-4 h-4" />,
  },
  {
    label: "Impostazioni",
    icon: <Settings className="w-4 h-4" />,
    subItems: [
      { label: "Compagnie Petrolifere", href: "/impostazioni/compagnie", icon: <Building2 className="w-4 h-4" /> },
      { label: "Utenti", href: "/impostazioni/utenti", icon: <UserCog className="w-4 h-4" />, },
    ],
  },
]

interface SidebarProps {
  userRole?: string
  onClose?: () => void
}

function NavItemComponent({
  item,
  userRole,
}: {
  item: NavItem
  userRole?: string
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(() => {
    if (item.subItems) {
      return item.subItems.some((sub) => pathname.startsWith(sub.href))
    }
    return false
  })

  if (item.adminOnly && userRole !== "ADMIN") return null

  if (item.subItems) {
    const isActive = item.subItems.some((sub) => pathname.startsWith(sub.href))

    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            isActive
              ? "text-[var(--primary)] bg-[var(--primary)]/10"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]"
          )}
        >
          {item.icon}
          <span className="flex-1 text-left">{item.label}</span>
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          )}
        </button>

        {open && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-[var(--border)] pl-3">
            {item.subItems.map((sub) => {
              if ((sub as NavSubItem & { adminOnly?: boolean }).adminOnly && userRole !== "ADMIN") {
                return null
              }
              const isSubActive = pathname === sub.href || pathname.startsWith(sub.href + "/")
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                    isSubActive
                      ? "text-[var(--primary)] bg-[var(--primary)]/10 font-medium"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]"
                  )}
                >
                  {sub.icon}
                  {sub.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const isActive = item.href
    ? item.href === "/"
      ? pathname === "/"
      : pathname.startsWith(item.href)
    : false

  return (
    <Link
      href={item.href!}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        isActive
          ? "text-[var(--primary)] bg-[var(--primary)]/10"
          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]"
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  )
}

export function Sidebar({ userRole, onClose }: SidebarProps) {
  return (
    <aside className="flex flex-col h-full bg-[var(--card)] border-r border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--primary)]">
            <Fuel className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-[var(--primary)] text-base tracking-tight">
            ImpiantiManager
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavItemComponent
            key={item.label}
            item={item}
            userRole={userRole}
          />
        ))}
      </nav>
    </aside>
  )
}
