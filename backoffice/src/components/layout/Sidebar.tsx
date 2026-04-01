"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ADMIN_NAV_ITEMS } from "../nav-item"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import clsx from "clsx"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { LogOut, UserCircle } from "lucide-react"
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
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === "dark" || resolvedTheme === "cyberpunk-dark"
  const logoSrc = mounted ? (isDark ? "/logo_white.png" : "/logo2.png") : "/logo2.png"

  return (
    <Sidebar collapsible="icon">
      {/* "collapsible='icon'" => réduit à une rail d’icônes */}
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between px-2 py-2">
          <div className={clsx("flex items-center", state === "collapsed" && "hidden")}>
            {mounted ? (
              <Image
                src={logoSrc}
                alt="World of Code"
                width={140}
                height={44}
                className="h-9 w-auto max-w-[140px]"
                priority
              />
            ) : (
              <div className="h-9 w-[140px]" />
            )}
          </div>
          <SidebarTrigger
            className="ml-auto"
            onClick={toggleSidebar}
            aria-label={state === "collapsed" ? "Déployer la sidebar" : "Réduire la sidebar"}
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={clsx(state === "collapsed" && "sr-only")}>
            Navigation
          </SidebarGroupLabel>
          <SidebarMenu>
            {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname?.startsWith(href)
              return (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={active}>
                    <Link href={href} className="gap-2 flex items-center w-full">
                      <div className="relative">
                        <Icon className="h-5 w-5 shrink-0" />
                        {href === "/reports" && pendingCount > 0 && state === "collapsed" && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
                        )}
                      </div>
                      <span className={clsx("truncate flex-1", state === "collapsed" && "hidden")}>
                        {label}
                      </span>
                      {href === "/reports" && pendingCount > 0 && (
                        <span className={clsx(
                          "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground",
                          state === "collapsed" && "hidden"
                        )}>
                          {pendingCount > 99 ? "99+" : pendingCount}
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

      <SidebarFooter className="border-t">
        {/* Identité admin */}
        <div className={clsx(
          "flex items-center gap-2 px-2 py-2",
          state === "collapsed" && "justify-center"
        )}>
          <UserCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className={clsx(
            "truncate text-sm font-medium",
            state === "collapsed" && "hidden"
          )}>
            {user?.username}
          </span>
        </div>

        {/* Sélecteur de thème */}
        <div className={clsx(
          "flex items-center px-2 py-1",
          state === "collapsed" ? "justify-center" : "justify-start"
        )}>
          <ThemeToggle />
          <span className={clsx("text-sm ml-2", state === "collapsed" && "hidden")}>
            Thème
          </span>
        </div>

        {/* Bouton Déconnexion */}
        <Button
          variant="ghost"
          className={clsx("w-full justify-start gap-2", state === "collapsed" && "justify-center")}
          onClick={logout}
        >
          <LogOut className="h-5 w-5" />
          <span className={clsx(state === "collapsed" && "hidden")}>Déconnexion</span>
        </Button>
      </SidebarFooter>

      {/* Rail clickable (affichée en mode collapsed) */}
      <SidebarRail />
    </Sidebar>
  )
}

/**
 * Wrapper pour le contenu principal quand la sidebar shadcn est utilisée.
 * Il applique automatiquement les bons paddings/marges selon l’état (expand/collapse).
 */
export function AdminSidebarInset({ children }: { children: React.ReactNode }) {
  return <SidebarInset className="min-h-screen p-6">{children}</SidebarInset>
}
