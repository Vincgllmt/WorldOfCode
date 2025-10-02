import { Layers, FileText, Users } from "lucide-react"

export const ADMIN_NAV_ITEMS = [
  { href: "/utilisateurs",  label: "Utilisateurs", icon: Users },
  { href: "/posts",  label: "Posts",       icon: FileText },
  { href: "/groups", label: "Groupes",     icon: Layers },
] as const
