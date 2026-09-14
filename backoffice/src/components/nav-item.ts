import { LayoutDashboard, Layers, FileText, Users, Flag, MessageSquare, GraduationCap, Gamepad2 } from "lucide-react"

export const ADMIN_NAV_ITEMS = [
  { href: "/",             label: "Dashboard",    icon: LayoutDashboard },
  { href: "/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/mentors",      label: "Mentors",      icon: GraduationCap },
  { href: "/posts",        label: "Posts",        icon: FileText },
  { href: "/groups",       label: "Groupes",      icon: Layers },
  { href: "/reports",      label: "Reports",      icon: Flag },
  { href: "/feedbacks",    label: "Feedbacks",    icon: MessageSquare },
  { href: "/code-arena",   label: "Code Arena",   icon: Gamepad2 },
] as const
