import { LayoutDashboard, Layers, FileText, Users, Flag } from "lucide-react"

export const ADMIN_NAV_ITEMS = [
  { href: "/",             label: "Dashboard",    icon: LayoutDashboard },
  { href: "/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/posts",        label: "Posts",        icon: FileText },
  { href: "/groups",       label: "Groupes",      icon: Layers },
  { href: "/reports",      label: "Reports",      icon: Flag },
] as const
