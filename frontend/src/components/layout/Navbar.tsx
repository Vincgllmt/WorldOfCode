"use client"

import { useRef, useEffect, useCallback, useMemo } from "react"
import { MessageCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
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
import { useTheme } from "next-themes"
import { motion } from "framer-motion"


export default function Navbar() {
    const { user, logout } = useAuth()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { resolvedTheme } = useTheme()

    const isDark = resolvedTheme === "dark" || resolvedTheme === "cyberpunk-dark"
    const logoSrc = useMemo(() => isDark ? "/logo_white.png" : "/logo2.png", [isDark])
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

    const navRef = useRef<HTMLElement>(null)

    const updateNavbarHeight = useCallback(() => {
        if (navRef.current) {
            document.documentElement.style.setProperty(
                '--navbar-height',
                `${navRef.current.offsetHeight}px`
            )
        }
    }, [])

    useEffect(() => {
        updateNavbarHeight()
        window.addEventListener('resize', updateNavbarHeight)
        return () => window.removeEventListener('resize', updateNavbarHeight)
    }, [updateNavbarHeight])

    const navLinks = [
        { label: "Accueil", href: "/home" },
        { label: "Groupes", href: "/group" },
        { label: "Messagerie", href: "/message", icon: MessageCircle, iconOnly: true },
    ]

    return (
        <nav ref={navRef} className="navbar-themed sticky top-0 z-50 w-full border-b px-6 py-4 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center gap-4 md:gap-6">
                <Link href="/home">
                    <Image
                        src={logoSrc}
                        alt="World of Code"
                        width={140}
                        height={44}
                        className="h-9 w-auto"
                        priority
                    />
                </Link>

                <NavbarSearch className="flex" />

                <div className="ml-auto flex items-center gap-4 sm:gap-6">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "relative text-sm font-medium transition hover:text-primary pb-1",
                                isActive(link.href, pathname)
                                    ? "text-primary"
                                    : "text-muted-foreground"
                            )}
                        >
                            {link.icon && (
                                <div className="relative">
                                    <link.icon className="h-5 w-5" />
                                    {link.href === "/message" && hasUnread && (
                                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-ping" />
                                    )}
                                    {link.href === "/message" && hasUnread && (
                                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
                                    )}
                                </div>
                            )}
                            {!link.iconOnly && link.label}
                            {isActive(link.href, pathname) && (
                                <motion.span
                                    layoutId="navbar-underline"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                            )}
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
