"use client"

import { signOut } from "next-auth/react"
import { Menu, LogOut, User, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

interface TopNavProps {
  userName?: string | null
  userRole?: string
  onMenuClick: () => void
}

function roleLabel(role?: string): string {
  switch (role) {
    case "ADMIN":
      return "Amministratore"
    case "OPERATORE":
      return "Operatore"
    case "VIEWER":
      return "Visualizzatore"
    default:
      return role ?? ""
  }
}

export function TopNav({ userName, userRole, onMenuClick }: TopNavProps) {
  return (
    <header className="h-16 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="p-2 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] lg:hidden"
        aria-label="Apri menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Spacer on desktop */}
      <div className="hidden lg:block" />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 h-10 px-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-sm font-medium text-[var(--foreground)] max-w-[150px] truncate">
                {userName ?? "Utente"}
              </span>
              {userRole && (
                <span className="text-xs text-[var(--muted-foreground)]">
                  {roleLabel(userRole)}
                </span>
              )}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-medium truncate">{userName ?? "Utente"}</span>
              {userRole && (
                <span className="text-xs text-[var(--muted-foreground)] font-normal">
                  {roleLabel(userRole)}
                </span>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-[var(--destructive)] focus:text-[var(--destructive)]"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Esci
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
