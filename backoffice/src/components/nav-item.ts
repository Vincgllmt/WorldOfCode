import { Layers, FileText, Users, Flag, Lightbulb } from "lucide-react"

export const ADMIN_NAV_ITEMS = [
  { href: "/utilisateurs",      label: "Utilisateurs",  icon: Users },
  { href: "/posts",             label: "Posts",          icon: FileText },
  { href: "/groups",            label: "Groupes",        icon: Layers },
  { href: "/reports",           label: "Reports",        icon: Flag },
  { href: "/group-suggestions", label: "Suggestions",    icon: Lightbulb },
] as const
