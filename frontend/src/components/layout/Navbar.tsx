"use client"

import { MessageCircle } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { usePathname, useSearchParams } from "next/navigation"
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { isActive } from "@/lib/navigation"
import { useConversations, useConversationRealtime } from "@/hooks/useConversations"
import NavbarSearch from "@/components/layout/NavbarSearch"
import { ThemeToggle } from "@/components/layout/ThemeToggle"


export default function Navbar() {
    const { user, logout } = useAuth()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    useConversationRealtime(user?.id)
    const { data: conversations } = useConversations()

    // Récupérer l'ID de la conversation actuellement ouverte
    const currentConversationId = pathname === "/message" || pathname.startsWith("/message/")
        ? searchParams.get("c") || pathname.split("/message/")[1]
        : null

    const hasUnread = conversations?.some(
        (c) =>
            c.lastMessage &&
            !c.lastMessage.read &&
            c.lastMessage.sender?.id !== user?.id &&
            c.id !== currentConversationId // Ne pas compter la conversation actuellement ouverte
    )

    const navLinks = [
        { label: "Accueil", href: "/home" },
        { label: "Groupes", href: "/group" },
        { label: "Messagerie", href: "/message", icon: MessageCircle, iconOnly: true },
    ]

    return (
        <nav className="navbar-themed sticky top-0 z-50 w-full border-b px-6 py-4 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center gap-4 md:gap-6">
                <Link href="/home" className="text-xl font-bold text-foreground">
                    World of Code
                </Link>

                <NavbarSearch className="flex" />

                <div className="ml-auto flex items-center gap-4 sm:gap-6">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "relative text-sm font-medium transition hover:text-primary",
                                isActive(link.href, pathname)
                                    ? "text-primary underline underline-offset-4"
                                    : "text-muted-foreground"
                            )}
                        >
                            {link.icon && (
                                <div className="relative">
                                    <link.icon className="h-5 w-5" />
                                    {link.href === "/message" && hasUnread && (
                                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
                                    )}
                                </div>
                            )}
                            {!link.iconOnly && link.label}
                        </Link>
                    ))}

                    <ThemeToggle />

                    {user && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Avatar className="cursor-pointer">
                                    <AvatarFallback>
                                        {user.username.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href="/profile" className="cursor-pointer font-medium">
                                        {user.username}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={logout}>
                                    Déconnexion
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
        </nav>
    )
}
