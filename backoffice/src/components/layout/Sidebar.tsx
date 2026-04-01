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
import { LogOut } from "lucide-react"
import { ThemeToggle } from "@/components/layout/ThemeToggle"

export function AdminSidebar() {
  const pathname = usePathname()
  const { state, toggleSidebar } = useSidebar()
  const { logout } = useAdminAuth()

  return (
    <Sidebar collapsible="icon">
      {/* "collapsible='icon'" => réduit à une rail d’icônes */}
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between px-2 py-2">
          <span className={clsx("font-bold text-lg", state === "collapsed" && "hidden")}>
            Backoffice
          </span>
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
                    <Link href={href} className="gap-2">
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className={clsx("truncate", state === "collapsed" && "hidden")}>
                        {label}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className={clsx(
          "flex items-center px-2 py-1",
          state === "collapsed" ? "justify-center" : "justify-start"
        )}>
          <ThemeToggle />
          <span className={clsx("text-sm ml-2", state === "collapsed" && "hidden")}>
            Thème
          </span>
        </div>
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
