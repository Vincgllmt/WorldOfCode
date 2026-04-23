"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ADMIN_NAV_ITEMS } from "../nav-item"
import { Button } from "@/components/ui/button"
import clsx from "clsx"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { LogOut } from "lucide-react"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import Image from "next/image"
import { useTheme } from "next-themes"
import { useState, useEffect, useRef } from "react"
import { useAdminStats } from "@/hooks/useAdminStats"

const COLLAPSED_W = 60  // px
const EXPANDED_W  = 224 // px

export function AdminSidebar() {
  const pathname  = usePathname()
  const { user, logout } = useAdminAuth()
  const { stats } = useAdminStats()
  const pendingCount = stats?.pendingReportsCount ?? 0
  const pendingGroupSuggestionsCount = stats?.pendingGroupSuggestionsCount ?? 0
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === "dark" || resolvedTheme === "cyberpunk-dark"
  const logoSrc = mounted ? (isDark ? "/logo_white.png" : "/logo2.png") : "/logo2.png"

  const handleMouseEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    enterTimer.current = setTimeout(() => setExpanded(true), 250)
  }
  const handleMouseLeave = () => {
    if (enterTimer.current) clearTimeout(enterTimer.current)
    leaveTimer.current = setTimeout(() => setExpanded(false), 350)
  }

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: expanded ? EXPANDED_W : COLLAPSED_W,
        minWidth: expanded ? EXPANDED_W : COLLAPSED_W,
        transition: "width 220ms cubic-bezier(0.4,0,0.2,1), min-width 220ms cubic-bezier(0.4,0,0.2,1)",
        position: "sticky",
        top: 0,
        height: "100vh",
      }}
      className="relative z-30 flex flex-col shrink-0 bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] overflow-hidden"
    >
      {/* Header — Logo */}
      <div className="flex items-center h-14 px-3 border-b border-[var(--sidebar-border)] shrink-0 overflow-hidden">
        <div
          className="h-6 flex items-center"
          style={{
            opacity: expanded ? 1 : 0,
            transform: expanded ? "translateX(0)" : "translateX(-8px)",
            transition: "opacity 180ms ease, transform 180ms ease",
            transitionDelay: expanded ? "60ms" : "0ms",
            whiteSpace: "nowrap",
          }}
        >
          {mounted && (
            <Image
              src={logoSrc}
              alt="World of Code"
              width={120}
              height={40}
              className="h-6 w-auto"
              priority
            />
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
        <ul className="flex flex-col gap-0.5 px-2">
          {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname?.startsWith(href)
            const hasBadge =
              (href === "/reports" && pendingCount > 0) ||
              (href === "/groups" && pendingGroupSuggestionsCount > 0)
            const badgeCount = href === "/reports" ? pendingCount : pendingGroupSuggestionsCount

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={clsx(
                    "relative flex items-center h-9 rounded-md text-sm font-medium transition-colors duration-150 overflow-hidden",
                    "px-0",
                    active
                      ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-primary)]"
                      : "text-[var(--sidebar-foreground)]/70 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-foreground)]"
                  )}
                >
                  {/* Active left bar */}
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[var(--sidebar-primary)]" />
                  )}

                  {/* Icon — always centered in collapsed zone */}
                  <span
                    className="relative shrink-0 flex items-center justify-center"
                    style={{ width: COLLAPSED_W - 16, minWidth: COLLAPSED_W - 16 }}
                  >
                    <Icon className="h-4 w-4" />
                    {/* Dot badge (collapsed only) */}
                    {hasBadge && !expanded && (
                      <span className="absolute top-0 right-1 h-1.5 w-1.5 rounded-full bg-destructive" />
                    )}
                  </span>

                  {/* Label + count badge */}
                  <span
                    className="flex items-center gap-2 flex-1 min-w-0 pr-3"
                    style={{
                      opacity: expanded ? 1 : 0,
                      transform: expanded ? "translateX(0)" : "translateX(-6px)",
                      transition: "opacity 160ms ease, transform 160ms ease",
                      transitionDelay: expanded ? "80ms" : "0ms",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span className="truncate">{label}</span>
                    {hasBadge && (
                      <span className="ml-auto shrink-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive/15 px-1 text-[9px] font-bold text-destructive">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Separator */}
      <div className="h-px bg-[var(--sidebar-border)] mx-2" />

      {/* Footer */}
      <div className="shrink-0 py-2 px-2 flex flex-col gap-1 overflow-hidden">
        {/* User identity */}
        <div className="flex items-center h-9 overflow-hidden">
          <span
            className="shrink-0 flex items-center justify-center"
            style={{ width: COLLAPSED_W - 16, minWidth: COLLAPSED_W - 16 }}
          >
            <span className="h-6 w-6 rounded-full bg-[var(--sidebar-primary)]/15 flex items-center justify-center text-[10px] font-semibold text-[var(--sidebar-primary)]">
              {user?.username?.[0]?.toUpperCase() ?? "A"}
            </span>
          </span>
          <span
            className="flex flex-col min-w-0"
            style={{
              opacity: expanded ? 1 : 0,
              transform: expanded ? "translateX(0)" : "translateX(-6px)",
              transition: "opacity 160ms ease, transform 160ms ease",
              transitionDelay: expanded ? "80ms" : "0ms",
              whiteSpace: "nowrap",
            }}
          >
            <span className="truncate text-xs font-semibold text-[var(--sidebar-foreground)] leading-none">
              {user?.username}
            </span>
            <span className="text-[10px] text-[var(--sidebar-foreground)]/50 mt-0.5">
              Administrateur
            </span>
          </span>
        </div>

        {/* Actions row */}
        <div className="flex items-center h-9 overflow-hidden">
          <span
            className="shrink-0 flex items-center justify-center"
            style={{ width: COLLAPSED_W - 16, minWidth: COLLAPSED_W - 16 }}
          >
            <ThemeToggle />
          </span>
          <span
            style={{
              opacity: expanded ? 1 : 0,
              transform: expanded ? "translateX(0)" : "translateX(-6px)",
              transition: "opacity 160ms ease, transform 160ms ease",
              transitionDelay: expanded ? "80ms" : "0ms",
              whiteSpace: "nowrap",
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-[var(--sidebar-foreground)]/60 hover:text-destructive hover:bg-destructive/10"
              onClick={logout}
            >
              <LogOut className="h-3 w-3" />
              Déconnexion
            </Button>
          </span>
        </div>
      </div>
    </aside>
  )
}

export function AdminSidebarInset({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 min-w-0 min-h-screen">{children}</div>
}
