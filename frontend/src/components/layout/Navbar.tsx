"use client"

import { MessageCircle } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { usePathname } from "next/navigation"
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


export default function Navbar() {
    const { user, logout } = useAuth()
    const pathname = usePathname()
    useConversationRealtime(user?.id)
    const { data: conversations } = useConversations()


    const hasUnread = conversations?.some(
        (c) =>
            c.lastMessage &&
            !c.lastMessage.read &&
            c.lastMessage.sender?.id !== user?.id
    )

    const navLinks = [
        { label: "Accueil", href: "/" },
        { label: "Groupes", href: "/group" },
        { label: "Messagerie", href: "/message", icon: MessageCircle, iconOnly: true },
    ]

    return (
        <nav className="w-full bg-green-50 border-b shadow-sm px-6 py-4 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="text-xl font-bold text-black">
                World of Code
            </Link>

            {/* Menu */}
            <div className="flex items-center gap-6">
                {navLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                            "relative text-sm font-medium hover:text-primary transition",
                            isActive(link.href, pathname)
                                ? "text-primary underline underline-offset-4"
                                : "text-muted-foreground"
                        )}
                    >
                        {link.icon && (
                            <div className="relative">
                                <link.icon className="h-5 w-5" />
                                {/* Pastille si messages non lus */}
                                {link.href === "/message" && hasUnread && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                                )}
                            </div>
                        )}
                        {!link.iconOnly && link.label}
                    </Link>
                ))}

                {/* Avatar utilisateur */}
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
                                <Link href="/profile" className="font-medium cursor-pointer">
                                    {user.username}
                                    <MessageCircle className="h-5 w-5 ml-2" />
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={logout}>Déconnexion</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </nav>
    )
}
