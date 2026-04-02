"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ADMIN_NAV_ITEMS } from "../nav-item"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import clsx from "clsx"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { LogOut } from "lucide-react"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import Image from "next/image"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { useAdminStats } from "@/hooks/useAdminStats"

export function AdminSidebar() {
  const pathname = usePathname()
  const { state, toggleSidebar } = useSidebar()
  const { user, logout } = useAdminAuth()
  const { stats } = useAdminStats()
  const pendingCount = stats?.pendingReportsCount ?? 0
  const pendingGroupSuggestionsCount = stats?.pendingGroupSuggestionsCount ?? 0
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === "dark" || resolvedTheme === "cyberpunk-dark"
  const logoSrc = mounted ? (isDark ? "/logo_white.png" : "/logo2.png") : "/logo2.png"

  const isCollapsed = state === "collapsed"

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-between px-2 py-3">
          <div className={clsx("flex items-center", isCollapsed && "hidden")}>
            {mounted ? (
              <Image
                src={logoSrc}
                alt="World of Code"
                width={140}
                height={44}
                className="h-8 w-auto max-w-[140px]"
                priority
              />
            ) : (
              <div className="h-8 w-[140px]" />
            )}
          </div>
          <SidebarTrigger
            className={clsx("shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground", isCollapsed && "mx-auto")}
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Déployer la sidebar" : "Réduire la sidebar"}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarMenu className="gap-0.5">
            {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname?.startsWith(href)
              return (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={active} className="h-9 gap-3 px-3 text-sm font-medium">
                    <Link href={href}>
                      <div className="relative shrink-0">
                        <Icon className="h-4 w-4" />
                        {href === "/reports" && pendingCount > 0 && isCollapsed && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
                        )}
                        {href === "/groups" && pendingGroupSuggestionsCount > 0 && isCollapsed && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
                        )}
                      </div>
                      <span className={clsx("truncate flex-1", isCollapsed && "hidden")}>
                        {label}
                      </span>
                      {href === "/reports" && pendingCount > 0 && !isCollapsed && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive/15 px-1.5 text-[10px] font-bold text-destructive">
                          {pendingCount > 99 ? "99+" : pendingCount}
                        </span>
                      )}
                      {href === "/groups" && pendingGroupSuggestionsCount > 0 && !isCollapsed && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive/15 px-1.5 text-[10px] font-bold text-destructive">
                          {pendingGroupSuggestionsCount > 99 ? "99+" : pendingGroupSuggestionsCount}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="py-2">
        {/* Identité admin */}
        <div className={clsx(
          "flex items-center gap-2.5 px-3 py-2",
          isCollapsed && "justify-center"
        )}>
          <div className="h-7 w-7 shrink-0 rounded-full bg-primary/15 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">
              {user?.username?.[0]?.toUpperCase() ?? "A"}
            </span>
          </div>
          <div className={clsx("flex flex-col min-w-0", isCollapsed && "hidden")}>
            <span className="truncate text-xs font-semibold leading-none">{user?.username}</span>
            <span className="text-[10px] text-sidebar-foreground/50 mt-0.5">Administrateur</span>
          </div>
        </div>

        {/* Actions */}
        <div className={clsx(
          "flex items-center px-2 gap-1",
          isCollapsed ? "flex-col" : "flex-row"
        )}>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {!isCollapsed && (
              <span className="text-xs text-sidebar-foreground/60">Thème</span>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className={clsx(
              "text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors",
              isCollapsed ? "w-9 h-9 p-0 justify-center" : "flex-1 justify-start gap-2 h-8 text-xs"
            )}
            onClick={logout}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            {!isCollapsed && <span>Déconnexion</span>}
          </Button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

export function AdminSidebarInset({ children }: { children: React.ReactNode }) {
  return <SidebarInset className="min-h-screen">{children}</SidebarInset>
}
