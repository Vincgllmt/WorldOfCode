"use client"

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
import NavbarSearch from "@/components/layout/NavbarSearch"


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
    ]

    return (
        <nav className="w-full border-b bg-green-50 px-6 py-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-4 md:gap-6">
                <Link href="/" className="text-xl font-bold text-black">
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
                                {link.label}
                            </Link>
                        ))}

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
